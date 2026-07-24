var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// app/src/ui/utils/base64Transformer.js
async function getBase64FromUrl(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
}
__name(getBase64FromUrl, "getBase64FromUrl");

// app/src/ui/utils/downloads/archiveTransfer.js
import { appSettings } from "../../backend/core/settings.js";

// app/src/ui/utils/downloads/externalDownloadResolver.js
function quoteCommandArgument(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}
__name(quoteCommandArgument, "quoteCommandArgument");
function getGoogleDriveFileId(url) {
  const parsed = url instanceof URL ? url : new URL(url);
  return parsed.searchParams.get("id") || parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || null;
}
__name(getGoogleDriveFileId, "getGoogleDriveFileId");
async function resolveExternalDownloadUrl(url, executeCommand) {
  const value = String(url || "").trim();
  if (!value) throw new Error("This download link is missing");
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("This external download link is invalid");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("This external download link is not supported");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "drive.google.com") {
    const fileId = getGoogleDriveFileId(parsed);
    if (!fileId) {
      throw new Error(
        "This Google Drive link does not point to a downloadable file"
      );
    }
    return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;
  }
  if (hostname === "mediafire.com" || hostname === "www.mediafire.com") {
    const result = await executeCommand(
      `curl -fsSL --connect-timeout 10 --max-time 30 ${quoteCommandArgument(value)}`,
      { background: false }
    );
    if (result.exitCode !== 0) {
      throw new Error(
        result.stdErr || "Could not open the MediaFire download page"
      );
    }
    const directUrl = (result.stdOut || "").replaceAll("&amp;", "&").match(/https?:\/\/download[^"'\s<>]+\.mediafire\.com[^"'\s<>]*/i)?.[0];
    if (!directUrl) {
      throw new Error("Could not find the MediaFire download link");
    }
    return directUrl;
  }
  return value;
}
__name(resolveExternalDownloadUrl, "resolveExternalDownloadUrl");
async function getRangeSupportedFileSize(url, executeCommand) {
  const result = await executeCommand(
    `curl -sS -L -I --connect-timeout 3 --max-time 3 --range 0-0 ${quoteCommandArgument(url)}`,
    { background: false }
  );
  if (result.exitCode !== 0) {
    throw new Error(
      result.stdErr || `Range check failed with exit code ${result.exitCode}`
    );
  }
  const headers = `${result.stdOut || ""}
${result.stdErr || ""}`;
  const match = headers.match(/content-range:\s*bytes\s+0-0\/(\d+)/i);
  return match ? Number(match[1]) : 0;
}
__name(getRangeSupportedFileSize, "getRangeSupportedFileSize");

// app/src/ui/utils/filesystem/spawnedProcess.js
function sameProcessId(left, right) {
  return String(left) === String(right);
}
__name(sameProcessId, "sameProcessId");
function getOsProcessId(process) {
  return process?.pid ?? process?.id ?? null;
}
__name(getOsProcessId, "getOsProcessId");

// app/src/ui/utils/downloads/archiveTransfer.js
function formatArchiveEntry(output) {
  const lines = output.trim().split("\n");
  let name = lines[lines.length - 1].trim().replace(/^x\s+/, "").replace(/^inflating:\s+/, "").replace(/^extracting:\s+/, "").replace(/^creating:\s+/, "").trim();
  const parts = name.split(/[/\\]/);
  if (parts.length > 2) name = `.../${parts.slice(-2).join("/")}`;
  return name;
}
__name(formatArchiveEntry, "formatArchiveEntry");
function createThrottledEntryReporter(onEntry, intervalMs = 500) {
  let lastReportedAt = 0;
  return (output) => {
    if (!onEntry) return;
    const now = performance.now();
    if (now - lastReportedAt < intervalMs) return;
    lastReportedAt = now;
    onEntry(formatArchiveEntry(output));
  };
}
__name(createThrottledEntryReporter, "createThrottledEntryReporter");
function listenForProcess(process, getTask, onEvent) {
  return new Promise((resolve, reject) => {
    const handler = /* @__PURE__ */ __name((event) => {
      const task = getTask();
      if (task?.cancelled) {
        Neutralino.events.off("spawnedProcess", handler);
        reject(new Error("Cancelled"));
        return;
      }
      if (!sameProcessId(event.detail.id, process.id)) return;
      if (event.detail.action === "exit" && sameProcessId(task?.pid, getOsProcessId(process))) {
        task.pid = null;
      }
      onEvent(event.detail, handler, resolve, reject);
    }, "handler");
    Neutralino.events.on("spawnedProcess", handler).catch(reject);
  });
}
__name(listenForProcess, "listenForProcess");
var MIN_SEGMENTED_DOWNLOAD_BYTES = 8 * 1024 * 1024;
var MAX_DOWNLOAD_SEGMENTS = 4;
function quoteCommandArgument2(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}
__name(quoteCommandArgument2, "quoteCommandArgument");
function spawnProcessWithShell(command) {
  if (window.NL_OS === "Windows") {
    return Neutralino.os.spawnProcess(command);
  }
  return Neutralino.os.spawnProcess(`sh -c ${quoteCommandArgument2(command)}`);
}
__name(spawnProcessWithShell, "spawnProcessWithShell");
function appendProcessOutput(output, data) {
  const next = `${output}${String(data || "")}`;
  return next.length > 4e3 ? next.slice(-4e3) : next;
}
__name(appendProcessOutput, "appendProcessOutput");
function createProcessError(operation, exitCode, output) {
  const detail = output.trim();
  if (operation === "Download" && Number(exitCode) === 23) {
    return new Error(
      "The download could not be written to storage. Check that the WeekBox folder is writable and has enough free space, then try again."
    );
  }
  if (operation === "Extraction" && Number(exitCode) === 127 && detail.includes("7z")) {
    return new Error(
      "To install .7z or .rar mods on Linux, you must install the p7zip package (e.g. sudo apt install p7zip-full)."
    );
  }
  return new Error(
    `${operation} failed with exit code ${exitCode}${detail ? `: ${detail}` : ""}`
  );
}
__name(createProcessError, "createProcessError");
function isNonFatalUnzipFilenameWarning(exitCode, output) {
  if (Number(exitCode) !== 1) return false;
  const detail = String(output || "");
  return /mismatching ["']?local["']? filename/i.test(detail) && /continuing with ["']?central["']? filename version/i.test(detail);
}
__name(isNonFatalUnzipFilenameWarning, "isNonFatalUnzipFilenameWarning");
async function detectArchiveFormat(path) {
  try {
    const data = new Uint8Array(
      await Neutralino.filesystem.readBinaryFile(path, { pos: 0, size: 560 })
    );
    const startsWith = /* @__PURE__ */ __name((...bytes) => bytes.every((byte, index) => data[index] === byte), "startsWith");
    if (startsWith(80, 75)) return "zip";
    if (startsWith(82, 97, 114, 33, 26, 7)) return "rar";
    if (startsWith(55, 122, 188, 175, 39, 28)) return "7z";
    if (startsWith(31, 139)) return "gzip";
    if (String.fromCharCode(...data.slice(257, 262)) === "ustar") return "tar";
  } catch {
  }
  return "unknown";
}
__name(detectArchiveFormat, "detectArchiveFormat");
async function hasExtractedPayload(path) {
  try {
    const entries = await Neutralino.filesystem.readDirectory(path);
    for (const entry of entries) {
      if ([".", "..", ".downloading"].includes(entry.entry)) continue;
      if (entry.type === "FILE") return true;
      if (entry.type === "DIRECTORY" && await hasExtractedPayload(`${path}/${entry.entry}`)) {
        return true;
      }
    }
  } catch {
  }
  return false;
}
__name(hasExtractedPayload, "hasExtractedPayload");
function getDownloadSegments(totalBytes, outPath) {
  const count = Math.min(
    MAX_DOWNLOAD_SEGMENTS,
    Math.ceil(totalBytes / MIN_SEGMENTED_DOWNLOAD_BYTES)
  );
  const partSize = Math.ceil(totalBytes / count);
  return Array.from({ length: count }, (_, index) => {
    const start = index * partSize;
    const end = Math.min(totalBytes - 1, start + partSize - 1);
    return {
      start,
      end,
      size: end - start + 1,
      path: `${outPath}.part-${index}`
    };
  });
}
__name(getDownloadSegments, "getDownloadSegments");
async function removeParts(parts) {
  await Promise.all(
    parts.map(
      (part) => Neutralino.filesystem.remove(part.path).catch(() => {
      })
    )
  );
}
__name(removeParts, "removeParts");
function buildWindowsMergeCommand(parts, outPath) {
  const list = parts.map((part) => quoteCommandArgument2(part.path.replace(/\//g, "\\"))).join("+");
  const target = quoteCommandArgument2(outPath.replace(/\//g, "\\"));
  return `cmd /c copy /b /y ${list} ${target}`;
}
__name(buildWindowsMergeCommand, "buildWindowsMergeCommand");
function buildUnixMergeCommand(parts, outPath) {
  const list = parts.map((part) => quoteCommandArgument2(part.path)).join(" ");
  return `cat ${list} > ${quoteCommandArgument2(outPath)}`;
}
__name(buildUnixMergeCommand, "buildUnixMergeCommand");
async function mergeParts(parts, outPath) {
  const command = window.NL_OS === "Windows" ? buildWindowsMergeCommand(parts, outPath) : buildUnixMergeCommand(parts, outPath);
  const result = await Neutralino.os.execCommand(command, {
    background: false
  });
  if (result.exitCode !== 0) {
    throw new Error(
      `Could not merge download parts: ${result.stdErr || result.stdOut || "unknown error"}`
    );
  }
}
__name(mergeParts, "mergeParts");
function getWindowsExtractionCommand(archivePath, destinationPath) {
  return `tar.exe -xf ${quoteCommandArgument2(archivePath)} -C ${quoteCommandArgument2(destinationPath)}`;
}
__name(getWindowsExtractionCommand, "getWindowsExtractionCommand");
function getPowerShellExtractCommand(archivePath, destinationPath) {
  const safeArchive = String(archivePath).replace(/'/g, "''");
  const safeDest = String(destinationPath).replace(/'/g, "''");
  return `powershell -NoProfile -NonInteractive -Command "Expand-Archive -Path '${safeArchive}' -DestinationPath '${safeDest}' -Force"`;
}
__name(getPowerShellExtractCommand, "getPowerShellExtractCommand");
var NESTED_ARCHIVE_PATTERNS = [
  /\.zip$/i,
  /\.tar\.gz$/i,
  /\.tgz$/i,
  /\.tar$/i
];
function isNestedArchive(entryName) {
  return NESTED_ARCHIVE_PATTERNS.some((pattern) => pattern.test(entryName)) || window.NL_OS === "Darwin" && /\.dmg$/i.test(String(entryName));
}
__name(isNestedArchive, "isNestedArchive");
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
__name(collectArchiveFiles, "collectArchiveFiles");
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
  const flags = lower.endsWith(".gz") || lower.endsWith(".tgz") ? "-xzf" : "-xf";
  return `tar ${flags} "${archive}" -C "${dest}"`;
}
__name(getNestedExtractionCommand, "getNestedExtractionCommand");
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
          extractNested: false
        });
        await Neutralino.filesystem.remove(archivePath).catch(() => {
        });
        continue;
      }
      const command = getNestedExtractionCommand(archivePath, parentDir);
      const executeNested = /* @__PURE__ */ __name(async (cmd) => {
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
                  processOutput
                )
              );
          }
        );
      }, "executeNested");
      try {
        await executeNested(command);
        await Neutralino.filesystem.remove(archivePath).catch(() => {
        });
      } catch (error) {
        let recovered = false;
        if (window.NL_OS === "Windows") {
          if (String(error).includes("resolve failed") && !command.includes("--force-local")) {
            try {
              const fallbackCommand = command.includes("tar.exe") ? command.replace("tar.exe -xf", "tar.exe --force-local -xf") : command.replace("tar ", "tar --force-local ");
              await executeNested(fallbackCommand);
              recovered = true;
            } catch (retryError) {
              error = retryError;
            }
          }
          if (!recovered && String(archivePath).toLowerCase().endsWith(".zip")) {
            try {
              await executeNested(
                getPowerShellExtractCommand(archivePath, parentDir)
              );
              recovered = true;
            } catch (psError) {
              error = psError;
            }
          }
        }
        if (recovered) {
          await Neutralino.filesystem.remove(archivePath).catch(() => {
          });
        } else {
          console.warn("Could not extract nested archive:", archivePath, error);
        }
      }
    }
  }
}
__name(extractNestedArchives, "extractNestedArchives");
async function runCurlDownload(command, getTask, onProgress, getProgress) {
  const process = await spawnProcessWithShell(command);
  const task = getTask();
  if (task) task.pid = getOsProcessId(process);
  let processOutput = "";
  let maxPercent = 0;
  const reportProgress = /* @__PURE__ */ __name((percent) => {
    if (Number.isNaN(percent) || percent < maxPercent) return;
    maxPercent = percent;
    onProgress?.("Downloading...", 2 + percent * 0.96);
  }, "reportProgress");
  let isCheckingProgress = false;
  const progressTimer = getProgress ? setInterval(async () => {
    if (isCheckingProgress) return;
    isCheckingProgress = true;
    try {
      reportProgress(await getProgress());
    } catch (error) {
    } finally {
      isCheckingProgress = false;
    }
  }, 180) : null;
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
          if (!matches?.length) return;
          reportProgress(Number.parseFloat(matches[matches.length - 1]));
          return;
        }
        if (event.action !== "exit") return;
        Neutralino.events.off("spawnedProcess", handler);
        if (event.data === 0) resolve();
        else reject(createProcessError("Download", event.data, processOutput));
      }
    );
  } finally {
    if (progressTimer) clearInterval(progressTimer);
  }
}
__name(runCurlDownload, "runCurlDownload");
async function downloadSingleArchive({ url, outPath, getTask, onProgress }) {
  await runCurlDownload(
    `curl -# -L --fail --show-error ${quoteCommandArgument2(url)} -o ${quoteCommandArgument2(outPath)}`,
    getTask,
    onProgress
  );
}
__name(downloadSingleArchive, "downloadSingleArchive");
async function downloadSegmentedArchive({
  url,
  outPath,
  totalBytes,
  getTask,
  onProgress
}) {
  const parts = getDownloadSegments(totalBytes, outPath);
  try {
    await removeParts(parts);
    onProgress?.("Opening parallel download connections...", 2);
    const requests = parts.map(
      (part) => `-L --range ${part.start}-${part.end} -o ${quoteCommandArgument2(part.path)} ${quoteCommandArgument2(url)}`
    ).join(" --next ");
    await runCurlDownload(
      `curl -# --fail --show-error --parallel --parallel-max ${parts.length} ${requests}`,
      getTask,
      onProgress,
      async () => {
        const sizes = await Promise.all(
          parts.map(async (part) => {
            try {
              return (await Neutralino.filesystem.getStats(part.path)).size;
            } catch (error) {
              return 0;
            }
          })
        );
        return sizes.reduce((total, size) => total + size, 0) / totalBytes * 100;
      }
    );
    if (getTask()?.cancelled) throw new Error("Cancelled");
    const partSizes = await Promise.all(
      parts.map(async (part) => {
        try {
          return (await Neutralino.filesystem.getStats(part.path)).size;
        } catch (error) {
          return 0;
        }
      })
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
__name(downloadSegmentedArchive, "downloadSegmentedArchive");
async function downloadArchive({
  url,
  outPath,
  getTask,
  onProgress,
  sourceType
}) {
  if (!String(url || "").trim()) {
    throw new Error("This download does not have a valid link");
  }
  if (!String(outPath || "").trim()) {
    throw new Error("WeekBox could not prepare the download destination");
  }
  if (sourceType === "external") {
    onProgress?.("Preparing external download...", 2);
    url = await resolveExternalDownloadUrl(
      url,
      (...args) => Neutralino.os.execCommand(...args)
    );
  }
  const useMultithreadDownloads = appSettings.get("multithreadDownloads");
  let remoteFileSize = 0;
  if (useMultithreadDownloads) {
    try {
      onProgress?.("Checking download server...", 2);
      remoteFileSize = await getRangeSupportedFileSize(
        url,
        (...args) => Neutralino.os.execCommand(...args)
      );
    } catch (error) {
      if (getTask()?.cancelled) throw error;
    }
  }
  if (useMultithreadDownloads && remoteFileSize >= MIN_SEGMENTED_DOWNLOAD_BYTES) {
    try {
      await downloadSegmentedArchive({
        url,
        outPath,
        totalBytes: remoteFileSize,
        getTask,
        onProgress
      });
    } catch (error) {
      if (getTask()?.cancelled) throw error;
      await Neutralino.filesystem.remove(outPath).catch(() => {
      });
      onProgress?.("Retrying download...", 2);
      await downloadSingleArchive({ url, outPath, getTask, onProgress });
    }
    return;
  }
  await downloadSingleArchive({ url, outPath, getTask, onProgress });
}
__name(downloadArchive, "downloadArchive");
async function extractArchive({
  archivePath,
  destinationPath,
  getTask,
  onEntry,
  extractNested = false
}) {
  const reportEntry = createThrottledEntryReporter(onEntry);
  const isDiskImage = window.NL_OS === "Darwin" && /\.dmg$/i.test(String(archivePath));
  if (isDiskImage) {
    const mountPath = `${destinationPath}/.weekbox-dmg-${Date.now()}`;
    let attached = false;
    let processOutput = "";
    try {
      await Neutralino.filesystem.createDirectory(mountPath);
      const process = await spawnProcessWithShell(
        `hdiutil attach -nobrowse -readonly -mountpoint ${quoteCommandArgument2(mountPath)} ${quoteCommandArgument2(archivePath)}`
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
                processOutput
              )
            );
        }
      );
      attached = true;
      const entries = await Neutralino.filesystem.readDirectory(mountPath);
      const app = entries.find(
        (entry) => entry.type === "DIRECTORY" && /\.app$/i.test(String(entry.entry))
      );
      if (!app) {
        throw new Error("The disk image does not contain a macOS application");
      }
      onEntry?.(app.entry);
      await Neutralino.filesystem.copy(
        `${mountPath}/${app.entry}`,
        `${destinationPath}/${app.entry}`,
        { recursive: true, overwrite: false }
      );
    } finally {
      if (attached) {
        const result = await Neutralino.os.execCommand(
          `hdiutil detach ${quoteCommandArgument2(mountPath)}`,
          { background: false }
        );
        if (result.exitCode !== 0) {
          console.warn("Could not detach WeekBox disk image:", result.stdErr);
        }
      }
      await Neutralino.filesystem.remove(mountPath).catch(() => {
      });
    }
    return;
  }
  const isWindows = window.NL_OS === "Windows";
  const archiveFormat = await detectArchiveFormat(archivePath);
  let portable7z = null;
  if (archiveFormat === "rar" || archiveFormat === "7z") {
    const binNames = isWindows ? ["7z.exe", "7za.exe"] : window.NL_OS === "Darwin" ? ["7zz-mac", "7za-mac", "7zz"] : ["7zz-linux", "7za-linux", "7zzs", "7zz"];
    for (const binName of binNames) {
      const binPath = `${window.NL_CWD}/app/assets/bin/${binName}`;
      try {
        if ((await Neutralino.filesystem.getStats(binPath)).isFile) {
          portable7z = binPath;
          break;
        }
      } catch {
      }
    }
  }
  const command = portable7z ? `${quoteCommandArgument2(portable7z)} x -y -aoa -o${quoteCommandArgument2(destinationPath)} ${quoteCommandArgument2(archivePath)}` : isWindows ? getWindowsExtractionCommand(archivePath, destinationPath) : archiveFormat === "tar" || archiveFormat === "gzip" ? `tar -xf ${quoteCommandArgument2(archivePath)} -C ${quoteCommandArgument2(destinationPath)}` : archiveFormat === "rar" || archiveFormat === "7z" ? window.NL_OS === "Darwin" ? `tar -xf ${quoteCommandArgument2(archivePath)} -C ${quoteCommandArgument2(destinationPath)}` : `7z x -y -aoa -o${quoteCommandArgument2(destinationPath)} ${quoteCommandArgument2(archivePath)}` : `unzip -oq ${quoteCommandArgument2(archivePath)} -d ${quoteCommandArgument2(destinationPath)}`;
  const execute = /* @__PURE__ */ __name(async (cmd) => {
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
        if (event.data === 0 || !isWindows && isNonFatalUnzipFilenameWarning(event.data, processOutput))
          resolve();
        else
          reject(createProcessError("Extraction", event.data, processOutput));
      }
    );
  }, "execute");
  try {
    await execute(command);
  } catch (error) {
    let recovered = false;
    if (isWindows) {
      if (await hasExtractedPayload(destinationPath)) recovered = true;
      if (!recovered && String(error).includes("resolve failed") && !command.includes("--force-local")) {
        try {
          await execute(
            command.replace("tar.exe -xf", "tar.exe --force-local -xf")
          );
          recovered = true;
        } catch (retryError) {
          error = retryError;
        }
      }
      if (!recovered && String(archivePath).toLowerCase().endsWith(".zip")) {
        try {
          await execute(
            getPowerShellExtractCommand(archivePath, destinationPath)
          );
          recovered = true;
        } catch (psError) {
          error = psError;
        }
      }
    } else if (archiveFormat === "unknown" || archiveFormat === "zip") {
      const fallbackCommands = [
        `tar -xf ${quoteCommandArgument2(archivePath)} -C ${quoteCommandArgument2(destinationPath)}`
      ];
      if (window.NL_OS !== "Darwin") {
        fallbackCommands.push(
          `7z x -y -aoa -o${quoteCommandArgument2(destinationPath)} ${quoteCommandArgument2(archivePath)}`
        );
      }
      for (const fallbackCommand of fallbackCommands) {
        try {
          await execute(fallbackCommand);
          recovered = true;
          break;
        } catch {
        }
      }
    }
    if (!recovered && window.NL_OS === "Darwin" && (archiveFormat === "rar" || archiveFormat === "7z")) {
      throw new Error(
        `This ${archiveFormat.toUpperCase()} download cannot be unpacked by this version of macOS. Ask the mod author for a ZIP download.`
      );
    }
    if (!recovered) throw error;
  }
  if (extractNested) {
    await extractNestedArchives(destinationPath, getTask, onEntry);
  }
}
__name(extractArchive, "extractArchive");

// app/src/ui/utils/filesystem/APIneuFileSystem.js
var APIneuFileSystem = {
  /**
   * Comprueba si un archivo o directorio existe.
   */
  async exists(path) {
    try {
      await Neutralino.filesystem.getStats(path);
      return true;
    } catch (error) {
      return false;
    }
  },
  /**
   * Asegura que un directorio exista. Si no existe, lo crea.
   */
  async ensureDir(path) {
    const exists = await this.exists(path);
    if (!exists) {
      try {
        await Neutralino.filesystem.createDirectory(path);
      } catch (error) {
        console.warn(
          `No se pudo crear el directorio (puede que el padre no exista): ${path}`,
          error
        );
      }
    }
    if (!await this.exists(path)) {
      throw new Error(`Directory was not created: ${path}`);
    }
  },
  /**
   * Escribe datos en un archivo. Reemplaza el archivo si ya existe.
   */
  async write(path, data, isBinary = false) {
    if (isBinary) {
      await Neutralino.filesystem.writeBinaryFile(path, data);
    } else {
      await Neutralino.filesystem.writeFile(path, data);
    }
  },
  /**
   * Agrega datos al final de un archivo existente.
   */
  async append(path, data, isBinary = false) {
    if (isBinary) {
      await Neutralino.filesystem.appendBinaryFile(path, data);
    } else {
      await Neutralino.filesystem.appendFile(path, data);
    }
  },
  /**
   * Lee el contenido de un archivo.
   */
  async read(path, isBinary = false) {
    if (isBinary) {
      return await Neutralino.filesystem.readBinaryFile(path);
    } else {
      return await Neutralino.filesystem.readFile(path);
    }
  },
  /**
   * Borra un archivo o directorio.
   */
  async remove(path) {
    const exists = await this.exists(path);
    if (exists) {
      await Neutralino.filesystem.remove(path);
    }
  }
};

// app/src/ui/utils/filesystem.js
import {
  getEngineLaunchBehavior,
  getEngineModLaunchArgs,
  ENGINE_DETAILS as ENGINE_DETAILS2
} from "../../backend/config/engines.js";

// app/src/ui/utils/filesystem/pathUtils.js
function sanitizePathSegment(value) {
  return String(value || "").replace(/[<>:"/\\|?*]+/g, "").trim();
}
__name(sanitizePathSegment, "sanitizePathSegment");
function sanitizeModFolderName(value, fallback = "Mod") {
  const asciiName = sanitizePathSegment(value).normalize("NFKD").replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, " ").trim();
  return asciiName || fallback;
}
__name(sanitizeModFolderName, "sanitizeModFolderName");
function getParentPath(path) {
  return path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")));
}
__name(getParentPath, "getParentPath");
function getRealEntries(entries) {
  return entries.filter((entry) => entry.entry !== "." && entry.entry !== "..");
}
__name(getRealEntries, "getRealEntries");
function getModFolderName(mod) {
  return mod.folderName || sanitizePathSegment(mod.name);
}
__name(getModFolderName, "getModFolderName");
function getEngineModFolderName(mod) {
  return mod.engineFolderName || getModFolderName(mod);
}
__name(getEngineModFolderName, "getEngineModFolderName");

// app/src/ui/utils/filesystem/executableService.js
function describeFileSystemError(error) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    return error.message || error.description || error.code || JSON.stringify(error);
  }
  return String(error || "Unknown filesystem error");
}
__name(describeFileSystemError, "describeFileSystemError");
function getBundleExecutableName(infoPlist) {
  const match = String(infoPlist).match(
    /<key>\s*CFBundleExecutable\s*<\/key>\s*<string>\s*([^<]+?)\s*<\/string>/i
  );
  return match?.[1]?.trim() || "";
}
__name(getBundleExecutableName, "getBundleExecutableName");
var _ExecutableService = class _ExecutableService {
  async find(dir) {
    this.lastError = null;
    const isWindows = window.NL_OS === "Windows";
    const isMacOS = window.NL_OS === "Darwin";
    const directories = [dir];
    while (directories.length > 0) {
      const currentDir = directories.pop();
      try {
        const entries = getRealEntries(
          await Neutralino.filesystem.readDirectory(currentDir)
        );
        for (const entry of entries) {
          const fullPath = `${currentDir}/${entry.entry}`;
          if (String(entry.type).toUpperCase() === "DIRECTORY") {
            if (isMacOS && /\.app$/i.test(entry.entry)) {
              const macOSDirectory = `${fullPath}/Contents/MacOS`;
              try {
                const appEntries = getRealEntries(
                  await Neutralino.filesystem.readDirectory(macOSDirectory)
                );
                const bundleExecutable = getBundleExecutableName(
                  await Neutralino.filesystem.readFile(
                    `${fullPath}/Contents/Info.plist`
                  )
                );
                const executable = appEntries.find(
                  (appEntry) => String(appEntry.type).toUpperCase() === "FILE" && appEntry.entry === bundleExecutable
                );
                if (executable) return `${macOSDirectory}/${executable.entry}`;
                const fallback = appEntries.find(
                  (appEntry) => String(appEntry.type).toUpperCase() === "FILE" && !appEntry.entry.includes(".")
                );
                if (fallback) return `${macOSDirectory}/${fallback.entry}`;
              } catch (error) {
                this.lastError = describeFileSystemError(error);
              }
            }
            directories.push(fullPath);
            continue;
          }
          if (entry.entry.toLowerCase().endsWith(".exe") || !isWindows && !entry.entry.includes(".") && entry.entry !== "CodeResources") {
            return fullPath;
          }
        }
      } catch (error) {
        this.lastError = describeFileSystemError(error);
        console.warn(
          "Could not inspect engine directory:",
          currentDir,
          this.lastError
        );
      }
    }
    if (isWindows) {
      try {
        const result = await Neutralino.os.execCommand(
          `where.exe /r "${dir.replace(/\//g, "\\")}" *.exe`,
          { background: false }
        );
        if (result.exitCode === 0) {
          return (result.stdOut || "").split(/\r?\n/).map((path) => path.trim()).find(Boolean) || null;
        }
      } catch (error) {
        console.warn("Could not search for a Windows executable:", dir, error);
      }
    }
    return null;
  }
  getLastError() {
    return this.lastError;
  }
  getDirectory(executablePath) {
    return getParentPath(executablePath);
  }
  async getIconDataUrl(executablePath) {
    try {
      const executableDir = this.getDirectory(executablePath);
      const entries = await Neutralino.filesystem.readDirectory(executableDir);
      const iconMimeTypes = {
        ".ico": "image/x-icon",
        ".icns": "image/x-icns",
        ".png": "image/png",
        ".svg": "image/svg+xml"
      };
      const icon = entries.find((entry) => {
        const extension2 = entry.entry.slice(entry.entry.lastIndexOf(".")).toLowerCase();
        return entry.type === "FILE" && extension2 in iconMimeTypes;
      });
      if (!icon) return "";
      const data = await Neutralino.filesystem.readBinaryFile(
        `${executableDir}/${icon.entry}`
      );
      const bytes = new Uint8Array(data);
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const extension = icon.entry.slice(icon.entry.lastIndexOf(".")).toLowerCase();
      return `data:${iconMimeTypes[extension]};base64,${window.btoa(binary)}`;
    } catch (error) {
      return "";
    }
  }
};
__name(_ExecutableService, "ExecutableService");
var ExecutableService = _ExecutableService;

// app/src/ui/utils/filesystem/modInjectionService.js
function sameId(left, right) {
  return String(left) === String(right);
}
__name(sameId, "sameId");
function supportsEngineVersion(mod, version) {
  return !mod.engineVersion || mod.engineVersion === version;
}
__name(supportsEngineVersion, "supportsEngineVersion");
function usesAddonsDirectory(mod, engineId) {
  return engineId === "codename" && mod.kind === "dependency";
}
__name(usesAddonsDirectory, "usesAddonsDirectory");
var _ModInjectionService = class _ModInjectionService {
  constructor({
    api,
    executables,
    modRepository,
    getEnginesPath,
    getModsPath
  }) {
    this.api = api;
    this.executables = executables;
    this.modRepository = modRepository;
    this.getEnginesPath = getEnginesPath;
    this.getModsPath = getModsPath;
  }
  getLegacyModsPath(engineId, version) {
    return `${this.getEnginesPath()}/${engineId}/${version}/mods`;
  }
  getLegacyAddonsPath(engineId, version) {
    return `${this.getEnginesPath()}/${engineId}/${version}/addons`;
  }
  async getEngineContentPath(engineId, version, directoryName) {
    const legacyPath = `${this.getEnginesPath()}/${engineId}/${version}/${directoryName}`;
    if (window.NL_OS !== "Darwin") return legacyPath;
    const executablePath = await this.executables.find(
      `${this.getEnginesPath()}/${engineId}/${version}`
    );
    const normalizedPath = String(executablePath || "").replace(/\\/g, "/");
    const bundleMatch = normalizedPath.match(/^(.+?\.app)(?:\/|$)/i);
    return bundleMatch ? `${bundleMatch[1]}/Contents/Resources/${directoryName}` : legacyPath;
  }
  async getEngineModsPath(engineId, version) {
    return this.getEngineContentPath(engineId, version, "mods");
  }
  async getEngineAddonsPath(engineId, version) {
    return this.getEngineContentPath(engineId, version, "addons");
  }
  async migrateLegacyEngineMods(engineId, version) {
    if (window.NL_OS !== "Darwin") return;
    const legacyModsPath = this.getLegacyModsPath(engineId, version);
    const bundleModsPath = await this.getEngineModsPath(engineId, version);
    if (bundleModsPath === legacyModsPath || !await this.api.exists(legacyModsPath)) {
      return;
    }
    await this.api.ensureDir(bundleModsPath);
    const entries = await Neutralino.filesystem.readDirectory(legacyModsPath).catch(() => []);
    for (const entry of entries.filter(
      (item) => item.entry !== "." && item.entry !== ".."
    )) {
      const sourcePath = `${legacyModsPath}/${entry.entry}`;
      const destinationPath = `${bundleModsPath}/${entry.entry}`;
      if (await this.api.exists(destinationPath)) continue;
      try {
        await Neutralino.filesystem.move(sourcePath, destinationPath);
      } catch (error) {
        console.warn("Could not migrate macOS engine mod:", sourcePath, error);
      }
    }
  }
  async migrateLegacyEngineModsFor(engines) {
    if (window.NL_OS !== "Darwin") return;
    await Promise.all(
      engines.map(
        (engine) => this.migrateLegacyEngineMods(engine.id, engine.version)
      )
    );
  }
  async link(mod, engineId, version) {
    const folderName = getModFolderName(mod);
    const sourcePath = `${this.getModsPath()}/${folderName}`;
    await this.migrateLegacyEngineMods(engineId, version);
    const modsPath = usesAddonsDirectory(mod, engineId) ? await this.getEngineAddonsPath(engineId, version) : await this.getEngineModsPath(engineId, version);
    const engineFolderName = getEngineModFolderName(mod);
    const linkPath = `${modsPath}/${engineFolderName}`;
    if (!await this.api.exists(sourcePath)) {
      throw new Error(`Mod files not found for ${mod.name}`);
    }
    await this.api.ensureDir(modsPath);
    if (await this.api.exists(linkPath)) {
      const conflicts = (await this.modRepository.getAll()).filter(
        (otherMod) => !sameId(otherMod.id, mod.id) && otherMod.engineId === engineId && !otherMod.hidden && usesAddonsDirectory(otherMod, engineId) === usesAddonsDirectory(mod, engineId) && getEngineModFolderName(otherMod) === engineFolderName
      );
      if (conflicts.length) {
        throw new Error(
          `Engine folder conflict: ${engineFolderName} is already used by ${conflicts[0].name}. Remove or hide it before launching ${mod.name}.`
        );
      }
      return { linked: false, path: linkPath };
    }
    const command = window.NL_OS === "Windows" ? `cmd /c mklink /J "${linkPath}" "${sourcePath}"` : `ln -s "${sourcePath}" "${linkPath}"`;
    const result = await Neutralino.os.execCommand(command, {
      background: false
    });
    if (result.exitCode !== 0) {
      throw new Error(result.stdErr || `Could not inject ${mod.name}`);
    }
    return { linked: true, path: linkPath };
  }
  async injectOne(modId, engineId, version) {
    const mod = (await this.modRepository.getAll()).find(
      (item) => sameId(item.id, modId)
    );
    if (!mod || mod.hidden || !supportsEngineVersion(mod, version)) return;
    return this.link(mod, engineId, version);
  }
  async injectForEngine(engineId, version) {
    const mods = (await this.modRepository.getAll()).filter(
      (mod) => mod.engineId === engineId && !mod.hidden && supportsEngineVersion(mod, version)
    );
    return Promise.allSettled(
      mods.map((mod) => this.link(mod, engineId, version))
    );
  }
  async injectIntoInstalledEngines(modId, engines) {
    const mod = (await this.modRepository.getAll()).find(
      (item) => sameId(item.id, modId)
    );
    if (!mod?.engineId || mod.hidden) return [];
    return Promise.allSettled(
      engines.filter(
        (engine) => engine.id === mod.engineId && supportsEngineVersion(mod, engine.version)
      ).map((engine) => this.link(mod, engine.id, engine.version))
    );
  }
  async unlinkFromEngine(mod, engineId, version) {
    const legacyModsPath = this.getLegacyModsPath(engineId, version);
    const bundleModsPath = await this.getEngineModsPath(engineId, version);
    const enginePaths = [bundleModsPath, legacyModsPath];
    if (engineId === "codename") {
      enginePaths.push(
        await this.getEngineAddonsPath(engineId, version),
        this.getLegacyAddonsPath(engineId, version)
      );
    }
    const paths = [...new Set(enginePaths)].map(
      (modsPath) => `${modsPath}/${getEngineModFolderName(mod)}`
    );
    let removed = false;
    for (const linkPath of paths) {
      if (!await this.api.exists(linkPath)) continue;
      const command = window.NL_OS === "Windows" ? `cmd /c rmdir "${linkPath.replace(/\//g, "\\")}"` : window.NL_OS === "Darwin" ? `rm -f "${linkPath}"` : `rm -rf "${linkPath}"`;
      const result = await Neutralino.os.execCommand(command, {
        background: false
      });
      if (result.exitCode !== 0) {
        throw new Error(
          result.stdErr || `Could not remove mod link for ${mod.name}`
        );
      }
      removed = true;
    }
    return removed;
  }
  async unlinkFromInstalledEngines(mod, engines) {
    return Promise.allSettled(
      engines.map(
        (engine) => this.unlinkFromEngine(mod, engine.id, engine.version)
      )
    );
  }
  async cleanup(engineId, version) {
    const legacyModsPath = this.getLegacyModsPath(engineId, version);
    const bundleModsPath = await this.getEngineModsPath(engineId, version);
    const enginePaths = [bundleModsPath, legacyModsPath];
    if (engineId === "codename") {
      enginePaths.push(
        await this.getEngineAddonsPath(engineId, version),
        this.getLegacyAddonsPath(engineId, version)
      );
    }
    for (const modsPath of new Set(enginePaths)) {
      if (!await this.api.exists(modsPath)) continue;
      try {
        const entries = await Neutralino.filesystem.readDirectory(modsPath);
        for (const entry of entries.filter(
          (item) => item.entry !== "." && item.entry !== ".."
        )) {
          const linkPath = `${modsPath}/${entry.entry}`;
          const command = window.NL_OS === "Windows" ? `cmd /c rmdir "${linkPath.replace(/\//g, "\\")}"` : window.NL_OS === "Darwin" ? `rm -f "${linkPath}"` : `rm -rf "${linkPath}"`;
          await Neutralino.os.execCommand(command, { background: false }).catch(() => {
          });
        }
      } catch (error) {
        console.warn("Could not clean up mods shortcuts", error);
      }
    }
  }
};
__name(_ModInjectionService, "ModInjectionService");
var ModInjectionService = _ModInjectionService;

// app/src/ui/utils/filesystem/libraryMaintenanceService.js
import { ENGINE_DETAILS } from "../../backend/config/engines.js";

// app/src/ui/utils/filesystem/engineVersion.js
var ENGINE_VERSION_PATTERN = /^(?:Latest|Nightly|[a-z]+-\d{1,4}|v?\d{1,4}\.\d{1,4}(?:\.\d{1,4})?(?:[a-z][a-z0-9.-]*|[-+][0-9a-z][0-9a-z.-]*)?|\d{1,3}\.\d{1,3}\.\d{2}\.\d{2}\.\d{2})$/i;
function isValidEngineVersion(version) {
  return ENGINE_VERSION_PATTERN.test(String(version || ""));
}
__name(isValidEngineVersion, "isValidEngineVersion");

// app/src/ui/utils/filesystem/libraryMaintenanceService.js
function sameId2(left, right) {
  return String(left) === String(right);
}
__name(sameId2, "sameId");
function getStableUrlId(url) {
  let hash = 5381;
  for (const char of String(url)) hash = hash * 33 ^ char.charCodeAt(0);
  return (hash >>> 0).toString(36);
}
__name(getStableUrlId, "getStableUrlId");
function getImportedPsychOnlineMetadata(folderName, downloadUrl) {
  const parsed = new URL(downloadUrl);
  const isSniro = parsed.hostname.toLowerCase() === "funkin.sniro.boo";
  const sourceId = isSniro ? parsed.pathname.match(/^\/mod\/([^/]+)\/dl\//)?.[1] : null;
  return {
    id: sourceId ? `sniro:${sourceId}` : `psychonline:${getStableUrlId(downloadUrl)}`,
    name: folderName,
    engineId: "psychonline",
    engineLocked: true,
    source: isSniro ? "sniro" : "gamebanana",
    sourceUrl: isSniro ? "https://funkin.sniro.boo/mods" : downloadUrl,
    downloadUrl,
    folderName
  };
}
__name(getImportedPsychOnlineMetadata, "getImportedPsychOnlineMetadata");
var _LibraryMaintenanceService = class _LibraryMaintenanceService {
  constructor({
    api,
    mods,
    injection,
    getEnginesPath,
    getEngineModsPath,
    getModsPath,
    getInstalledEngines,
    isEngineRunning,
    findExecutable
  }) {
    Object.assign(this, {
      api,
      mods,
      injection,
      getEnginesPath,
      getEngineModsPath,
      getModsPath,
      getInstalledEngines,
      isEngineRunning,
      findExecutable
    });
  }
  async cleanupHiddenModLinks(installedEngines = null) {
    const hiddenMods = (await this.mods.getAll()).filter((mod) => mod.hidden);
    if (!hiddenMods.length) return;
    const engines = installedEngines || await this.getInstalledEngines();
    await Promise.all(
      hiddenMods.map(
        (mod) => this.injection.unlinkFromInstalledEngines(mod, engines)
      )
    );
  }
  async importPsychOnlineEngineMods(installedEngines = null) {
    const engines = installedEngines || await this.getInstalledEngines();
    const installedMods = await this.mods.getAll();
    for (const engine of engines.filter((item) => item.id === "psychonline")) {
      if (this.isEngineRunning(engine.id, engine.version)) continue;
      const engineModsPath = await this.getEngineModsPath(
        engine.id,
        engine.version
      );
      let entries;
      try {
        entries = getRealEntries(
          await Neutralino.filesystem.readDirectory(engineModsPath)
        );
      } catch {
        continue;
      }
      for (const entry of entries.filter((item) => item.type === "DIRECTORY")) {
        const folderName = sanitizePathSegment(entry.entry);
        if (!folderName) continue;
        const existing = installedMods.find(
          (mod) => getModFolderName(mod) === folderName
        );
        if (existing) {
          if (!existing.hidden)
            await this.injection.link(existing, engine.id, engine.version);
          continue;
        }
        const sourcePath = `${engineModsPath}/${entry.entry}`;
        const urlPath = `${sourcePath}/mod_url.txt`;
        if (!await this.api.exists(urlPath)) continue;
        const downloadUrl = (await this.api.read(urlPath)).trim();
        if (!/^https?:\/\//i.test(downloadUrl)) continue;
        const destinationPath = `${this.getModsPath()}/${folderName}`;
        if (await this.api.exists(destinationPath)) continue;
        let metadata;
        try {
          metadata = getImportedPsychOnlineMetadata(folderName, downloadUrl);
        } catch {
          continue;
        }
        if (installedMods.some((mod) => sameId2(mod.id, metadata.id))) continue;
        await Neutralino.filesystem.move(sourcePath, destinationPath);
        await this.mods.add(metadata.id, metadata.name, metadata);
        installedMods.push({ ...metadata, hidden: false });
        await this.injection.link(metadata, engine.id, engine.version);
      }
    }
  }
  async cleanupIncompleteDownloads() {
    try {
      const cleanupTemporaryArchives = /* @__PURE__ */ __name(async (path) => {
        const entries = getRealEntries(
          await Neutralino.filesystem.readDirectory(path)
        );
        await Promise.all(
          entries.filter(
            (entry) => entry.type === "FILE" && /^temp_.+\.(?:zip|dmg)(?:\.part-\d+)?$/i.test(entry.entry)
          ).map(
            (entry) => this.api.remove(`${path}/${entry.entry}`).catch(() => {
            })
          )
        );
      }, "cleanupTemporaryArchives");
      const enginesPath = this.getEnginesPath();
      const modsPath = this.getModsPath();
      await cleanupTemporaryArchives(modsPath);
      const modFolders = getRealEntries(
        await Neutralino.filesystem.readDirectory(modsPath)
      );
      await Promise.all(
        modFolders.filter((entry) => entry.type === "DIRECTORY").map(async (entry) => {
          const modPath = `${modsPath}/${entry.entry}`;
          if (await this.api.exists(`${modPath}/.downloading`)) {
            await this.api.remove(modPath);
          }
        })
      );
      await cleanupTemporaryArchives(enginesPath);
      const engines = await Neutralino.filesystem.readDirectory(enginesPath);
      for (const engine of getRealEntries(engines)) {
        if (engine.type !== "DIRECTORY") continue;
        const versions = await Neutralino.filesystem.readDirectory(
          `${enginesPath}/${engine.entry}`
        );
        for (const version of getRealEntries(versions)) {
          if (version.type !== "DIRECTORY") continue;
          const versionPath = `${enginesPath}/${engine.entry}/${version.entry}`;
          if (!await this.api.exists(`${versionPath}/.downloading`)) continue;
          const command = window.NL_OS === "Windows" ? `rmdir /S /Q "${versionPath.replace(/\//g, "\\")}"` : `rm -rf "${versionPath}"`;
          await Neutralino.os.execCommand(command, { background: true }).catch(() => {
          });
        }
      }
    } catch (error) {
      console.warn("Could not clean up incomplete downloads", error);
    }
  }
  async cleanupInvalidEngineInstallations() {
    try {
      const enginesPath = this.getEnginesPath();
      const engineRoots = getRealEntries(
        await Neutralino.filesystem.readDirectory(enginesPath)
      );
      for (const engineRoot of engineRoots) {
        if (engineRoot.type !== "DIRECTORY") continue;
        const rootPath = `${enginesPath}/${engineRoot.entry}`;
        if (!ENGINE_DETAILS[engineRoot.entry]) {
          await this.api.remove(rootPath);
          continue;
        }
        let hasValidInstallation = false;
        const versions = getRealEntries(
          await Neutralino.filesystem.readDirectory(rootPath)
        );
        for (const version of versions) {
          if (version.type !== "DIRECTORY") continue;
          const versionPath = `${rootPath}/${version.entry}`;
          const isInstalled = isValidEngineVersion(version.entry) && (engineRoot.entry !== "psychonline" || version.entry === "Latest") && !await this.api.exists(`${versionPath}/.downloading`) && Boolean(await this.findExecutable(versionPath));
          if (isInstalled) {
            hasValidInstallation = true;
            continue;
          }
          await this.api.remove(versionPath);
        }
        if (!hasValidInstallation) await this.api.remove(rootPath);
      }
    } catch (error) {
      console.warn("Could not clean up invalid engine installations", error);
    }
  }
  async hasModFiles(mod) {
    const folderName = getModFolderName(mod);
    if (!folderName || /[\\/]/.test(folderName)) return false;
    const hasFilesIn = /* @__PURE__ */ __name(async (path) => {
      const entries = getRealEntries(
        await Neutralino.filesystem.readDirectory(path)
      );
      for (const entry of entries) {
        if (entry.entry === ".downloading") continue;
        if (entry.type === "FILE") return true;
        if (entry.type === "DIRECTORY" && await hasFilesIn(`${path}/${entry.entry}`))
          return true;
      }
      return false;
    }, "hasFilesIn");
    try {
      return await hasFilesIn(`${this.getModsPath()}/${folderName}`);
    } catch {
      return false;
    }
  }
  async cleanupInvalidInstalledMods() {
    for (const mod of await this.mods.getAll()) {
      if (await this.hasModFiles(mod)) continue;
      const folderName = getModFolderName(mod);
      if (folderName && !/[\\/]/.test(folderName)) {
        await this.api.remove(`${this.getModsPath()}/${folderName}`).catch(() => {
        });
      }
      await this.mods.remove(mod.id);
    }
  }
};
__name(_LibraryMaintenanceService, "LibraryMaintenanceService");
var LibraryMaintenanceService = _LibraryMaintenanceService;

// app/src/ui/utils/filesystem/modRepository.js
function sameId3(left, right) {
  return String(left) === String(right);
}
__name(sameId3, "sameId");
var _ModRepository = class _ModRepository {
  constructor({ api, getDataPath }) {
    this.api = api;
    this.getDataPath = getDataPath;
  }
  get filePath() {
    return `${this.getDataPath()}/installedmods.json`;
  }
  async getAll() {
    if (!await this.api.exists(this.filePath)) return [];
    try {
      const mods = JSON.parse(await this.api.read(this.filePath));
      return Array.isArray(mods) ? mods : [];
    } catch (error) {
      return [];
    }
  }
  async saveAll(mods) {
    await this.api.write(this.filePath, JSON.stringify(mods, null, 2));
  }
  async add(modId, modName, metadata = {}) {
    const mods = await this.getAll();
    if (mods.some((mod) => sameId3(mod.id, modId))) return;
    mods.push({ name: modName, id: modId, hidden: false, ...metadata });
    await this.saveAll(mods);
  }
  async setHidden(modId, hidden) {
    const mods = await this.getAll();
    const mod = mods.find((item) => sameId3(item.id, modId));
    if (!mod) return null;
    mod.hidden = Boolean(hidden);
    await this.saveAll(mods);
    return mod;
  }
  async setEngineVersion(modId, engineVersion) {
    const mods = await this.getAll();
    const mod = mods.find((item) => sameId3(item.id, modId));
    if (!mod) return null;
    mod.engineVersion = engineVersion || null;
    await this.saveAll(mods);
    return mod;
  }
  async setEngineCompatibility(modId, engineId, engineVersion) {
    const mods = await this.getAll();
    const mod = mods.find((item) => sameId3(item.id, modId));
    if (!mod) return null;
    mod.engineId = engineId || null;
    mod.engineVersion = engineId ? engineVersion || null : null;
    await this.saveAll(mods);
    return mod;
  }
  async moveToDependencies(modId) {
    const mods = await this.getAll();
    const mod = mods.find((item) => sameId3(item.id, modId));
    if (!mod) return null;
    for (const dependencyId of mod.dependencies || []) {
      const dependency = mods.find((item) => sameId3(item.id, dependencyId));
      if (!dependency) continue;
      dependency.consumers = (dependency.consumers || []).filter(
        (consumerId) => !sameId3(consumerId, modId)
      );
    }
    mod.kind = "dependency";
    delete mod.dependencies;
    await this.saveAll(mods);
    return mod;
  }
  async moveToMods(modId) {
    const mods = await this.getAll();
    const mod = mods.find((item) => sameId3(item.id, modId));
    if (!mod) return null;
    delete mod.kind;
    delete mod.consumers;
    await this.saveAll(mods);
    return mod;
  }
  async updateAppearance(modId, { name, coverPath } = {}) {
    const mods = await this.getAll();
    const mod = mods.find((item) => sameId3(item.id, modId));
    if (!mod) return null;
    if (typeof name === "string" && name.trim()) mod.name = name.trim();
    if (coverPath !== void 0) {
      mod.coverPath = coverPath || null;
      delete mod.image;
      delete mod.imageBase64;
    }
    await this.saveAll(mods);
    return mod;
  }
  async addDependencyConsumer(dependencyId, consumerId) {
    const mods = await this.getAll();
    const dependency = mods.find((mod) => sameId3(mod.id, dependencyId));
    if (!dependency) return null;
    const consumers = new Set(dependency.consumers || []);
    consumers.add(consumerId);
    dependency.consumers = [...consumers];
    await this.saveAll(mods);
    return dependency;
  }
  async removeDependencyConsumer(dependencyId, consumerId) {
    const mods = await this.getAll();
    const dependency = mods.find((mod) => sameId3(mod.id, dependencyId));
    if (!dependency) return null;
    dependency.consumers = (dependency.consumers || []).filter(
      (id) => !sameId3(id, consumerId)
    );
    await this.saveAll(mods);
    return dependency;
  }
  async remove(modId) {
    if (!await this.api.exists(this.filePath)) return;
    const mods = await this.getAll();
    const remainingMods = mods.filter((mod) => !sameId3(mod.id, modId));
    if (remainingMods.length !== mods.length) await this.saveAll(remainingMods);
  }
  async has(modId) {
    return (await this.getAll()).some((mod) => sameId3(mod.id, modId));
  }
};
__name(_ModRepository, "ModRepository");
var ModRepository = _ModRepository;

// app/src/ui/utils/filesystem/modCoverService.js
function safeCoverName(modId) {
  return encodeURIComponent(String(modId)).replaceAll("%", "_");
}
__name(safeCoverName, "safeCoverName");
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(blob);
  });
}
__name(blobToDataUrl, "blobToDataUrl");
var _ModCoverService = class _ModCoverService {
  constructor({ api, getDataPath }) {
    this.api = api;
    this.getDataPath = getDataPath;
  }
  get coversPath() {
    return `${this.getDataPath()}/mod-covers`;
  }
  getCoverPath(modId) {
    return `${this.coversPath}/${safeCoverName(modId)}.webp`;
  }
  async read(modId) {
    const path = this.getCoverPath(modId);
    if (!await this.api.exists(path)) return null;
    const bytes = await this.api.read(path, true);
    return blobToDataUrl(new Blob([bytes], { type: "image/webp" }));
  }
  async optimize(blob) {
    if (typeof document === "undefined") return blob;
    const sourceUrl = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = sourceUrl;
      await image.decode();
      const maxWidth = 960;
      const scale = Math.min(1, maxWidth / image.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      return await new Promise(
        (resolve) => canvas.toBlob((result) => resolve(result || blob), "image/webp", 0.84)
      );
    } catch {
      return blob;
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }
  async saveBlob(modId, blob) {
    await this.api.ensureDir(this.coversPath);
    const optimized = await this.optimize(blob);
    await this.api.write(
      this.getCoverPath(modId),
      await optimized.arrayBuffer(),
      true
    );
    return `mod-covers/${safeCoverName(modId)}.webp`;
  }
  async saveDataUrl(modId, dataUrl) {
    if (!dataUrl) return null;
    return this.saveBlob(modId, await (await fetch(dataUrl)).blob());
  }
  async saveUrl(modId, url) {
    if (!url) return null;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not download the mod cover");
    return this.saveBlob(modId, await response.blob());
  }
  async saveNoImagePlaceholder(modId) {
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 540;
    const context = canvas.getContext("2d");
    context.fillStyle = "#4b4b4b";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.font = "800 48px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("NO IMAGE ASSIGNED", canvas.width / 2, canvas.height / 2);
    const image = await new Promise(
      (resolve) => canvas.toBlob(resolve, "image/webp", 0.84)
    );
    if (!image) throw new Error("Could not create the fallback mod image");
    return this.saveBlob(modId, image);
  }
  async remove(modId) {
    await this.api.remove(this.getCoverPath(modId));
  }
};
__name(_ModCoverService, "ModCoverService");
var ModCoverService = _ModCoverService;

// app/src/ui/utils/filesystem/processService.js
import { errorHandler } from "../js/index.js";

// app/src/ui/utils/filesystem/processTree.js
function findDescendantPids(processes, rootPid) {
  const root = Number.parseInt(rootPid, 10);
  if (!Number.isSafeInteger(root) || root <= 0) return [];
  const childrenByParent = /* @__PURE__ */ new Map();
  for (const process of processes) {
    const pid = Number.parseInt(process.pid, 10);
    const parentPid = Number.parseInt(process.parentPid, 10);
    if (!Number.isSafeInteger(pid) || !Number.isSafeInteger(parentPid))
      continue;
    const children = childrenByParent.get(parentPid) || [];
    children.push(pid);
    childrenByParent.set(parentPid, children);
  }
  const descendants = [];
  const queue = [...childrenByParent.get(root) || []];
  const seen = /* @__PURE__ */ new Set([root]);
  while (queue.length > 0) {
    const pid = queue.shift();
    if (seen.has(pid)) continue;
    seen.add(pid);
    descendants.push(pid);
    queue.push(...childrenByParent.get(pid) || []);
  }
  return descendants;
}
__name(findDescendantPids, "findDescendantPids");
function parseWindowsProcessTree(output) {
  if (!String(output || "").trim()) return [];
  try {
    const parsed = JSON.parse(output);
    return (Array.isArray(parsed) ? parsed : [parsed]).map((process) => ({
      pid: process.ProcessId,
      parentPid: process.ParentProcessId
    }));
  } catch {
    return [];
  }
}
__name(parseWindowsProcessTree, "parseWindowsProcessTree");
function parsePosixProcessTree(output) {
  return String(output || "").split(/\r?\n/).map((line) => line.trim().match(/^(\d+)\s+(\d+)$/)).filter(Boolean).map((match) => ({ pid: match[1], parentPid: match[2] }));
}
__name(parsePosixProcessTree, "parsePosixProcessTree");

// app/src/ui/utils/filesystem/processService.js
var ACTIVE_PROCESSES_KEY = "weekbox_active_processes";
var _ProcessService = class _ProcessService {
  constructor(executables) {
    this.executables = executables;
    this.activeProcesses = /* @__PURE__ */ new Map();
    this.exitWaiters = /* @__PURE__ */ new Map();
    this.processMonitors = /* @__PURE__ */ new Map();
    this.processHandlers = /* @__PURE__ */ new Map();
    this.closingProcesses = /* @__PURE__ */ new Set();
  }
  readPersistedProcesses() {
    try {
      const records = JSON.parse(localStorage.getItem(ACTIVE_PROCESSES_KEY));
      return Array.isArray(records) ? records : [];
    } catch {
      return [];
    }
  }
  writePersistedProcesses(records) {
    try {
      localStorage.setItem(ACTIVE_PROCESSES_KEY, JSON.stringify(records));
    } catch {
    }
  }
  remember(key, process, metadata) {
    const records = this.readPersistedProcesses().filter(
      (record) => record.key !== key
    );
    records.push({ key, id: process.id, pid: process.pid, ...metadata });
    this.writePersistedProcesses(records);
  }
  forget(key) {
    this.writePersistedProcesses(
      this.readPersistedProcesses().filter((record) => record.key !== key)
    );
  }
  notifyStateChange(key, state) {
    document.dispatchEvent(
      new CustomEvent("weekbox-process-change", {
        detail: { key, state }
      })
    );
  }
  complete(key, onStateChange) {
    this.closingProcesses.delete(key);
    this.activeProcesses.delete(key);
    this.forget(key);
    const monitor = this.processMonitors.get(key);
    if (monitor) window.clearInterval(monitor);
    this.processMonitors.delete(key);
    const handler = this.processHandlers.get(key);
    if (handler) Neutralino.events.off("spawnedProcess", handler);
    this.processHandlers.delete(key);
    const waiters = this.exitWaiters.get(key) || [];
    this.exitWaiters.delete(key);
    waiters.forEach((resolve) => resolve());
    document.dispatchEvent(
      new CustomEvent("weekbox-process-exit", { detail: { key } })
    );
    this.notifyStateChange(key, "completed");
    onStateChange?.("completed");
  }
  async watch(key, process, onStateChange) {
    const handler = /* @__PURE__ */ __name(async (event) => {
      if (!sameProcessId(event.detail.id, process.id) || event.detail.action !== "exit")
        return;
      Neutralino.events.off("spawnedProcess", handler);
      this.processHandlers.delete(key);
      if (!this.closingProcesses.has(key)) {
        const descendantPid = await this.findRunningDescendant(process.pid);
        if (descendantPid && this.activeProcesses.get(key) === process && !this.closingProcesses.has(key)) {
          const recovered = { ...process, pid: descendantPid, recovered: true };
          this.activeProcesses.set(key, recovered);
          this.remember(key, recovered, process.metadata || {});
          this.monitor(key, descendantPid);
          return;
        }
      }
      if (this.activeProcesses.get(key) !== process) return;
      this.complete(key, onStateChange);
    }, "handler");
    this.processHandlers.set(key, handler);
    try {
      return await Neutralino.events.on("spawnedProcess", handler);
    } catch (error) {
      this.processHandlers.delete(key);
      throw error;
    }
  }
  async watchOrMonitor(key, process, onStateChange) {
    try {
      await this.watch(key, process, onStateChange);
    } catch {
      process.recovered = true;
      this.remember(key, process, process.metadata || {});
      this.monitor(key, process.pid);
    }
  }
  async restore() {
    const records = this.readPersistedProcesses();
    if (records.length === 0) return [];
    const spawned = await Neutralino.os.getSpawnedProcesses().catch(() => []);
    const restored = [];
    for (const record of records) {
      const process = spawned.find(
        (item) => String(item.pid) === String(record.pid)
      );
      if (process) {
        const tracked = { ...process, metadata: { ...record } };
        this.activeProcesses.set(record.key, tracked);
        await this.watchOrMonitor(record.key, tracked);
        restored.push(record);
        continue;
      }
      if (!await this.isPidRunning(record.pid)) continue;
      this.activeProcesses.set(record.key, { ...record, recovered: true });
      this.monitor(record.key, record.pid);
      restored.push(record);
    }
    this.writePersistedProcesses(restored);
    return restored;
  }
  async isPidRunning(pid) {
    const safePid = Number.parseInt(pid, 10);
    if (!Number.isSafeInteger(safePid) || safePid <= 0) return false;
    try {
      if (window.NL_OS === "Windows") {
        const result2 = await Neutralino.os.execCommand(
          `tasklist /FI "PID eq ${safePid}" /NH`
        );
        return new RegExp(`\\b${safePid}\\b`).test(result2.stdOut || "");
      }
      const result = await Neutralino.os.execCommand(`kill -0 ${safePid}`);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }
  async findRunningDescendant(pid) {
    const safePid = Number.parseInt(pid, 10);
    if (!Number.isSafeInteger(safePid) || safePid <= 0) return null;
    try {
      const windows = window.NL_OS === "Windows";
      const command = windows ? 'powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId | ConvertTo-Json -Compress"' : "ps -eo pid=,ppid=";
      const result = await Neutralino.os.execCommand(command);
      if (result.exitCode !== 0) return null;
      const processes = windows ? parseWindowsProcessTree(result.stdOut) : parsePosixProcessTree(result.stdOut);
      const descendants = findDescendantPids(processes, safePid);
      for (const descendantPid of descendants.reverse()) {
        if (await this.isPidRunning(descendantPid)) return descendantPid;
      }
      return null;
    } catch {
      return null;
    }
  }
  monitor(key, pid) {
    const trackedProcess = this.activeProcesses.get(key);
    let checking = false;
    const monitor = window.setInterval(async () => {
      if (checking || this.activeProcesses.get(key) !== trackedProcess) return;
      checking = true;
      try {
        if (await this.isPidRunning(pid)) return;
        if (this.activeProcesses.get(key) === trackedProcess)
          this.complete(key);
      } finally {
        checking = false;
      }
    }, 2e3);
    this.processMonitors.set(key, monitor);
  }
  async terminatePid(pid) {
    const safePid = Number.parseInt(pid, 10);
    if (!Number.isSafeInteger(safePid) || safePid <= 0) return false;
    try {
      const command = window.NL_OS === "Windows" ? `taskkill /PID ${safePid} /T /F` : `kill -TERM ${safePid}`;
      const result = await Neutralino.os.execCommand(command);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }
  async launch(key, executablePath, onStateChange, args = [], metadata = {}) {
    if (this.activeProcesses.has(key)) {
      onStateChange?.("already_running");
      return false;
    }
    let command = "";
    try {
      onStateChange?.("running");
      const isExe = String(executablePath).toLowerCase().endsWith(".exe");
      if (window.NL_OS === "Linux" && isExe) {
        const wineCheck = await Neutralino.os.execCommand("which wine");
        if (wineCheck.exitCode !== 0) {
          window.dispatchEvent(new CustomEvent("wine-missing"));
          onStateChange?.("error");
          return false;
        }
        command = [
          `wine "${executablePath}"`,
          ...args.map((arg) => `"${String(arg).replaceAll('"', '\\"')}"`)
        ].join(" ");
      } else {
        command = [
          `"${executablePath}"`,
          ...args.map((arg) => `"${String(arg).replaceAll('"', '\\"')}"`)
        ].join(" ");
      }
      const process = await Neutralino.os.spawnProcess(command, {
        cwd: this.executables.getDirectory(executablePath)
      });
      process.metadata = { ...metadata, executablePath };
      this.activeProcesses.set(key, process);
      this.remember(key, process, process.metadata);
      this.notifyStateChange(key, "launched");
      await this.watchOrMonitor(key, process, onStateChange);
      onStateChange?.("launched");
      return true;
    } catch (error) {
      console.error("Could not launch engine", {
        executablePath,
        command,
        error
      });
      errorHandler.show({
        error,
        action: "Launch engine",
        item: executablePath
      });
      onStateChange?.("error");
      return false;
    }
  }
  async close(key, onStateChange) {
    const process = this.activeProcesses.get(key);
    if (!process) return false;
    onStateChange?.("closing");
    this.closingProcesses.add(key);
    try {
      if (process.recovered) {
        if (!await this.terminatePid(process.pid)) throw new Error();
        this.complete(key, onStateChange);
        return true;
      }
      if (window.NL_OS === "Windows") {
        if (!await this.terminatePid(process.pid)) throw new Error();
        this.complete(key, onStateChange);
      } else {
        await Neutralino.os.updateSpawnedProcess(process.id, "exit");
      }
      return true;
    } catch (error) {
      this.closingProcesses.delete(key);
      onStateChange?.("error");
      return false;
    }
  }
  async closeAndWait(key, onStateChange) {
    const process = this.activeProcesses.get(key);
    if (!process) return false;
    let resolveExit;
    const exited = new Promise((resolve) => {
      resolveExit = resolve;
      const waiters = this.exitWaiters.get(key) || [];
      waiters.push(resolve);
      this.exitWaiters.set(key, waiters);
    });
    try {
      if (!await this.close(key, onStateChange)) throw new Error();
      let timeout;
      const completed = await Promise.race([
        exited.then(() => true),
        new Promise((resolve) => {
          timeout = window.setTimeout(() => resolve(false), 1e4);
        })
      ]);
      window.clearTimeout(timeout);
      if (!completed) {
        if (await this.isPidRunning(process.pid)) throw new Error();
        this.complete(key, onStateChange);
      }
      return true;
    } catch (error) {
      this.closingProcesses.delete(key);
      const waiters = this.exitWaiters.get(key) || [];
      this.exitWaiters.set(
        key,
        waiters.filter((resolve) => resolve !== resolveExit)
      );
      onStateChange?.("error");
      return false;
    }
  }
  isRunning(key) {
    return this.activeProcesses.has(key);
  }
};
__name(_ProcessService, "ProcessService");
var ProcessService = _ProcessService;

// app/src/ui/utils/filesystem.js
import { appSettings as appSettings2 } from "../../backend/core/settings.js";
function sameId4(left, right) {
  return String(left) === String(right);
}
__name(sameId4, "sameId");
function isOneDrivePath(path) {
  return /(?:^|[\\/])OneDrive(?:[\\/]|$)/i.test(String(path));
}
__name(isOneDrivePath, "isOneDrivePath");
function isICloudPath(path) {
  return /(?:^|\/)Library\/Mobile Documents\/com~apple~CloudDocs(?:\/|$)/i.test(
    String(path)
  );
}
__name(isICloudPath, "isICloudPath");
function isWeekBoxFolder(path) {
  return /(?:^|[\\/])weekbox$/i.test(String(path).replace(/[\\/]+$/, ""));
}
__name(isWeekBoxFolder, "isWeekBoxFolder");
var RETIRED_ENGINE_IDS = /* @__PURE__ */ new Set(["alepsych"]);
var _FileSystemService = class _FileSystemService {
  constructor() {
    this.basePath = "";
    this.weekboxPath = "";
    this.enginesPath = "";
    this.modsPath = "";
    this.dataPath = "";
    this.isInitialized = false;
    this.startupMaintenancePromise = null;
    this.isStorageMoveInProgress = false;
    this.activeDownload = null;
    this.abortController = null;
    this.isPaused = false;
    this.api = APIneuFileSystem;
    this.executables = new ExecutableService();
    this.processes = new ProcessService(this.executables);
    this.activeEngineProcesses = this.processes.activeProcesses;
    this.activeEngineMods = /* @__PURE__ */ new Map();
    document.addEventListener("weekbox-process-exit", (event) => {
      this.activeEngineMods.delete(event.detail.key);
    });
    this.mods = new ModRepository({
      api: this.api,
      getDataPath: /* @__PURE__ */ __name(() => this.dataPath, "getDataPath")
    });
    this.covers = new ModCoverService({
      api: this.api,
      getDataPath: /* @__PURE__ */ __name(() => this.dataPath, "getDataPath")
    });
    this.injection = new ModInjectionService({
      api: this.api,
      executables: this.executables,
      modRepository: this.mods,
      getEnginesPath: /* @__PURE__ */ __name(() => this.enginesPath, "getEnginesPath"),
      getModsPath: /* @__PURE__ */ __name(() => this.modsPath, "getModsPath")
    });
    this.maintenance = new LibraryMaintenanceService({
      api: this.api,
      mods: this.mods,
      injection: this.injection,
      getEnginesPath: /* @__PURE__ */ __name(() => this.enginesPath, "getEnginesPath"),
      getEngineModsPath: /* @__PURE__ */ __name((engineId, version) => this.injection.getEngineModsPath(engineId, version), "getEngineModsPath"),
      getModsPath: /* @__PURE__ */ __name(() => this.modsPath, "getModsPath"),
      getInstalledEngines: /* @__PURE__ */ __name(() => this.getInstalledEngines(), "getInstalledEngines"),
      isEngineRunning: /* @__PURE__ */ __name((engineId, version) => this.isEngineRunning(engineId, version), "isEngineRunning"),
      findExecutable: /* @__PURE__ */ __name((path) => this.findExecutable(path), "findExecutable")
    });
  }
  async init({ deferMaintenance = false } = {}) {
    if (this.isInitialized) {
      if (!deferMaintenance) await this.runStartupMaintenance();
      return;
    }
    if (typeof Neutralino !== "undefined") {
      const defaultStoragePath = await this.getDefaultStorageParentPath();
      const savedPath = appSettings2.get("storageParentPath");
      let storagePath = savedPath || defaultStoragePath;
      if (!savedPath) {
        try {
          const legacyBasePath = await Neutralino.os.getPath("documents");
          if (await this.api.exists(`${legacyBasePath}/WeekBox`)) {
            storagePath = legacyBasePath;
          }
        } catch (error) {
          console.warn("Could not inspect the legacy WeekBox folder", error);
        }
      }
      this.setStoragePaths(storagePath);
      try {
        await this.ensureStorageDirectories();
      } catch (error) {
        if (!savedPath) throw error;
        console.warn("Could not access saved WeekBox storage location", error);
        appSettings2.set("storageParentPath", null);
        this.setStoragePaths(defaultStoragePath);
        await this.ensureStorageDirectories();
      }
    }
    this.isInitialized = true;
    const restoredProcesses = await this.processes.restore();
    restoredProcesses.forEach(({ key, modId }) => {
      if (modId !== null && modId !== void 0)
        this.activeEngineMods.set(key, modId);
    });
    if (!deferMaintenance) await this.runStartupMaintenance();
  }
  async runStartupMaintenance({ onProgress } = {}) {
    if (this.startupMaintenancePromise) return this.startupMaintenancePromise;
    const runPhase = /* @__PURE__ */ __name(async (label, progress, task) => {
      onProgress?.(label, progress);
      const startedAt = performance.now();
      await task(
        (message, nextProgress = progress) => onProgress?.(message, nextProgress)
      );
      console.info(
        `[WeekBox] Startup maintenance: ${label} finished in ${Math.round(performance.now() - startedAt)}ms`
      );
    }, "runPhase");
    this.startupMaintenancePromise = (async () => {
      await runPhase(
        "Checking for retired engines\u2026",
        90,
        (reportProgress) => this.removeRetiredEngines(reportProgress)
      );
      await runPhase(
        "Cleaning incomplete downloads\u2026",
        91,
        () => this.cleanupIncompleteDownloads()
      );
      await runPhase(
        "Checking installed engines\u2026",
        92,
        () => this.cleanupInvalidEngineInstallations()
      );
      await runPhase(
        "Checking installed mods\u2026",
        94,
        () => this.cleanupInvalidInstalledMods()
      );
      await runPhase(
        "Updating mod artwork\u2026",
        96,
        () => this.migrateLegacyModCovers()
      );
      let installedEngines = [];
      await runPhase("Scanning engine versions\u2026", 97, async () => {
        installedEngines = await this.getInstalledEngines();
      });
      await runPhase("Updating engine mod folders\u2026", 98, async () => {
        await this.injection.migrateLegacyEngineModsFor(installedEngines);
      });
      await runPhase(
        "Importing Psych Online mods\u2026",
        99,
        () => this.importPsychOnlineEngineMods(installedEngines)
      );
      await runPhase(
        "Cleaning stale mod links\u2026",
        99,
        () => this.cleanupHiddenModLinks(installedEngines)
      );
    })();
    return this.startupMaintenancePromise;
  }
  async removeRetiredEngines(reportProgress) {
    const mods = await this.mods.getAll();
    const retiredEnginePath = `${this.enginesPath}/alepsych`;
    const hasRetiredEngine = await this.api.exists(retiredEnginePath);
    const hasAssignedMods = mods.some(
      (mod) => RETIRED_ENGINE_IDS.has(mod.engineId)
    );
    if (hasRetiredEngine || hasAssignedMods) {
      reportProgress?.("Removing a retired engine and updating its mods\u2026", 90);
    }
    let changed = false;
    for (const mod of mods) {
      if (!RETIRED_ENGINE_IDS.has(mod.engineId)) continue;
      mod.engineId = null;
      mod.engineVersion = null;
      changed = true;
    }
    if (changed) await this.mods.saveAll(mods);
    await Promise.all(
      [...RETIRED_ENGINE_IDS].map(
        (engineId) => this.api.remove(`${this.enginesPath}/${engineId}`)
      )
    );
  }
  async startBackgroundMaintenance(options) {
    return this.runStartupMaintenance(options);
  }
  async getDefaultStorageParentPath() {
    if (window.NL_OS === "Windows") {
      const localAppDataPath = await Neutralino.os.getEnv("LOCALAPPDATA");
      if (localAppDataPath) return localAppDataPath;
    }
    const documentsPath = await Neutralino.os.getPath("documents");
    if (window.NL_OS === "Darwin" && isICloudPath(documentsPath)) {
      const homePath = await Neutralino.os.getEnv("HOME");
      if (homePath) return homePath;
    }
    return documentsPath;
  }
  setStoragePaths(basePath) {
    this.basePath = String(basePath).replace(/[\\/]+$/, "");
    this.weekboxPath = `${this.basePath}/WeekBox`;
    this.enginesPath = `${this.weekboxPath}/engines`;
    this.modsPath = `${this.weekboxPath}/mods`;
    this.dataPath = `${this.weekboxPath}/data`;
  }
  async ensureStorageDirectories() {
    await this.api.ensureDir(this.basePath);
    if (!await this.api.exists(this.basePath)) {
      throw new Error("Selected storage folder is unavailable");
    }
    await this.api.ensureDir(this.weekboxPath);
    await this.api.ensureDir(this.enginesPath);
    await this.api.ensureDir(this.modsPath);
    await this.api.ensureDir(this.dataPath);
  }
  hasRunningProcesses() {
    return this.activeEngineProcesses.size > 0;
  }
  async getNestedStorageRepairTarget() {
    if (!isWeekBoxFolder(this.basePath)) return null;
    const parentPath = getParentPath(this.basePath);
    if (!parentPath) return null;
    try {
      const entries = getRealEntries(
        await Neutralino.filesystem.readDirectory(this.basePath)
      );
      const hasOnlyNestedWeekBox = entries.length === 1 && entries[0].type === "DIRECTORY" && entries[0].entry.toLowerCase() === "weekbox";
      return hasOnlyNestedWeekBox ? parentPath : null;
    } catch {
      return null;
    }
  }
  assertStorageUnlocked() {
    if (this.isStorageMoveInProgress) {
      throw new Error("Wait for WeekBox files to finish moving first");
    }
  }
  async findExistingStorage(basePath) {
    const selectedPath = String(basePath || "").replace(/[\\/]+$/, "");
    if (!selectedPath) return null;
    const weekboxPath = isWeekBoxFolder(selectedPath) ? selectedPath : `${selectedPath}/WeekBox`;
    const storageBasePath = isWeekBoxFolder(selectedPath) ? getParentPath(selectedPath) : selectedPath;
    const requiredPaths = ["data", "engines", "mods"].map(
      (directory) => `${weekboxPath}/${directory}`
    );
    const hasRequiredFolders = await Promise.all(
      requiredPaths.map((path) => this.api.exists(path))
    );
    return hasRequiredFolders.every(Boolean) ? { basePath: storageBasePath, weekboxPath } : null;
  }
  async useExistingStorage(basePath) {
    this.assertStorageUnlocked();
    if (this.hasRunningProcesses()) {
      throw new Error("Close running engines before changing WeekBox storage");
    }
    const storage = await this.findExistingStorage(basePath);
    if (!storage) {
      throw new Error(
        "The selected folder does not contain a complete WeekBox library."
      );
    }
    this.setStoragePaths(storage.basePath);
    await appSettings2.setDataPath(this.dataPath);
    appSettings2.set("storageParentPath", storage.basePath);
    return storage.weekboxPath;
  }
  async moveStorageTo(basePath, onProgress = () => {
  }, options = {}) {
    this.assertStorageUnlocked();
    const destinationBasePath = String(basePath || "").replace(/[\\/]+$/, "");
    if (!destinationBasePath) throw new Error("Choose a storage folder first");
    if (isWeekBoxFolder(destinationBasePath)) {
      throw new Error(
        "Choose the folder that will contain WeekBox, not the WeekBox folder itself. For example, choose C:\\Users\\you\\AppData\\Local instead of C:\\Users\\you\\AppData\\Local\\WeekBox."
      );
    }
    if (destinationBasePath.toLowerCase() === this.basePath.toLowerCase()) {
      return this.weekboxPath;
    }
    if (this.hasRunningProcesses()) {
      throw new Error("Close running engines before moving WeekBox files");
    }
    if (!await this.api.exists(destinationBasePath)) {
      throw new Error("Selected storage folder is unavailable");
    }
    const destinationWeekboxPath = `${destinationBasePath}/WeekBox`;
    let replacedStorageBackupPath = null;
    const repairingNestedStorage = destinationWeekboxPath.toLowerCase() === this.basePath.toLowerCase();
    if (await this.api.exists(destinationWeekboxPath)) {
      const entries = getRealEntries(
        await Neutralino.filesystem.readDirectory(destinationWeekboxPath)
      );
      const canRepairNestedStorage = repairingNestedStorage && entries.length === 1 && entries[0].type === "DIRECTORY" && entries[0].entry.toLowerCase() === "weekbox";
      if (entries.length > 0 && !canRepairNestedStorage) {
        if (!options.replaceExisting) {
          throw new Error(
            "The selected parent already contains a non-empty WeekBox folder. Choose a different parent folder so WeekBox does not merge two libraries."
          );
        }
        const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").replace("T", "_").replace("Z", "");
        replacedStorageBackupPath = `${destinationBasePath}/WeekBox-backup-${timestamp}`;
        await Neutralino.filesystem.move(
          destinationWeekboxPath,
          replacedStorageBackupPath
        );
      }
      if (!canRepairNestedStorage && !replacedStorageBackupPath) {
        await Neutralino.filesystem.remove(destinationWeekboxPath);
      }
    }
    this.isStorageMoveInProgress = true;
    try {
      const mods = await this.mods.getAll();
      const engines = await this.getInstalledEngines();
      await Promise.all(
        mods.map(
          (mod) => this.injection.unlinkFromInstalledEngines(mod, engines)
        )
      );
      try {
        await this.copyDirectoryWithProgress(
          this.weekboxPath,
          destinationWeekboxPath,
          onProgress
        );
        await Neutralino.filesystem.remove(this.weekboxPath);
      } catch (error) {
        if (replacedStorageBackupPath && !await this.api.exists(destinationWeekboxPath)) {
          await Neutralino.filesystem.move(replacedStorageBackupPath, destinationWeekboxPath).catch(() => {
          });
        }
        await Promise.all(
          mods.map(
            (mod) => this.injection.injectIntoInstalledEngines(mod.id, engines)
          )
        ).catch(() => {
        });
        throw new Error(
          "Could not move WeekBox files. The original location was kept."
        );
      }
      this.setStoragePaths(destinationBasePath);
      await appSettings2.setDataPath(this.dataPath);
      appSettings2.set("storageParentPath", destinationBasePath);
      const [movedMods, movedEngines] = await Promise.all([
        this.mods.getAll(),
        this.getInstalledEngines()
      ]);
      await Promise.all(
        movedMods.map(
          (mod) => this.injection.injectIntoInstalledEngines(mod.id, movedEngines)
        )
      );
      return this.weekboxPath;
    } finally {
      this.isStorageMoveInProgress = false;
    }
  }
  async copyDirectoryWithProgress(sourcePath, destinationPath, onProgress) {
    const files = [];
    const directories = [];
    const collectFiles = /* @__PURE__ */ __name(async (directoryPath) => {
      directories.push(directoryPath);
      const entries = getRealEntries(
        await Neutralino.filesystem.readDirectory(directoryPath)
      );
      for (const entry of entries) {
        const entryPath = `${directoryPath}/${entry.entry}`;
        if (entry.type === "DIRECTORY") {
          await collectFiles(entryPath);
        } else if (entry.type === "FILE") {
          const stats = await Neutralino.filesystem.getStats(entryPath);
          files.push({ path: entryPath, size: Number(stats.size) || 0 });
        }
      }
    }, "collectFiles");
    await collectFiles(sourcePath);
    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    const fileSizes = new Map(files.map((file) => [file.path, file.size]));
    let copiedBytes = 0;
    let copiedFiles = 0;
    const reportProgress = /* @__PURE__ */ __name(() => {
      const progress = totalBytes ? copiedBytes / totalBytes * 100 : files.length ? copiedFiles / files.length * 100 : 100;
      onProgress({ progress, copiedFiles, totalFiles: files.length });
    }, "reportProgress");
    reportProgress();
    for (const sourceDirectory of directories) {
      const relativePath = sourceDirectory.slice(sourcePath.length);
      await this.api.ensureDir(`${destinationPath}${relativePath}`);
    }
    const concurrency = appSettings2.get("multithreadStorageMoves") ? 4 : 1;
    let nextFileIndex = 0;
    const copyNextFile = /* @__PURE__ */ __name(async () => {
      while (nextFileIndex < files.length) {
        const file = files[nextFileIndex++];
        const relativePath = file.path.slice(sourcePath.length);
        await Neutralino.filesystem.copy(
          file.path,
          `${destinationPath}${relativePath}`,
          { recursive: false, overwrite: false, skip: false }
        );
        copiedBytes += fileSizes.get(file.path) || 0;
        copiedFiles += 1;
        reportProgress();
      }
    }, "copyNextFile");
    await Promise.all(
      Array.from({ length: Math.min(concurrency, files.length) }, copyNextFile)
    );
  }
  async shouldRecommendDefaultStorage() {
    if (window.NL_OS !== "Windows" && window.NL_OS !== "Darwin") {
      return false;
    }
    if (appSettings2.get("storageMoveRecommendationDismissed")) return false;
    if (window.NL_OS === "Darwin") return this.isICloudStorage();
    const defaultPath = await this.getDefaultStorageParentPath();
    const usingDefault = this.basePath.toLowerCase() === String(defaultPath).toLowerCase();
    if (usingDefault) return false;
    const documentsPath = await Neutralino.os.getPath("documents");
    return this.basePath.toLowerCase() === documentsPath.toLowerCase() || this.isOneDriveStorage();
  }
  isOneDriveStorage() {
    return window.NL_OS === "Windows" && isOneDrivePath(this.basePath);
  }
  isICloudStorage() {
    return window.NL_OS === "Darwin" && isICloudPath(this.basePath);
  }
  async cleanupHiddenModLinks(installedEngines = null) {
    return this.maintenance.cleanupHiddenModLinks(installedEngines);
  }
  async importPsychOnlineEngineMods(installedEngines = null) {
    return this.maintenance.importPsychOnlineEngineMods(installedEngines);
  }
  async cleanupIncompleteDownloads() {
    return this.maintenance.cleanupIncompleteDownloads();
  }
  async hasModFiles(mod) {
    return this.maintenance.hasModFiles(mod);
  }
  async cleanupInvalidInstalledMods() {
    return this.maintenance.cleanupInvalidInstalledMods();
  }
  async cleanupInvalidEngineInstallations() {
    return this.maintenance.cleanupInvalidEngineInstallations();
  }
  async isEngineInstalled(engineId, version) {
    if (!this.isInitialized) return false;
    if (!Object.prototype.hasOwnProperty.call(ENGINE_DETAILS2, engineId)) {
      return false;
    }
    if (!isValidEngineVersion(version)) return false;
    const path = `${this.enginesPath}/${engineId}/${version}`;
    if (!await this.api.exists(path)) return false;
    return !await this.api.exists(`${path}/.downloading`) && Boolean(await this.findExecutable(path));
  }
  async findExecutable(directory) {
    return this.executables.find(directory);
  }
  getExecutableSearchError() {
    return this.executables.getLastError();
  }
  async runEngine(engineId, version, onStateChange, args = [], modId = null) {
    if (!Object.prototype.hasOwnProperty.call(ENGINE_DETAILS2, engineId) || !isValidEngineVersion(version)) {
      onStateChange?.("not_found");
      return false;
    }
    const executable = await this.findExecutable(
      `${this.enginesPath}/${engineId}/${version}`
    );
    if (!executable) {
      onStateChange?.("not_found");
      return false;
    }
    const key = `${engineId}:${version}`;
    const launched = await this.processes.launch(
      key,
      executable,
      (state) => {
        if (state === "completed" || state === "error") {
          this.activeEngineMods.delete(key);
          this.importPsychOnlineEngineMods().then(() => this.injectModsIntoEngine(engineId, version)).catch(() => {
          });
        }
        onStateChange?.(state);
      },
      args,
      { modId }
    );
    if (launched) this.activeEngineMods.set(key, modId);
    return launched;
  }
  async closeEngine(engineId, version, onStateChange) {
    return this.processes.close(`${engineId}:${version}`, onStateChange);
  }
  async closeEngineAndWait(engineId, version, onStateChange) {
    const key = `${engineId}:${version}`;
    const closed = await this.processes.closeAndWait(key, onStateChange);
    if (closed) this.activeEngineMods.delete(key);
    return closed;
  }
  isEngineRunning(engineId, version) {
    return this.processes.isRunning(`${engineId}:${version}`);
  }
  getRunningEngineMod(engineId, version) {
    return this.activeEngineMods.get(`${engineId}:${version}`) ?? null;
  }
  getModLaunchState(mod, engine, isStandalone) {
    if (isStandalone) {
      return this.isStandaloneModRunning(mod.id) ? "running" : "launch";
    }
    if (!engine) return "unavailable";
    if (!this.isEngineRunning(engine.id, engine.version)) return "launch";
    const behavior = getEngineLaunchBehavior(engine.id);
    if (behavior.scope !== "exclusive-mod") return "running";
    const runningModId = this.getRunningEngineMod(engine.id, engine.version);
    if (runningModId === null) return "switch";
    return String(runningModId) === String(mod.id) ? "running" : "switch";
  }
  async toggleModLaunch(mod, engine, isStandalone, onStateChange) {
    const state = this.getModLaunchState(mod, engine, isStandalone);
    if (state === "unavailable" && !isStandalone)
      throw new Error("Assigned engine is not installed");
    if (isStandalone) {
      return state === "running" ? this.closeStandaloneMod(mod.id, onStateChange) : this.runStandaloneMod(mod.id, onStateChange);
    }
    const behavior = getEngineLaunchBehavior(engine.id);
    const launch = /* @__PURE__ */ __name(async () => {
      await this.injectModIntoEngine(mod.id, engine.id, engine.version);
      const args = getEngineModLaunchArgs(
        engine.id,
        getEngineModFolderName(mod)
      );
      return this.runEngine(
        engine.id,
        engine.version,
        onStateChange,
        args,
        behavior.scope === "exclusive-mod" ? mod.id : null
      );
    }, "launch");
    if (state === "launch") return launch();
    if (state === "running")
      return this.closeEngine(engine.id, engine.version, onStateChange);
    if (await this.closeEngineAndWait(engine.id, engine.version))
      return launch();
    return false;
  }
  async getInstalledEngines() {
    if (!this.isInitialized) return [];
    try {
      const entries = await Neutralino.filesystem.readDirectory(
        this.enginesPath
      );
      const engines = await Promise.all(
        entries.filter(
          (entry) => entry.type === "DIRECTORY" && Object.prototype.hasOwnProperty.call(ENGINE_DETAILS2, entry.entry)
        ).map(async (engine) => {
          const versions = await Neutralino.filesystem.readDirectory(
            `${this.enginesPath}/${engine.entry}`
          );
          const installedVersions = await Promise.all(
            versions.filter(
              (version) => version.type === "DIRECTORY" && isValidEngineVersion(version.entry) && (engine.entry !== "psychonline" || version.entry === "Latest")
            ).map(async (version) => {
              const versionPath = `${this.enginesPath}/${engine.entry}/${version.entry}`;
              if (await this.api.exists(`${versionPath}/.downloading`)) {
                return null;
              }
              if (!await this.findExecutable(versionPath)) return null;
              return { id: engine.entry, version: version.entry };
            })
          );
          return installedVersions.filter(Boolean);
        })
      );
      return engines.flat();
    } catch (error) {
      return [];
    }
  }
  async injectModIntoEngine(modId, engineId, version) {
    return this.injection.injectOne(modId, engineId, version);
  }
  async injectModsIntoEngine(engineId, version) {
    return this.injection.injectForEngine(engineId, version);
  }
  async injectModIntoInstalledEngines(modId) {
    const engines = (await this.getInstalledEngines()).filter(
      (engine) => !this.isEngineRunning(engine.id, engine.version)
    );
    return this.injection.injectIntoInstalledEngines(modId, engines);
  }
  async cleanupEngineMods(engineId, version) {
    return this.injection.cleanup(engineId, version);
  }
  async getInstalledMods() {
    if (!this.isInitialized) return [];
    const mods = await this.mods.getAll();
    let validFolders = /* @__PURE__ */ new Set();
    try {
      const entries = await Neutralino.filesystem.readDirectory(this.modsPath);
      for (const e of entries) {
        if (e.type === "DIRECTORY") validFolders.add(e.entry);
      }
    } catch (error) {
    }
    const available = mods.filter((mod) => {
      const folderName = getModFolderName(mod);
      return folderName && validFolders.has(folderName);
    });
    return available;
  }
  async getStandaloneMods() {
    if (!this.isInitialized) return [];
    const standaloneMods = [];
    for (const mod of await this.mods.getAll()) {
      if (mod.kind === "dependency") continue;
      const executable = await this.findExecutable(
        `${this.modsPath}/${getModFolderName(mod)}`
      );
      if (!executable) continue;
      if (mod.engineId) {
        this.setModEngineCompatibility(mod.id, null, null).catch(() => {
        });
        mod.engineId = null;
        mod.engineVersion = null;
      }
      standaloneMods.push({
        ...mod,
        exePath: executable,
        icoPath: await this.executables.getIconDataUrl(executable)
      });
    }
    return standaloneMods;
  }
  async runStandaloneMod(modId, onStateChange) {
    const mod = (await this.getStandaloneMods()).find(
      (item) => sameId4(item.id, modId)
    );
    if (!mod) {
      onStateChange?.("error");
      return false;
    }
    return this.processes.launch(
      `standalone:${mod.id}`,
      mod.exePath,
      onStateChange,
      [],
      { modId: mod.id }
    );
  }
  async closeStandaloneMod(modId, onStateChange) {
    return this.processes.close(`standalone:${modId}`, onStateChange);
  }
  isStandaloneModRunning(modId) {
    return this.processes.isRunning(`standalone:${modId}`);
  }
  isModRunning(modId) {
    if (this.isStandaloneModRunning(modId)) return true;
    return [...this.activeEngineMods.values()].some(
      (runningModId) => runningModId !== null && String(runningModId) === String(modId)
    );
  }
  isModLockedForChanges(mod, allMods = []) {
    if (!mod) return false;
    if (this.isModRunning(mod.id)) return true;
    const isUsingModEngine = /* @__PURE__ */ __name((item) => {
      if (!item?.engineId) return false;
      if (item.engineVersion) {
        return this.isEngineRunning(item.engineId, item.engineVersion);
      }
      return [...this.activeEngineProcesses.keys()].some(
        (key) => key.startsWith(`${item.engineId}:`)
      );
    }, "isUsingModEngine");
    if (isUsingModEngine(mod)) return true;
    if (mod.kind !== "dependency") return false;
    return allMods.some(
      (item) => item.kind !== "dependency" && Array.isArray(item.dependencies) && item.dependencies.some(
        (dependencyId) => sameId4(dependencyId, mod.id)
      ) && isUsingModEngine(item)
    );
  }
  async assertModChangeAllowed(modId) {
    const allMods = await this.mods.getAll();
    const mod = allMods.find((item) => sameId4(item.id, modId));
    if (this.isModLockedForChanges(mod, allMods)) {
      throw new Error(
        `Close the engine before changing ${mod?.name || "this mod"}`
      );
    }
    return mod;
  }
  async saveInstalledMod(modId, modName, metadata = {}) {
    if (!this.isInitialized) return;
    const tempMod = { name: modName, id: modId, ...metadata };
    const executable = await this.findExecutable(
      `${this.modsPath}/${getModFolderName(tempMod)}`
    );
    if (executable) {
      metadata.engineId = null;
      metadata.engineVersion = null;
    }
    await this.mods.add(modId, modName, metadata);
  }
  async getAvailableLocalModFolderName(name, existingFolderName = "") {
    const displayName = sanitizePathSegment(name) || "Local Mod";
    const baseName = displayName;
    let folderName = baseName;
    let copyNumber = 2;
    while (folderName !== existingFolderName && await this.api.exists(`${this.modsPath}/${folderName}`)) {
      folderName = `${baseName} (${copyNumber++})`;
    }
    return folderName;
  }
  async importLocalMod({
    sourcePath,
    name,
    engineId,
    engineVersion,
    coverDataUrl,
    coverUrl
  }) {
    this.assertStorageUnlocked();
    if (!this.isInitialized) throw new Error("WeekBox storage is not ready");
    const modName = String(name || "").trim();
    if (!modName) throw new Error("Give the mod a name");
    const normalizedSource = String(sourcePath || "").replace(/\\/g, "/").replace(/\/+$/, "");
    const normalizedModsPath = this.modsPath.replace(/\\/g, "/").replace(/\/+$/, "");
    if (!normalizedSource) throw new Error("Choose a mod folder first");
    if (normalizedSource.toLowerCase() === normalizedModsPath.toLowerCase() || normalizedSource.toLowerCase().startsWith(`${normalizedModsPath.toLowerCase()}/`)) {
      throw new Error("Choose a folder outside your WeekBox mods library");
    }
    const sourceStats = await Neutralino.filesystem.getStats(normalizedSource);
    if (!sourceStats.isDirectory) {
      throw new Error("The selected path is not a folder");
    }
    const modId = `local-${crypto.randomUUID()}`;
    const folderName = await this.getAvailableLocalModFolderName(modName);
    const destinationPath = `${this.modsPath}/${folderName}`;
    try {
      await Neutralino.filesystem.copy(normalizedSource, destinationPath, {
        recursive: true,
        overwrite: false,
        skip: false
      });
      await this.saveInstalledMod(modId, modName, {
        folderName,
        engineFolderName: sanitizePathSegment(modName) || folderName,
        engineId: engineId || null,
        engineVersion: engineId ? engineVersion || null : null,
        source: "local"
      });
      if (coverDataUrl || coverUrl) {
        await this.updateModAppearance(modId, { coverDataUrl, coverUrl });
      }
      const importedMod = (await this.mods.getAll()).find(
        (mod) => sameId4(mod.id, modId)
      );
      if (importedMod?.engineId && !importedMod.hidden) {
        await this.injection.injectIntoInstalledEngines(
          importedMod.id,
          await this.getInstalledEngines()
        );
      }
      return importedMod;
    } catch (error) {
      await this.api.remove(destinationPath).catch(() => {
      });
      await this.mods.remove(modId).catch(() => {
      });
      await this.covers.remove(modId).catch(() => {
      });
      throw error;
    }
  }
  async setModHidden(modId, hidden) {
    if (!this.isInitialized) return null;
    await this.assertModChangeAllowed(modId);
    const mod = await this.mods.setHidden(modId, hidden);
    if (!mod) return null;
    const engines = await this.getInstalledEngines();
    if (mod.hidden) {
      await this.injection.unlinkFromInstalledEngines(mod, engines);
    } else {
      await this.injection.injectIntoInstalledEngines(modId, engines);
    }
    return mod;
  }
  async setModEngineVersion(modId, engineVersion) {
    await this.assertModChangeAllowed(modId);
    const mod = await this.mods.setEngineVersion(modId, engineVersion);
    if (!mod) return null;
    const engines = await this.getInstalledEngines();
    await this.injection.unlinkFromInstalledEngines(mod, engines);
    if (mod.kind !== "dependency" && !mod.hidden && mod.engineId) {
      await this.injection.injectIntoInstalledEngines(modId, engines);
    }
    return mod;
  }
  async setModEngineCompatibility(modId, engineId, engineVersion) {
    if (!this.isInitialized) return null;
    await this.assertModChangeAllowed(modId);
    const currentMod = (await this.mods.getAll()).find(
      (item) => sameId4(item.id, modId)
    );
    if (!currentMod) return null;
    if (currentMod.engineLocked && engineId !== "psychonline") {
      throw new Error("This mod is locked to Psych Online");
    }
    const engines = await this.getInstalledEngines();
    await this.injection.unlinkFromInstalledEngines(currentMod, engines);
    const mod = await this.mods.setEngineCompatibility(
      modId,
      engineId,
      engineVersion
    );
    if (mod?.kind !== "dependency" && mod?.engineId && !mod.hidden) {
      await this.injection.injectIntoInstalledEngines(modId, engines);
    }
    return mod;
  }
  async updateModAppearance(modId, appearance) {
    if (!this.isInitialized) return null;
    const { coverDataUrl, coverUrl, ...metadata } = appearance;
    let coverPath;
    if (coverDataUrl !== void 0) {
      coverPath = coverDataUrl ? await this.covers.saveDataUrl(modId, coverDataUrl) : null;
    } else if (coverUrl !== void 0) {
      coverPath = coverUrl ? await this.covers.saveUrl(modId, coverUrl) : null;
    }
    return this.mods.updateAppearance(modId, { ...metadata, coverPath });
  }
  async getModCover(modId) {
    if (!this.isInitialized) return null;
    try {
      return await this.covers.read(modId);
    } catch {
      return null;
    }
  }
  async ensureModCover(modId, getDefaultCoverUrl) {
    const localCover = await this.getModCover(modId);
    if (localCover) return localCover;
    const coverUrl = await getDefaultCoverUrl();
    const coverPath = coverUrl ? await this.covers.saveUrl(modId, coverUrl) : await this.covers.saveNoImagePlaceholder(modId);
    const updatedMod = await this.mods.updateAppearance(modId, { coverPath });
    return updatedMod ? this.getModCover(modId) : null;
  }
  async migrateLegacyModCovers() {
    const mods = await this.mods.getAll();
    let changed = false;
    for (const mod of mods) {
      if (!mod.imageBase64 && !mod.image) continue;
      try {
        if (mod.imageBase64) {
          mod.coverPath = await this.covers.saveDataUrl(
            mod.id,
            mod.imageBase64
          );
        }
        delete mod.imageBase64;
        delete mod.image;
        changed = true;
      } catch (error) {
        console.warn("Could not migrate a local mod cover", error);
      }
    }
    if (changed) await this.mods.saveAll(mods);
  }
  async addDependencyConsumer(dependencyId, consumerId) {
    if (!this.isInitialized) return null;
    return this.mods.addDependencyConsumer(dependencyId, consumerId);
  }
  async removeDependencyConsumer(dependencyId, consumerId) {
    if (!this.isInitialized) return null;
    return this.mods.removeDependencyConsumer(dependencyId, consumerId);
  }
  async moveModToDependencies(modId) {
    this.assertStorageUnlocked();
    if (!this.isInitialized) return null;
    await this.assertModChangeAllowed(modId);
    const mod = (await this.mods.getAll()).find(
      (item) => sameId4(item.id, modId)
    );
    if (!mod || mod.kind === "dependency") return mod || null;
    const engines = await this.getInstalledEngines();
    await this.injection.unlinkFromInstalledEngines(mod, engines);
    const dependency = await this.mods.moveToDependencies(modId);
    if (dependency?.engineId && !dependency.hidden) {
      await this.injection.injectIntoInstalledEngines(modId, engines);
    }
    return dependency;
  }
  async moveDependencyToMods(modId) {
    this.assertStorageUnlocked();
    if (!this.isInitialized) return null;
    await this.assertModChangeAllowed(modId);
    const mods = await this.mods.getAll();
    const dependency = mods.find((item) => sameId4(item.id, modId));
    if (!dependency || dependency.kind !== "dependency")
      return dependency || null;
    const consumers = mods.filter(
      (item) => item.kind !== "dependency" && Array.isArray(item.dependencies) && item.dependencies.some((dependencyId) => sameId4(dependencyId, modId))
    );
    if (consumers.length) {
      throw new Error(
        `Remove ${consumers.map((item) => item.name).join(", ")} before moving ${dependency.name}`
      );
    }
    const mod = await this.mods.moveToMods(modId);
    if (mod?.engineId && !mod.hidden) {
      await this.injection.injectIntoInstalledEngines(
        modId,
        await this.getInstalledEngines()
      );
    }
    return mod;
  }
  async removeInstalledMod(modId) {
    this.assertStorageUnlocked();
    if (!this.isInitialized) return false;
    const mod = (await this.mods.getAll()).find(
      (item) => sameId4(item.id, modId)
    );
    if (!mod) return false;
    if (this.isModLockedForChanges(mod, await this.mods.getAll())) {
      throw new Error(`Close the engine before deleting ${mod.name}`);
    }
    if (mod.kind === "dependency") {
      const consumers = (await this.mods.getAll()).filter(
        (item) => Array.isArray(item.dependencies) && item.dependencies.includes(modId)
      );
      if (consumers.length) {
        throw new Error(
          `Remove ${consumers.map((item) => item.name).join(", ")} before removing ${mod.name}`
        );
      }
    }
    const unlinkResults = await this.injection.unlinkFromInstalledEngines(
      mod,
      await this.getInstalledEngines()
    );
    const unlinkFailure = unlinkResults.find(
      (result) => result.status === "rejected"
    );
    if (unlinkFailure) throw unlinkFailure.reason;
    const folderName = getModFolderName(mod);
    if (!folderName || /[\\/]/.test(folderName) || folderName === "." || folderName === "..") {
      throw new Error(`Invalid mod folder for ${mod.name}`);
    }
    const modPath = `${this.modsPath}/${folderName}`;
    if (await this.api.exists(modPath)) {
      const command = window.NL_OS === "Windows" ? `cmd /c rmdir /S /Q "${modPath.replace(/\//g, "\\")}"` : `rm -rf "${modPath}"`;
      const result = await Neutralino.os.execCommand(command, {
        background: false
      });
      if (result.exitCode !== 0) {
        throw new Error(
          result.stdErr || `Could not remove mod files for ${mod.name}`
        );
      }
    }
    await this.mods.remove(modId);
    await this.covers.remove(modId).catch(() => {
    });
    if (Array.isArray(mod.dependencies)) {
      await Promise.all(
        mod.dependencies.map(
          (dependencyId) => this.removeDependencyConsumer(dependencyId, modId)
        )
      );
    }
    return true;
  }
  async isModInstalled(modId) {
    if (!this.isInitialized) return false;
    const mod = (await this.mods.getAll()).find(
      (item) => sameId4(item.id, modId)
    );
    return Boolean(mod && await this.hasModFiles(mod));
  }
  async flattenModFolder(targetDir) {
    if (!this.isInitialized) return;
    try {
      const entries = getRealEntries(
        await Neutralino.filesystem.readDirectory(targetDir)
      );
      if (entries.length !== 1 || entries[0].type !== "DIRECTORY") return;
      const sourceDir = `${targetDir}/${entries[0].entry}`;
      const nestedEntries = getRealEntries(
        await Neutralino.filesystem.readDirectory(sourceDir)
      );
      for (const entry of nestedEntries) {
        await Neutralino.filesystem.move(
          `${sourceDir}/${entry.entry}`,
          `${targetDir}/${entry.entry}`
        );
      }
      await Neutralino.filesystem.remove(sourceDir);
    } catch (error) {
    }
  }
};
__name(_FileSystemService, "FileSystemService");
var FileSystemService = _FileSystemService;
var FS = new FileSystemService();

// app/src/ui/utils/downloadToast.js
import { appEvents } from "../../backend/core/events.js";
var _GlobalDownloadToast = class _GlobalDownloadToast {
  constructor() {
    this.el = null;
    this.currentView = "engines";
    this.lastData = null;
  }
  createUI() {
  }
  bindEvents() {
  }
  handleUpdate(data) {
  }
  checkVisibility() {
  }
};
__name(_GlobalDownloadToast, "GlobalDownloadToast");
var GlobalDownloadToast = _GlobalDownloadToast;
var globalDownloadToast = new GlobalDownloadToast();

// app/src/ui/utils/dropdown.js
var openDropdowns = /* @__PURE__ */ new Set();
function setupDropdown(trigger, container, options = {}) {
  const {
    openClass = "open",
    menuElement = null,
    // Si se provee, controlará la propiedad "hidden"
    onToggle = null
  } = options;
  if (!trigger || !container) return { close: /* @__PURE__ */ __name(() => {
  }, "close"), destroy: /* @__PURE__ */ __name(() => {
  }, "destroy") };
  const close = /* @__PURE__ */ __name(() => {
    openDropdowns.delete(close);
    container.classList.remove(openClass);
    if (menuElement) menuElement.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (onToggle) onToggle(false);
  }, "close");
  const open = /* @__PURE__ */ __name(() => {
    [...openDropdowns].forEach((otherDropdown) => {
      if (otherDropdown !== close) otherDropdown();
    });
    openDropdowns.add(close);
    container.classList.add(openClass);
    if (menuElement) menuElement.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    if (onToggle) onToggle(true);
  }, "open");
  const toggle = /* @__PURE__ */ __name(() => {
    const isOpen = !container.classList.contains(openClass);
    if (isOpen) open();
    else close();
  }, "toggle");
  const handleTriggerClick = /* @__PURE__ */ __name((e) => {
    e.stopPropagation();
    toggle();
  }, "handleTriggerClick");
  const handleOutsideClick = /* @__PURE__ */ __name((e) => {
    if (!container.contains(e.target) && container.classList.contains(openClass)) {
      close();
    }
  }, "handleOutsideClick");
  trigger.addEventListener("click", handleTriggerClick);
  document.addEventListener("click", handleOutsideClick);
  return {
    close,
    destroy: /* @__PURE__ */ __name(() => {
      close();
      trigger.removeEventListener("click", handleTriggerClick);
      document.removeEventListener("click", handleOutsideClick);
    }, "destroy")
  };
}
__name(setupDropdown, "setupDropdown");

// app/src/ui/utils/extractColor.js
var colorJobs = [];
var colorJobScheduled = false;
function scheduleNextColorJob() {
  colorJobScheduled = true;
  const runNextJob = /* @__PURE__ */ __name(() => {
    colorJobScheduled = false;
    colorJobs.shift()?.();
    if (colorJobs.length) scheduleNextColorJob();
  }, "runNextJob");
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(runNextJob, { timeout: 400 });
  } else {
    setTimeout(runNextJob, 32);
  }
}
__name(scheduleNextColorJob, "scheduleNextColorJob");
function scheduleColorJob(job) {
  colorJobs.push(job);
  if (!colorJobScheduled) scheduleNextColorJob();
}
__name(scheduleColorJob, "scheduleColorJob");
function getRelativeLuminance(r, g, b) {
  const linear = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
__name(getRelativeLuminance, "getRelativeLuminance");
function applyDominantColor(img, targetElement, options = {}) {
  const {
    cssVar = "--card-color",
    alpha = 0.5,
    fallback = "rgba(128, 128, 128, 0.3)"
  } = options;
  const processColor = /* @__PURE__ */ __name(() => {
    scheduleColorJob(() => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const sourceWidth = img.naturalWidth || 64;
        const sourceHeight = img.naturalHeight || 64;
        const scale = Math.min(1, 64 / Math.max(sourceWidth, sourceHeight));
        canvas.width = Math.max(1, Math.round(sourceWidth * scale));
        canvas.height = Math.max(1, Math.round(sourceHeight * scale));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const swatches = /* @__PURE__ */ new Map();
        for (let index = 0; index < data.length; index += 64) {
          const r2 = data[index];
          const g2 = data[index + 1];
          const b2 = data[index + 2];
          const max = Math.max(r2, g2, b2);
          const min = Math.min(r2, g2, b2);
          const luma = 0.299 * r2 + 0.587 * g2 + 0.114 * b2;
          const saturation = max ? (max - min) / max : 0;
          if (luma < 35 || luma > 225 || saturation < 0.18) continue;
          const key = `${Math.floor(r2 / 32)}:${Math.floor(g2 / 32)}:${Math.floor(b2 / 32)}`;
          const swatch = swatches.get(key) || {
            weight: 0,
            r: 0,
            g: 0,
            b: 0,
            count: 0
          };
          const weight = 0.2 + saturation ** 3 * 2;
          swatch.weight += weight;
          swatch.r += r2 * weight;
          swatch.g += g2 * weight;
          swatch.b += b2 * weight;
          swatch.count += weight;
          swatches.set(key, swatch);
        }
        const strongest = [...swatches.values()].reduce(
          (best, swatch) => !best || swatch.weight > best.weight ? swatch : best,
          null
        );
        if (!strongest) {
          targetElement.style.setProperty(cssVar, fallback);
          return;
        }
        let r = strongest.r / strongest.count * 0.76;
        let g = strongest.g / strongest.count * 0.76;
        let b = strongest.b / strongest.count * 0.76;
        while (getRelativeLuminance(r, g, b) > 0.09) {
          r *= 0.92;
          g *= 0.92;
          b *= 0.92;
        }
        targetElement.style.setProperty(
          cssVar,
          `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, ${alpha})`
        );
      } catch {
        targetElement.style.setProperty(cssVar, fallback);
      }
    });
  }, "processColor");
  if (img.complete) processColor();
  else img.addEventListener("load", processColor, { once: true });
}
__name(applyDominantColor, "applyDominantColor");
export {
  APIneuFileSystem,
  ExecutableService,
  FS,
  LibraryMaintenanceService,
  ModCoverService,
  ModInjectionService,
  ModRepository,
  ProcessService,
  applyDominantColor,
  downloadArchive,
  extractArchive,
  findDescendantPids,
  getBase64FromUrl,
  getEngineModFolderName,
  getGoogleDriveFileId,
  getModFolderName,
  getOsProcessId,
  getParentPath,
  getRangeSupportedFileSize,
  getRealEntries,
  globalDownloadToast,
  isValidEngineVersion,
  listenForProcess,
  parsePosixProcessTree,
  parseWindowsProcessTree,
  resolveExternalDownloadUrl,
  sameProcessId,
  sanitizeModFolderName,
  sanitizePathSegment,
  setupDropdown
};
