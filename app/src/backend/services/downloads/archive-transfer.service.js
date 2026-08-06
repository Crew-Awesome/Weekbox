import { appSettings } from "../../core/system/settings.service.js";
import {
  getOsProcessId,
  sameProcessId,
} from "../processes/spawned-process.util.js";
import {
  resolveExternalDownloadUrl,
  getGoogleDriveFileId,
  getRangeSupportedFileSize,
} from "./external-download.resolver.js";
import { formatBytes } from "../../utils/formatters.js";
import {
  getHtmlResponseError,
  looksLikeHtmlResponse,
} from "./download-validation.util.js";

function formatArchiveEntry(output) {
  const lines = String(output || "").trim().split(/[\r\n]+/);
  for (let i = lines.length - 1; i >= 0; i--) {
    let line = lines[i].trim();
    if (!line) continue;
    let name = line
      .replace(/^Extracting\s+archive:.*$/i, "")
      .replace(/^Extracting:\s+/i, "")
      .replace(/^Extracting\s+/i, "")
      .replace(/^inflating:\s+/i, "")
      .replace(/^creating:\s+/i, "")
      .replace(/^x\s+/i, "")
      .replace(/^-+\s*/, "")
      .trim();
    if (
      !name ||
      name.startsWith("Path =") ||
      name.startsWith("Type =") ||
      name.startsWith("Physical Size =") ||
      name.startsWith("Headers Size =") ||
      name.startsWith("7-Zip") ||
      name.startsWith("Everything is Ok") ||
      name.startsWith("Folders:") ||
      name.startsWith("Files:") ||
      name.startsWith("Size:") ||
      name.startsWith("Compressed:")
    ) {
      continue;
    }
    const parts = name.split(/[/\\]/);
    if (parts.length > 2) name = `.../${parts.slice(-2).join("/")}`;
    return name;
  }
  let fallback = lines[lines.length - 1].trim();
  const parts = fallback.split(/[/\\]/);
  if (parts.length > 2) fallback = `.../${parts.slice(-2).join("/")}`;
  return fallback;
}

function createThrottledEntryReporter(onEntry, intervalMs = 120) {
  let lastReportedAt = 0;
  return (output) => {
    if (!onEntry) return;
    const now = performance.now();
    if (now - lastReportedAt < intervalMs) return;
    const entry = formatArchiveEntry(output);
    if (!entry) return;
    lastReportedAt = now;
    onEntry(entry);
  };
}

function listenForProcess(process, getTask, onEvent) {
  return new Promise((resolve, reject) => {
    const handler = (event) => {
      const task = getTask();
      if (task?.cancelled) {
        Neutralino.events.off("spawnedProcess", handler);
        reject(new Error("Cancelled"));
        return;
      }
      if (!sameProcessId(event.detail.id, process.id)) return;
      if (
        event.detail.action === "exit" &&
        sameProcessId(task?.pid, getOsProcessId(process))
      ) {
        task.pid = null;
      }
      onEvent(event.detail, handler, resolve, reject);
    };
    Neutralino.events.on("spawnedProcess", handler).catch(reject);
  });
}

var MIN_SEGMENTED_DOWNLOAD_BYTES = 8 * 1024 * 1024;
var MAX_DOWNLOAD_SEGMENTS = 4;
var archiveFinalizations = new Map();
function quoteCommandArgument(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function getParentPath(path) {
  const normalized = String(path || "").replace(/\\/g, "/");
  return normalized.slice(0, normalized.lastIndexOf("/"));
}

function requireValue(value, name) {
  if (!String(value || "").trim()) {
    throw new Error(
      `WeekBox could not continue: required parameter '${name}' is missing.`,
    );
  }
  return String(value);
}

function spawnProcessWithShell(command) {
  requireValue(command, "command");
  if (window.NL_OS === "Windows") {
    return Neutralino.os.spawnProcess(command);
  }
  const shellCommand = `'${String(command).replaceAll("'", "'\\''")}'`;
  return Neutralino.os.spawnProcess(`sh -c ${shellCommand}`);
}

function appendProcessOutput(output, data) {
  const next = `${output}${String(data || "")}`;
  return next.length > 4e3 ? next.slice(-4e3) : next;
}

function getUsefulProcessOutput(output) {
  return (
    String(output || "")
      .split(/\r?\n|\r/)
      // curl writes its progress meter with carriage returns. On some Windows
      // shells its final error lands on the same line as the last meter frame.
      // Keep the error, but remove that frame before it reaches diagnostics.
      .map((line) => line.trim().replace(/^[#=O\-\s\d.%]+(?=curl:\s*\()/i, ""))
      .filter((line) => line)
      .filter((line) => !/^[#=O\-\s]+$/.test(line))
      .filter((line) => !/^[#=O\-\s]+\d+(?:\.\d+)?%?$/.test(line))
      .filter(
        (line) =>
          !/^(?:%\s*Total|Dload\s+Upload|\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?)/i.test(
            line,
          ),
      )
      .join("\n")
      .trim()
  );
}

function createProcessError(operation, exitCode, output) {
  const detail = getUsefulProcessOutput(output);
  const httpStatus =
    detail.match(/\bHTTP\/\S+\s+(\d{3})\b|\b(\d{3})\b/)?.[1] ||
    detail.match(/\b(\d{3})\b/)?.[1] ||
    null;
  const createDownloadError = (message) => {
    const error = new Error(message);
    error.downloadDiagnostics = {
      curlCode: Number(exitCode),
      httpStatus: httpStatus ? Number(httpStatus) : null,
      stderr: detail,
    };
    return error;
  };
  if (operation === "Download" && Number(exitCode) === 23) {
    return createDownloadError(
      "The download could not be written to storage. The folder may be missing, locked, read-only, or out of space.",
    );
  }
  if (
    operation === "Extraction" &&
    Number(exitCode) === 127 &&
    detail.includes("7z")
  ) {
    return new Error(
      "To install .7z or .rar mods on Linux, you must install the p7zip package (e.g. sudo apt install p7zip-full).",
    );
  }
  if (operation === "Download" && Number(exitCode) === 28) {
    return createDownloadError(
      "GameBanana's download server is unavailable right now. Try again in a few minutes.",
    );
  }
  if (operation === "Download" && Number(exitCode) === 6) {
    return createDownloadError(
      "WeekBox could not find the download server. Check your DNS or connection and try again.",
    );
  }
  if (operation === "Download" && Number(exitCode) === 7) {
    return createDownloadError(
      "WeekBox could not connect to the GameBanana download server. Try again in a few minutes.",
    );
  }
  if (operation === "Download" && Number(exitCode) === 35) {
    return createDownloadError(
      "The connection to the download server was reset. Try again in a few minutes.",
    );
  }
  if (operation === "Download" && Number(exitCode) === 1) {
    return createDownloadError(
      "The download was interrupted before it finished. Try again.",
    );
  }
  if (operation === "Download" && Number(exitCode) === 18) {
    return createDownloadError(
      "The download was incomplete. WeekBox will retry it.",
    );
  }
  if (operation === "Download" && Number(exitCode) === -1) {
    return createDownloadError(
      "The download process ended unexpectedly. WeekBox will retry it.",
    );
  }
  if (operation === "Download" && Number(exitCode) === 56) {
    return createDownloadError(
      "The connection to the download server was interrupted. Try again.",
    );
  }
  if (operation === "Download" && Number(exitCode) === 60) {
    return createDownloadError(
      "The download server certificate could not be trusted. Check the system date, network, VPN, proxy, and antivirus HTTPS inspection settings.",
    );
  }
  if (
    operation === "Download" &&
    Number(exitCode) === 22 &&
    /\b404\b/.test(detail)
  ) {
    return createDownloadError(
      "This download is no longer available (404). The file may have been removed, replaced, or made private.",
    );
  }
  if (operation === "Download" && Number(exitCode) === 52) {
    return createDownloadError(
      "The download server closed the connection without sending a file. WeekBox will retry it.",
    );
  }
  if (
    operation === "Download" &&
    Number(exitCode) === 22 &&
    /\b(?:408|503|504)\b/.test(detail)
  ) {
    return createDownloadError(
      "The download server is temporarily unavailable. WeekBox will retry it.",
    );
  }
  if (operation === "Download" && Number(exitCode) === 22) {
    return createDownloadError(
      `The download server rejected this file${httpStatus ? ` (HTTP ${httpStatus})` : ""}. Choose another download or try again later.`,
    );
  }
  if (operation === "Extraction" && !detail && window.NL_OS === "Linux") {
    return new Error(
      `WeekBox could not extract this archive on Linux (exit code ${exitCode}). Install unzip or p7zip and try again.`,
    );
  }
  return new Error(
    `${operation} failed with exit code ${exitCode}${detail ? `: ${detail}` : ": no native error output was returned"}`,
  );
}

/**
 * @fix 2026-08-05T04:49:46.409Z - Fix download could not be written to storage error
 */
async function ensureDirectoryExists(dir) {
  const normalized = String(dir || "").replace(/\\/g, "/");
  const parts = normalized.split("/");
  let current = normalized.startsWith("//")
    ? "//"
    : normalized.startsWith("/")
      ? "/"
      : "";
  for (const part of parts) {
    if (!part) continue;
    current =
      current === "/" || current === "//"
        ? `${current}${part}`
        : current
          ? `${current}/${part}`
          : part;
    try {
      await Neutralino.filesystem.createDirectory(current);
    } catch {}
  }
}

function isTransientDownloadError(error) {
  const code = error?.downloadDiagnostics?.curlCode;
  const httpStatus = Number(error?.downloadDiagnostics?.httpStatus);
  return (
    [408, 503, 504].includes(httpStatus) ||
    [1, 6, 7, 18, 23, 28, 35, 52, 56, -1].includes(Number(code)) ||
    /(?:exit code|curl:\s*\()\s*(?:-1|1|6|7|18|23|28|35|52|56)\b/i.test(
      String(error?.message || error),
    )
  );
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRetry(ms, getTask) {
  let remaining = ms;
  while (remaining > 0) {
    if (getTask?.()?.cancelled) throw new Error("Cancelled");
    const interval = Math.min(250, remaining);
    await wait(interval);
    remaining -= interval;
  }
}

async function getDownloadContentType(url) {
  try {
    const result = await Neutralino.os.execCommand(
      `curl --globoff -sSIL --connect-timeout 10 --max-time 30 ${quoteCommandArgument(url)}`,
      { background: false },
    );
    if (result.exitCode !== 0) return null;
    const headers = `${result.stdOut || ""}\n${result.stdErr || ""}`;
    const values = [...headers.matchAll(/^content-type:\s*([^;\r\n]+)/gim)].map(
      (match) => match[1].trim(),
    );
    return values.at(-1) || null;
  } catch {
    return null;
  }
}

async function retryTransientDownload(operation, getTask, onProgress, cleanup) {
  // CDN mirrors can briefly return 503/504 while a replacement mirror is
  // becoming available. Give that recovery enough time instead of retrying
  // three times within a second and immediately surfacing a failure.
  const attempts = 4;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    if (getTask?.()?.cancelled) throw new Error("Cancelled");
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (error?.downloadDiagnostics)
        error.downloadDiagnostics.retryCount = attempt - 1;
      if (!isTransientDownloadError(error) || attempt === attempts) throw error;
      await cleanup?.();
      onProgress?.(
        `Download server is busy. Retrying (${attempt + 1}/${attempts})...`,
        2,
      );
      await waitForRetry(1000 * 2 ** (attempt - 1), getTask);
    }
  }
  throw lastError;
}

function isNonFatalUnzipFilenameWarning(exitCode, output) {
  if (Number(exitCode) !== 1) return false;
  const detail = String(output || "");
  return (
    /mismatching ["']?local["']? filename/i.test(detail) &&
    /continuing with ["']?central["']? filename version/i.test(detail)
  );
}

async function detectArchiveFormat(path) {
  try {
    const data = new Uint8Array(
      await Neutralino.filesystem.readBinaryFile(path, { pos: 0, size: 560 }),
    );
    const startsWith = (...bytes) =>
      bytes.every((byte, index) => data[index] === byte);
    if (startsWith(80, 75)) return "zip";
    if (startsWith(82, 97, 114, 33, 26, 7)) return "rar";
    if (startsWith(55, 122, 188, 175, 39, 28)) return "7z";
    if (startsWith(31, 139)) return "gzip";
    if (String.fromCharCode(...data.slice(257, 262)) === "ustar") return "tar";
  } catch {}
  return "unknown";
}

async function hasExtractedPayload(path) {
  try {
    const entries = await Neutralino.filesystem.readDirectory(path);
    for (const entry of entries) {
      if ([".", "..", ".downloading"].includes(entry.entry)) continue;
      if (entry.type === "FILE") return true;
      if (
        entry.type === "DIRECTORY" &&
        (await hasExtractedPayload(`${path}/${entry.entry}`))
      ) {
        return true;
      }
    }
  } catch {}
  return false;
}

function getDownloadSegments(totalBytes, outPath) {
  const count = Math.min(
    MAX_DOWNLOAD_SEGMENTS,
    Math.ceil(totalBytes / MIN_SEGMENTED_DOWNLOAD_BYTES),
  );
  const partSize = Math.ceil(totalBytes / count);
  return Array.from({ length: count }, (_, index) => {
    const start = index * partSize;
    const end = Math.min(totalBytes - 1, start + partSize - 1);
    return {
      start,
      end,
      size: end - start + 1,
      path: `${outPath}.part-${index}`,
    };
  });
}

async function removeParts(parts) {
  await Promise.all(
    parts.map((part) =>
      Neutralino.filesystem.remove(part.path).catch(() => {}),
    ),
  );
}

function buildWindowsMergeCommand(parts, outPath) {
  const list = parts
    .map((part) => quoteCommandArgument(part.path.replace(/\//g, "\\")))
    .join("+");
  const target = quoteCommandArgument(outPath.replace(/\//g, "\\"));
  return `cmd /c copy /b /y ${list} ${target}`;
}

function buildUnixMergeCommand(parts, outPath) {
  const list = parts.map((part) => quoteCommandArgument(part.path)).join(" ");
  return `cat ${list} > ${quoteCommandArgument(outPath)}`;
}

async function mergeParts(parts, outPath) {
  const command =
    window.NL_OS === "Windows"
      ? buildWindowsMergeCommand(parts, outPath)
      : buildUnixMergeCommand(parts, outPath);
  const result = await Neutralino.os.execCommand(command, {
    background: false,
  });
  if (result.exitCode !== 0) {
    throw new Error(
      `Could not merge download parts: ${result.stdErr || result.stdOut || "unknown error"}`,
    );
  }
}

function getWindowsExtractionCommand(archivePath, destinationPath) {
  const normArchive = String(archivePath || "").replace(/\//g, "\\");
  const normDest = String(destinationPath || "").replace(/\//g, "\\");
  return `tar.exe --force-local -xf "${normArchive}" -C "${normDest}"`;
}

function getPowerShellExtractCommand(archivePath, destinationPath) {
  const safeArchive = String(archivePath || "").replace(/\//g, "\\").replace(/'/g, "''");
  const safeDest = String(destinationPath || "").replace(/\//g, "\\").replace(/'/g, "''");
  return `powershell -NoProfile -NonInteractive -Command "Expand-Archive -Path '${safeArchive}' -DestinationPath '${safeDest}' -Force"`;
}

var NESTED_ARCHIVE_PATTERNS = [/\.zip$/i, /\.tar\.gz$/i, /\.tgz$/i, /\.tar$/i];
function isNestedArchive(entryName) {
  return (
    NESTED_ARCHIVE_PATTERNS.some((pattern) => pattern.test(entryName)) ||
    (window.NL_OS === "Darwin" && /\.dmg$/i.test(String(entryName)))
  );
}

async function collectArchiveFiles(dir) {
  const found = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = await Neutralino.filesystem.readDirectory(current);
    } catch (error) {
      continue;
    }
    for (const entry of entries) {
      if (entry.entry === "." || entry.entry === "..") continue;
      const fullPath = `${current}/${entry.entry}`;
      if (String(entry.type).toUpperCase() === "DIRECTORY") {
        stack.push(fullPath);
      } else if (isNestedArchive(entry.entry)) {
        found.push(fullPath);
      }
    }
  }
  return found;
}

function getNestedExtractionCommand(archivePath, destinationPath) {
  const isWindows = window.NL_OS === "Windows";
  const lower = String(archivePath).toLowerCase();
  if (lower.endsWith(".zip")) {
    if (isWindows)
      return getWindowsExtractionCommand(archivePath, destinationPath);
    return `unzip -oq "${archivePath}" -d "${destinationPath}"`;
  }
  const archive = archivePath;
  const dest = destinationPath;
  const flags =
    lower.endsWith(".gz") || lower.endsWith(".tgz") ? "-xzf" : "-xf";
  return `tar ${flags} "${archive}" -C "${dest}"`;
}

async function extractNestedArchives(destinationPath, getTask, onEntry) {
  const MAX_PASSES = 10;
  const reportEntry = createThrottledEntryReporter(onEntry);
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const task = getTask?.();
    if (task?.cancelled) throw new Error("Cancelled");
    const archives = await collectArchiveFiles(destinationPath);
    if (!archives.length) break;
    for (const archivePath of archives) {
      if (getTask?.()?.cancelled) throw new Error("Cancelled");
      const parentDir = archivePath.slice(0, archivePath.lastIndexOf("/"));
      if (window.NL_OS === "Darwin" && /\.dmg$/i.test(archivePath)) {
        await extractArchive({
          archivePath,
          destinationPath: parentDir,
          getTask,
          onEntry,
          extractNested: false,
        });
        await Neutralino.filesystem.remove(archivePath).catch(() => {});
        continue;
      }
      const command = getNestedExtractionCommand(archivePath, parentDir);
      const executeNested = async (cmd) => {
        const process = await spawnProcessWithShell(cmd);
        const activeTask = getTask?.();
        if (activeTask) activeTask.pid = getOsProcessId(process);
        let processOutput = "";
        await listenForProcess(
          process,
          getTask,
          (event, handler, resolve, reject) => {
            if (event.action === "stdOut" || event.action === "stdErr") {
              const output = String(event.data || "");
              processOutput = appendProcessOutput(processOutput, output);
              const trimmedOutput = output.trim();
              if (trimmedOutput) reportEntry(trimmedOutput);
              return;
            }
            if (event.action !== "exit") return;
            Neutralino.events.off("spawnedProcess", handler);
            if (event.data === 0) resolve();
            else
              reject(
                createProcessError(
                  "Nested extraction",
                  event.data,
                  processOutput,
                ),
              );
          },
        );
      };
      try {
        await executeNested(command);
        await Neutralino.filesystem.remove(archivePath).catch(() => {});
      } catch (error) {
        let recovered = false;
        if (window.NL_OS === "Windows") {
          if (
            String(error).includes("resolve failed") &&
            !command.includes("--force-local")
          ) {
            try {
              const fallbackCommand = command.includes("tar.exe")
                ? command.replace("tar.exe -xf", "tar.exe --force-local -xf")
                : command.replace("tar ", "tar --force-local ");
              await executeNested(fallbackCommand);
              recovered = true;
            } catch (retryError) {
              error = retryError;
            }
          }
          if (
            !recovered &&
            String(archivePath).toLowerCase().endsWith(".zip")
          ) {
            try {
              await executeNested(
                getPowerShellExtractCommand(archivePath, parentDir),
              );
              recovered = true;
            } catch (psError) {
              error = psError;
            }
          }
        }
        if (recovered) {
          await Neutralino.filesystem.remove(archivePath).catch(() => {});
        } else {
          console.warn("Could not extract nested archive:", archivePath, error);
        }
      }
    }
  }
}

function formatTransferBytes(bytes) {
  return formatBytes(bytes, 2, "0 Bytes");
}

function createFileProgressReader(path, totalBytes = 0) {
  let previousBytes = 0;
  let previousAt = performance.now();
  return async () => {
    const stats = await Neutralino.filesystem.getStats(path).catch(() => null);
    const bytes = Number(stats?.size) || 0;
    const now = performance.now();
    const elapsed = Math.max(1, now - previousAt);
    const bytesPerSecond = Math.max(
      0,
      ((bytes - previousBytes) * 1000) / elapsed,
    );
    previousBytes = bytes;
    previousAt = now;
    const total = Number(totalBytes) || 0;
    const progress =
      total > 0 ? Math.min(100, (bytes / total) * 100) : undefined;
    const amount =
      total > 0
        ? `${formatTransferBytes(bytes)} of ${formatTransferBytes(total)}`
        : formatTransferBytes(bytes);
    const speed =
      bytesPerSecond > 0 ? ` at ${formatTransferBytes(bytesPerSecond)}/s` : "";
    return { progress, status: `Downloading ${amount}${speed}...` };
  };
}

function createPartsProgressReader(parts, totalBytes) {
  let previousBytes = 0;
  let previousAt = performance.now();
  return async () => {
    const sizes = await Promise.all(
      parts.map(async (part) => {
        try {
          return (
            Number((await Neutralino.filesystem.getStats(part.path)).size) || 0
          );
        } catch {
          return 0;
        }
      }),
    );
    const bytes = sizes.reduce((total, size) => total + size, 0);
    const now = performance.now();
    const elapsed = Math.max(1, now - previousAt);
    const bytesPerSecond = Math.max(
      0,
      ((bytes - previousBytes) * 1000) / elapsed,
    );
    previousBytes = bytes;
    previousAt = now;
    const speed =
      bytesPerSecond > 0 ? ` at ${formatTransferBytes(bytesPerSecond)}/s` : "";
    return {
      progress: Math.min(100, (bytes / totalBytes) * 100),
      status: `Downloading ${formatTransferBytes(bytes)} of ${formatTransferBytes(totalBytes)}${speed}...`,
    };
  };
}

async function runCurlDownload(command, getTask, onProgress, getProgress) {
  let process;
  try {
    process = await spawnProcessWithShell(command);
  } catch (error) {
    const nativeError = createProcessError(
      "Download",
      -1,
      error?.message || error,
    );
    nativeError.cause = error;
    throw nativeError;
  }
  const task = getTask();
  if (task) task.pid = getOsProcessId(process);
  let processOutput = "";
  let maxPercent = 0;
  let lastStatus = "";
  const reportProgress = (update) => {
    const details = typeof update === "object" ? update : { progress: update };
    const percent = Number(details.progress);
    if (!Number.isNaN(percent)) maxPercent = Math.max(maxPercent, percent);
    const status = details.status || "Downloading...";
    if (status === lastStatus && Number.isNaN(percent)) return;
    lastStatus = status;
    onProgress?.(status, Math.min(98, 2 + maxPercent * 0.96));
  };
  reportProgress({ status: "Download process started..." });
  let isCheckingProgress = false;
  const progressTimer = getProgress
    ? setInterval(async () => {
        if (isCheckingProgress) return;
        isCheckingProgress = true;
        try {
          reportProgress(await getProgress());
        } catch (error) {
        } finally {
          isCheckingProgress = false;
        }
      }, 180)
    : null;
  try {
    await listenForProcess(
      process,
      getTask,
      (event, handler, resolve, reject) => {
        if (event.action === "stdErr" || event.action === "stdOut") {
          const output = String(event.data || "");
          processOutput = appendProcessOutput(processOutput, output);
          if (getProgress) return;
          const matches = output.match(/(\d+\.?\d*)%/g);
          reportProgress({
            progress: matches?.length
              ? Number.parseFloat(matches[matches.length - 1])
              : undefined,
            status: "Receiving download data...",
          });
          return;
        }
        if (event.action !== "exit") return;
        Neutralino.events.off("spawnedProcess", handler);
        if (event.data === 0) resolve();
        else reject(createProcessError("Download", event.data, processOutput));
      },
    );
  } finally {
    if (progressTimer) clearInterval(progressTimer);
  }
}

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const GDRIVE_CURL_HEADERS = [
  `-A ${quoteCommandArgument(BROWSER_USER_AGENT)}`,
  `-H ${quoteCommandArgument("Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")}`,
  `-H ${quoteCommandArgument("Accept-Language: en-US,en;q=0.9")}`,
  `-H ${quoteCommandArgument('Sec-Ch-Ua: "Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"')}`,
  `-H ${quoteCommandArgument("Sec-Ch-Ua-Mobile: ?0")}`,
  `-H ${quoteCommandArgument('Sec-Ch-Ua-Platform: "Windows"')}`,
  `-H ${quoteCommandArgument("Sec-Fetch-Dest: document")}`,
  `-H ${quoteCommandArgument("Sec-Fetch-Mode: navigate")}`,
  `-H ${quoteCommandArgument("Sec-Fetch-Site: same-origin")}`,
  `-H ${quoteCommandArgument("Sec-Fetch-User: ?1")}`,
  `-H ${quoteCommandArgument("Upgrade-Insecure-Requests: 1")}`,
  `-H ${quoteCommandArgument("Referer: https://drive.usercontent.google.com/")}`,
].join(" ");

/**
 * @fix 2026-08-05T03:31:10.964Z - Fix Google Drive quota detection and confirmation handling
 */
async function downloadGoogleDriveArchive({
  fileId,
  outPath,
  totalBytes = 0,
  getTask,
  onProgress,
}) {
  const cookiePath = `${outPath}.cookie`;
  const probePath = `${outPath}.probe`;
  try {
    onProgress?.("Authorizing Google Drive download...", 2);
    const initialUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download`;

    // Request download with cookie jar and browser headers
    await retryTransientDownload(
      () =>
        runCurlDownload(
          `curl --globoff -s -L ${GDRIVE_CURL_HEADERS} -c ${quoteCommandArgument(cookiePath)} -b ${quoteCommandArgument(cookiePath)} ${quoteCommandArgument(initialUrl)} -o ${quoteCommandArgument(probePath)}`,
          getTask,
          () => {},
        ),
      getTask,
      onProgress,
      () => Neutralino.filesystem.remove(probePath).catch(() => {}),
    );

    let isHtml = false;
    let htmlContent = "";
    try {
      const stats = await Neutralino.filesystem.getStats(probePath);
      if (stats.size > 0) {
        const readSize = Math.min(stats.size, 131072);
        htmlContent = new TextDecoder().decode(
          await Neutralino.filesystem.readBinaryFile(probePath, {
            pos: 0,
            size: readSize,
          }),
        );
        isHtml = looksLikeHtmlResponse(htmlContent);
      }
    } catch {}

    if (isHtml) {
      // Check if there is a direct download link or confirmation form
      let confirmedDownloadUrl = null;

      const directLinkMatch =
        htmlContent.match(/<a[^>]+id=["']uc-download-link["'][^>]+href=["']([^"']+)["']/i) ||
        htmlContent.match(/<a[^>]+href=["']([^"']*(?:export=download|drive\.usercontent\.google\.com\/download)[^"']*)["']/i);

      if (directLinkMatch) {
        let linkHref = directLinkMatch[1].replaceAll("&amp;", "&");
        if (linkHref.startsWith("/")) {
          linkHref = `https://drive.google.com${linkHref}`;
        }
        confirmedDownloadUrl = linkHref;
      }

      if (!confirmedDownloadUrl) {
        const formActionMatch =
          htmlContent.match(/<form[^>]+action=["']([^"']+)["']/i) ||
          htmlContent.match(/action=["']([^"']*(?:download|uc)[^"']*)["']/i);
        let actionUrl = formActionMatch
          ? formActionMatch[1].replaceAll("&amp;", "&")
          : "https://drive.usercontent.google.com/download";
        if (!actionUrl.startsWith("http")) {
          actionUrl = `https://drive.usercontent.google.com${actionUrl.startsWith("/") ? "" : "/"}${actionUrl}`;
        }

        const formParams = new URLSearchParams();
        formParams.set("id", fileId);
        formParams.set("export", "download");
        formParams.set("confirm", "t");

        const inputRegex =
          /<input[^>]+(?:name=["']([^"']+)["'][^>]+value=["']([^"']*)["']|value=["']([^"']*)["'][^>]+name=["']([^"']+)["'])/gi;
        let match;
        while ((match = inputRegex.exec(htmlContent)) !== null) {
          const name = match[1] || match[4];
          const value = match[2] || match[3] || "";
          if (name) formParams.set(name, value);
        }

        const uuidMatch =
          htmlContent.match(/name=["']uuid["']\s+value=["']([^"']+)["']/i) ||
          htmlContent.match(/uuid=([^&"'\s<]+)/i);
        if (uuidMatch && !formParams.get("uuid")) {
          formParams.set("uuid", uuidMatch[1]);
        }

        const atMatch =
          htmlContent.match(/name=["']at["']\s+value=["']([^"']+)["']/i) ||
          htmlContent.match(/at=([^&"'\s<]+)/i);
        if (atMatch && !formParams.get("at")) {
          formParams.set("at", atMatch[1]);
        }

        confirmedDownloadUrl = `${actionUrl}${actionUrl.includes("?") ? "&" : "?"}${formParams.toString()}`;
      }

      const hasFormOrLink = Boolean(
        /<form[^>]+action=["'][^"']*(?:download|uc\?)[^"']*["']/i.test(htmlContent) ||
        /id=["'](?:download-form|downloadForm|uc-download-link)["']/i.test(htmlContent) ||
        /name=["'](?:confirm|uuid)["']/i.test(htmlContent) ||
        directLinkMatch
      );

      if (!hasFormOrLink) {
        if (
          htmlContent.includes("Quota exceeded") ||
          htmlContent.includes(
            "Too many users have viewed or downloaded this file recently",
          ) ||
          htmlContent.includes("ha superado la cuota") ||
          htmlContent.includes("ha superado su cuota")
        ) {
          throw new Error(
            "Google Drive: Este archivo ha superado su cuota de descargas porque demasiados usuarios lo han descargado recientemente. Inténtalo más tarde o prueba con otro enlace de descarga.",
          );
        }
        if (
          htmlContent.includes("Access denied") ||
          htmlContent.includes("You need access") ||
          htmlContent.includes("Sign in to continue")
        ) {
          throw new Error(
            "Google Drive: Este archivo requiere permisos de acceso o inicio de sesión en Google.",
          );
        }
        if (
          htmlContent.includes("File not found") ||
          htmlContent.includes(
            "Sorry, the file you have requested does not exist",
          )
        ) {
          throw new Error(
            "Google Drive: El archivo no existe o fue eliminado de Google Drive.",
          );
        }
      }

      const htmlError = getHtmlResponseError(htmlContent);
      if (!hasFormOrLink && htmlError) throw htmlError;

      await Neutralino.filesystem.remove(probePath).catch(() => {});
      onProgress?.("Downloading mod from Google Drive...", 5);
      await retryTransientDownload(
        () =>
          runCurlDownload(
            `curl --globoff -# -L --fail --show-error ${GDRIVE_CURL_HEADERS} -b ${quoteCommandArgument(cookiePath)} -c ${quoteCommandArgument(cookiePath)} --connect-timeout 15 --speed-time 60 --speed-limit 1024 ${quoteCommandArgument(confirmedDownloadUrl)} -o ${quoteCommandArgument(outPath)}`,
            getTask,
            onProgress,
            createFileProgressReader(outPath, totalBytes),
          ),
        getTask,
        onProgress,
        () => Neutralino.filesystem.remove(outPath).catch(() => {}),
      );
    } else {
      await finalizeDownloadedArchive(probePath, outPath);
    }
  } finally {
    await Neutralino.filesystem.remove(cookiePath).catch(() => {});
    await Neutralino.filesystem.remove(probePath).catch(() => {});
  }
}

async function downloadSingleArchive({
  url,
  outPath,
  totalBytes = 0,
  getTask,
  onProgress,
}) {
  requireValue(url, "url");
  requireValue(outPath, "outPath");
  if (
    url.includes("drive.google.com") ||
    url.includes("drive.usercontent.google.com") ||
    url.includes("docs.google.com")
  ) {
    const fileId = getGoogleDriveFileId(url);
    if (fileId) {
      await downloadGoogleDriveArchive({
        fileId,
        outPath,
        totalBytes,
        getTask,
        onProgress,
      });
      return;
    }
  }

  await retryTransientDownload(
    () =>
      runCurlDownload(
        // Keep curl's progress bar enabled. `runCurlDownload` consumes its
        // percentage updates; using -s here suppressed them and left every
        // single-connection transfer looking like it was stuck at 2%.
        // Use a low-speed timeout instead of an absolute transfer limit so a
        // legitimate large or slow download is not aborted after two minutes.
        `curl --globoff -# -L --fail --show-error -A ${quoteCommandArgument(BROWSER_USER_AGENT)} -H "Accept-Language: en-US,en;q=0.9" --connect-timeout 15 --speed-time 60 --speed-limit 1024 ${quoteCommandArgument(url)} -o ${quoteCommandArgument(outPath)}`,
        getTask,
        onProgress,
        createFileProgressReader(outPath, totalBytes),
      ),
    getTask,
    onProgress,
    () => Neutralino.filesystem.remove(outPath).catch(() => {}),
  );
}

async function downloadSegmentedArchive({
  url,
  outPath,
  totalBytes,
  getTask,
  onProgress,
}) {
  const parts = getDownloadSegments(totalBytes, outPath);
  const getProgress = createPartsProgressReader(parts, totalBytes);
  try {
    await removeParts(parts);
    onProgress?.("Opening parallel download connections...", 2);
    const requests = parts
      .map(
        (part) =>
          `-L --range ${part.start}-${part.end} -o ${quoteCommandArgument(part.path)} ${quoteCommandArgument(url)}`,
      )
      .join(" --next ");
    await retryTransientDownload(
      () =>
        runCurlDownload(
          `curl --globoff -# --fail --show-error --parallel --parallel-max ${parts.length} ${requests}`,
          getTask,
          onProgress,
          getProgress,
        ),
      getTask,
      onProgress,
      () => removeParts(parts),
    );
    if (getTask()?.cancelled) throw new Error("Cancelled");
    const partSizes = await Promise.all(
      parts.map(async (part) => {
        try {
          return (await Neutralino.filesystem.getStats(part.path)).size;
        } catch (error) {
          return 0;
        }
      }),
    );
    if (partSizes.some((size, index) => size !== parts[index].size)) {
      throw new Error("Parallel download returned incomplete file parts");
    }
    await mergeParts(parts, outPath);
    const mergedBytes = (await Neutralino.filesystem.getStats(outPath)).size;
    if (mergedBytes !== totalBytes) {
      throw new Error("Parallel download merged to an incomplete archive");
    }
  } finally {
    await removeParts(parts);
  }
}

async function waitForDownloadedArchive(outPath) {
  let lastError;
  // Windows can keep curl's output handle open for a few seconds after its
  // process-exit event. Do not treat that short handoff as a failed download.
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const stats = await Neutralino.filesystem.getStats(outPath);
      if (stats.size > 0) return stats;
      lastError = new Error("The downloaded archive is empty");
    } catch (error) {
      lastError = error;
    }
    if (attempt < 8) await wait(attempt * 250);
  }
  throw new Error(
    `WeekBox could not access the temporary download after it completed. ${lastError?.message || lastError || "Unknown filesystem error"}`,
  );
}

async function finalizeDownloadedArchive(partPath, outPath) {
  if (archiveFinalizations.has(outPath))
    return archiveFinalizations.get(outPath);
  const finalization = (async () => {
    await wait(150); // Let curl release Windows file handles after exit.
    await waitForDownloadedArchive(partPath);
    let lastError;
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      try {
        if (
          await Neutralino.filesystem
            .getStats(outPath)
            .then(() => true)
            .catch(() => false)
        ) {
          await Neutralino.filesystem.remove(outPath);
        }
        await Neutralino.filesystem.move(partPath, outPath);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < 8) await wait(attempt * 250);
      }
    }
    try {
      await Neutralino.filesystem.copy(partPath, outPath, {
        recursive: false,
        overwrite: true,
        skip: false,
      });
      await waitForDownloadedArchive(outPath);
      await Neutralino.filesystem.remove(partPath).catch(() => {});
    } catch (copyError) {
      const error = new Error(
        "WeekBox could not finalize the temporary download. Close apps that may be using the WeekBox folder and try again.",
      );
      error.downloadDiagnostics = {
        stage: "finalize",
        code: copyError?.code || lastError?.code || "NE_FS_MOVEERR",
      };
      throw error;
    }
  })();
  archiveFinalizations.set(outPath, finalization);
  try {
    return await finalization;
  } finally {
    archiveFinalizations.delete(outPath);
  }
}

async function downloadArchive({
  url,
  outPath,
  getTask,
  onProgress,
  sourceType,
  onDiagnostic,
  expectedSize = 0,
}) {
  if (!String(url || "").trim()) {
    throw new Error("This download does not have a valid link");
  }
  if (!String(outPath || "").trim()) {
    throw new Error("WeekBox could not prepare the download destination");
  }
  const destinationDir = getParentPath(outPath);
  requireValue(destinationDir, "download destination folder");
  const partPath = `${outPath}.part`;
  /**
   * @fix 2026-08-05T04:49:46.409Z - Fix download could not be written to storage error
   */
  await ensureDirectoryExists(destinationDir);
  try {
    await Neutralino.filesystem.writeFile(`${partPath}.write-check`, "");
    await Neutralino.filesystem
      .remove(`${partPath}.write-check`)
      .catch(() => {});
  } catch (error) {
    try {
      await ensureDirectoryExists(destinationDir);
      await Neutralino.filesystem.writeFile(`${partPath}.write-check`, "");
      await Neutralino.filesystem
        .remove(`${partPath}.write-check`)
        .catch(() => {});
    } catch (retryError) {
      throw new Error(
        `The download could not be written to storage. The destination folder is missing, locked, read-only, or out of space. (${retryError?.code || error?.code || "write check failed"})`,
      );
    }
  }
  await Neutralino.filesystem.remove(partPath).catch(() => {});
  if (sourceType === "external") {
    onProgress?.("Preparing external download...", 2);
    url = await resolveExternalDownloadUrl(url, (...args) =>
      Neutralino.os.execCommand(...args),
    );
  }

  const isGoogleDriveUrl =
    url.includes("drive.google.com") ||
    url.includes("drive.usercontent.google.com") ||
    url.includes("docs.google.com");

  if (sourceType === "external" && !isGoogleDriveUrl) {
    onDiagnostic?.({
      resolvedUrl: url,
      contentType: await getDownloadContentType(url),
    });
  }

  const useMultithreadDownloads = appSettings.get("multithreadDownloads");
  let remoteFileSize = Number(expectedSize) || 0;
  if (!isGoogleDriveUrl && (useMultithreadDownloads || !remoteFileSize)) {
    try {
      onProgress?.("Checking download server...", 2);
      const detectedSize = await getRangeSupportedFileSize(url, (...args) =>
        Neutralino.os.execCommand(...args),
      );
      if (detectedSize > 0) remoteFileSize = detectedSize;
    } catch (error) {
      if (getTask()?.cancelled) throw error;
    }
  }

  if (
    useMultithreadDownloads &&
    !isGoogleDriveUrl &&
    remoteFileSize >= MIN_SEGMENTED_DOWNLOAD_BYTES
  ) {
    try {
      await downloadSegmentedArchive({
        url,
        outPath: partPath,
        totalBytes: remoteFileSize,
        getTask,
        onProgress,
      });
    } catch (error) {
      if (getTask()?.cancelled) throw error;
      await Neutralino.filesystem.remove(partPath).catch(() => {});
      onProgress?.(
        "Parallel download failed. Retrying with one connection...",
        2,
      );
      await downloadSingleArchive({
        url,
        outPath: partPath,
        totalBytes: remoteFileSize,
        getTask,
        onProgress,
      });
    }
    onProgress?.("Finalizing downloaded file...", 98);
    await finalizeDownloadedArchive(partPath, outPath);
    const stats = await waitForDownloadedArchive(outPath);
    onProgress?.("Verifying downloaded archive...", 98);
    await verifyDownloadedArchiveContent(outPath);
    onDiagnostic?.({
      resolvedUrl: url,
      downloadedSize: stats.size,
      archiveFormat: await detectArchiveFormat(outPath),
    });
    return stats;
  }
  try {
    onProgress?.("Connecting to download server...", 2);
    await downloadSingleArchive({
      url,
      outPath: partPath,
      totalBytes: remoteFileSize,
      getTask,
      onProgress,
    });
    onProgress?.("Finalizing downloaded file...", 98);
    await finalizeDownloadedArchive(partPath, outPath);
    const stats = await waitForDownloadedArchive(outPath);
    onProgress?.("Verifying downloaded archive...", 98);
    await verifyDownloadedArchiveContent(outPath);
    onDiagnostic?.({
      resolvedUrl: url,
      downloadedSize: stats.size,
      archiveFormat: await detectArchiveFormat(outPath),
    });
    return stats;
  } catch (error) {
    await Neutralino.filesystem.remove(partPath).catch(() => {});
    throw error;
  }
}

async function verifyDownloadedArchiveContent(archivePath) {
  const stats = await Neutralino.filesystem.getStats(archivePath);
  if (stats.size === 0) {
    throw new Error("The downloaded archive is empty (0 bytes).");
  }
  const sample = new TextDecoder().decode(
    await Neutralino.filesystem.readBinaryFile(archivePath, {
      pos: 0,
      size: 8192,
    }),
  );
  const htmlError = getHtmlResponseError(sample);
  if (htmlError) throw htmlError;
  if (stats.size < 500 * 1024) {
    try {
      const sample = await Neutralino.filesystem.readFile(archivePath);
      if (
        sample.includes("<!DOCTYPE html") ||
        sample.includes("<!doctype html") ||
        sample.includes("<html") ||
        sample.includes("<HTML")
      ) {
        if (
          sample.includes("Quota exceeded") ||
          sample.includes(
            "Too many users have viewed or downloaded this file recently",
          ) ||
          sample.includes("ha superado la cuota")
        ) {
          throw new Error(
            "Google Drive: Este archivo ha superado la cuota de descargas porque demasiados usuarios lo han descargado recientemente. Inténtalo más tarde o prueba con otro enlace.",
          );
        }
        const titleMatch = sample.match(/<title[^>]*>([^<]+)<\/title>/i);
        const headingMatch = sample.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        const pMatch = sample.match(
          /<p[^>]*class="[^"]*error[^"]*"[^>]*>([^<]+)<\/p>/i,
        );
        const errorReason =
          pMatch?.[1]?.trim() ||
          headingMatch?.[1]?.trim() ||
          titleMatch?.[1]?.trim() ||
          "Web page returned";
        throw new Error(
          `La descarga falló: El servidor devolvió una página web ('${errorReason}') en lugar de un archivo de mod.`,
        );
      }
    } catch (e) {
      if (
        e.message?.includes("Google Drive:") ||
        e.message?.includes("La descarga falló:") ||
        e.message?.includes("The downloaded archive is empty")
      ) {
        throw e;
      }
    }
  }
}

async function extractArchive({
  archivePath,
  destinationPath,
  getTask,
  onEntry,
  extractNested = false,
}) {
  requireValue(archivePath, "archivePath");
  requireValue(destinationPath, "destinationPath");
  const reportEntry = createThrottledEntryReporter(onEntry);
  const isDiskImage =
    window.NL_OS === "Darwin" && /\.dmg$/i.test(String(archivePath));
  if (isDiskImage) {
    const mountPath = `${destinationPath}/.weekbox-dmg-${Date.now()}`;
    let attached = false;
    let processOutput = "";
    try {
      await Neutralino.filesystem.createDirectory(mountPath);
      const process = await spawnProcessWithShell(
        `hdiutil attach -nobrowse -readonly -mountpoint ${quoteCommandArgument(mountPath)} ${quoteCommandArgument(archivePath)}`,
      );
      const task = getTask();
      if (task) task.pid = getOsProcessId(process);
      await listenForProcess(
        process,
        getTask,
        (event, handler, resolve, reject) => {
          if (event.action === "stdOut" || event.action === "stdErr") {
            processOutput = appendProcessOutput(processOutput, event.data);
            return;
          }
          if (event.action !== "exit") return;
          Neutralino.events.off("spawnedProcess", handler);
          if (event.data === 0) resolve();
          else
            reject(
              createProcessError(
                "Mounting disk image",
                event.data,
                processOutput,
              ),
            );
        },
      );
      attached = true;
      const entries = await Neutralino.filesystem.readDirectory(mountPath);
      const app = entries.find(
        (entry) =>
          entry.type === "DIRECTORY" && /\.app$/i.test(String(entry.entry)),
      );
      if (!app) {
        throw new Error("The disk image does not contain a macOS application");
      }
      onEntry?.(app.entry);
      await Neutralino.filesystem.copy(
        `${mountPath}/${app.entry}`,
        `${destinationPath}/${app.entry}`,
        { recursive: true, overwrite: false },
      );
    } finally {
      if (attached) {
        const result = await Neutralino.os.execCommand(
          `hdiutil detach ${quoteCommandArgument(mountPath)}`,
          { background: false },
        );
        if (result.exitCode !== 0) {
          console.warn("Could not detach WeekBox disk image:", result.stdErr);
        }
      }
      await Neutralino.filesystem.remove(mountPath).catch(() => {});
    }
    return;
  }
  const isWindows = window.NL_OS === "Windows";
  const archiveFormat = await detectArchiveFormat(archivePath);
  let portable7z = null;
  const binNames = isWindows
    ? ["7za.exe", "7z.exe"]
    : window.NL_OS === "Darwin"
      ? ["7zz-mac", "7za-mac", "7zz"]
      : ["7zz-linux", "7za-linux", "7zzs", "7zz"];
  for (const binName of binNames) {
    const pathsToTry = [
      `${window.NL_PATH}/app/assets/bin/${binName}`,
      `${window.NL_PATH}/assets/bin/${binName}`,
      `${window.NL_PATH}/resources/app/assets/bin/${binName}`,
      `${window.NL_CWD}/app/assets/bin/${binName}`,
      `${window.NL_CWD}/assets/bin/${binName}`,
      `app/assets/bin/${binName}`,
      `assets/bin/${binName}`,
    ];
    for (const binPath of pathsToTry) {
      try {
        if ((await Neutralino.filesystem.getStats(binPath)).isFile) {
          portable7z = binPath;
          break;
        }
      } catch {}
    }
    if (portable7z) break;
  }
  const normWinPath = (p) => String(p || "").replace(/\//g, "\\");
  const command = portable7z
    ? isWindows
      ? `"${normWinPath(portable7z)}" x -y -aoa "-o${normWinPath(destinationPath)}" "${normWinPath(archivePath)}"`
      : `${quoteCommandArgument(portable7z)} x -y -aoa -o${quoteCommandArgument(destinationPath)} ${quoteCommandArgument(archivePath)}`
    : isWindows
      ? getWindowsExtractionCommand(archivePath, destinationPath)
      : archiveFormat === "tar" || archiveFormat === "gzip"
        ? `tar -xf ${quoteCommandArgument(archivePath)} -C ${quoteCommandArgument(destinationPath)}`
        : archiveFormat === "rar" || archiveFormat === "7z"
          ? window.NL_OS === "Darwin"
            ? `tar -xf ${quoteCommandArgument(archivePath)} -C ${quoteCommandArgument(destinationPath)}`
            : `7z x -y -aoa -o${quoteCommandArgument(destinationPath)} ${quoteCommandArgument(archivePath)}`
          : `unzip -oq ${quoteCommandArgument(archivePath)} -d ${quoteCommandArgument(destinationPath)}`;
  const execute = async (cmd) => {
    const process = await spawnProcessWithShell(cmd);
    const task = getTask();
    if (task) task.pid = getOsProcessId(process);
    let processOutput = "";
    await listenForProcess(
      process,
      getTask,
      (event, handler, resolve, reject) => {
        if (event.action === "stdOut" || event.action === "stdErr") {
          const output = String(event.data || "");
          processOutput = appendProcessOutput(processOutput, output);
          const trimmedOutput = output.trim();
          if (trimmedOutput) reportEntry(trimmedOutput);
          return;
        }
        if (event.action !== "exit") return;
        Neutralino.events.off("spawnedProcess", handler);
        if (
          event.data === 0 ||
          (!isWindows &&
            isNonFatalUnzipFilenameWarning(event.data, processOutput))
        )
          resolve();
        else
          reject(createProcessError("Extraction", event.data, processOutput));
      },
    );
  };
  try {
    await execute(command);
  } catch (error) {
    let recovered = false;
    if (isWindows) {
      if (await hasExtractedPayload(destinationPath)) recovered = true;
      if (!recovered) {
        try {
          await execute(
            getWindowsExtractionCommand(archivePath, destinationPath),
          );
          recovered = true;
        } catch (tarError) {
          if (String(tarError).includes("resolve failed")) {
            try {
              await execute(
                getWindowsExtractionCommand(
                  archivePath,
                  destinationPath,
                ).replace("tar.exe -xf", "tar.exe --force-local -xf"),
              );
              recovered = true;
            } catch (retryError) {
              error = retryError;
            }
          }
        }
      }
      if (
        !recovered &&
        (String(archivePath).toLowerCase().endsWith(".zip") ||
          archiveFormat === "zip")
      ) {
        try {
          await execute(
            getPowerShellExtractCommand(archivePath, destinationPath),
          );
          recovered = true;
        } catch (psError) {
          error = psError;
        }
      }
    } else if (archiveFormat === "unknown" || archiveFormat === "zip") {
      const fallbackCommands = [
        `tar -xf ${quoteCommandArgument(archivePath)} -C ${quoteCommandArgument(destinationPath)}`,
      ];
      if (window.NL_OS !== "Darwin") {
        fallbackCommands.push(
          `7z x -y -aoa -o${quoteCommandArgument(destinationPath)} ${quoteCommandArgument(archivePath)}`,
        );
      }
      for (const fallbackCommand of fallbackCommands) {
        try {
          await execute(fallbackCommand);
          recovered = true;
          break;
        } catch {}
      }
    }
    if (
      !recovered &&
      window.NL_OS === "Darwin" &&
      (archiveFormat === "rar" || archiveFormat === "7z")
    ) {
      throw new Error(
        `This ${archiveFormat.toUpperCase()} download cannot be unpacked by this version of macOS. Ask the mod author for a ZIP download.`,
      );
    }
    if (!recovered) throw error;
  }
  if (extractNested) {
    await extractNestedArchives(destinationPath, getTask, onEntry);
  }
}

export { extractArchive, downloadArchive, listenForProcess };
