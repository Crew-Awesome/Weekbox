import { appSettings } from '../../core/index-core.js';
import { getOsProcessId, sameProcessId } from '../processes/spawned-process.util.js';

function formatArchiveEntry(output) {
  const lines = output.trim().split("\n");
  let name = lines[lines.length - 1].trim().replace(/^x\s+/, "").replace(/^inflating:\s+/, "").replace(/^extracting:\s+/, "").replace(/^creating:\s+/, "").trim();
  const parts = name.split(/[/\\]/);
  if (parts.length > 2) name = `.../${parts.slice(-2).join("/")}`;
  return name;
}

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
      if (event.detail.action === "exit" && sameProcessId(task?.pid, getOsProcessId(process))) {
        task.pid = null;
      }
      onEvent(event.detail, handler, resolve, reject);
    };
    Neutralino.events.on("spawnedProcess", handler).catch(reject);
  });
}

var MIN_SEGMENTED_DOWNLOAD_BYTES = 8 * 1024 * 1024;
var MAX_DOWNLOAD_SEGMENTS = 4;
function quoteCommandArgument(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function spawnProcessWithShell(command) {
  if (window.NL_OS === "Windows") {
    return Neutralino.os.spawnProcess(command);
  }
  return Neutralino.os.spawnProcess(`sh -c ${quoteCommandArgument(command)}`);
}

function appendProcessOutput(output, data) {
  const next = `${output}${String(data || "")}`;
  return next.length > 4e3 ? next.slice(-4e3) : next;
}

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

function isNonFatalUnzipFilenameWarning(exitCode, output) {
  if (Number(exitCode) !== 1) return false;
  const detail = String(output || "");
  return /mismatching ["']?local["']? filename/i.test(detail) && /continuing with ["']?central["']? filename version/i.test(detail);
}

async function detectArchiveFormat(path) {
  try {
    const data = new Uint8Array(
      await Neutralino.filesystem.readBinaryFile(path, { pos: 0, size: 560 })
    );
    const startsWith = (...bytes) => bytes.every((byte, index) => data[index] === byte);
    if (startsWith(80, 75)) return "zip";
    if (startsWith(82, 97, 114, 33, 26, 7)) return "rar";
    if (startsWith(55, 122, 188, 175, 39, 28)) return "7z";
    if (startsWith(31, 139)) return "gzip";
    if (String.fromCharCode(...data.slice(257, 262)) === "ustar") return "tar";
  } catch {
  }
  return "unknown";
}

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

async function removeParts(parts) {
  await Promise.all(
    parts.map(
      (part) => Neutralino.filesystem.remove(part.path).catch(() => {
      })
    )
  );
}

function buildWindowsMergeCommand(parts, outPath) {
  const list = parts.map((part) => quoteCommandArgument(part.path.replace(/\//g, "\\"))).join("+");
  const target = quoteCommandArgument(outPath.replace(/\//g, "\\"));
  return `cmd /c copy /b /y ${list} ${target}`;
}

function buildUnixMergeCommand(parts, outPath) {
  const list = parts.map((part) => quoteCommandArgument(part.path)).join(" ");
  return `cat ${list} > ${quoteCommandArgument(outPath)}`;
}

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

function getWindowsExtractionCommand(archivePath, destinationPath) {
  return `tar.exe -xf ${quoteCommandArgument(archivePath)} -C ${quoteCommandArgument(destinationPath)}`;
}

function getPowerShellExtractCommand(archivePath, destinationPath) {
  const safeArchive = String(archivePath).replace(/'/g, "''");
  const safeDest = String(destinationPath).replace(/'/g, "''");
  return `powershell -NoProfile -NonInteractive -Command "Expand-Archive -Path '${safeArchive}' -DestinationPath '${safeDest}' -Force"`;
}

var NESTED_ARCHIVE_PATTERNS = [
  /\.zip$/i,
  /\.tar\.gz$/i,
  /\.tgz$/i,
  /\.tar$/i
];
function isNestedArchive(entryName) {
  return NESTED_ARCHIVE_PATTERNS.some((pattern) => pattern.test(entryName)) || window.NL_OS === "Darwin" && /\.dmg$/i.test(String(entryName));
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
  const flags = lower.endsWith(".gz") || lower.endsWith(".tgz") ? "-xzf" : "-xf";
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
          extractNested: false
        });
        await Neutralino.filesystem.remove(archivePath).catch(() => {
        });
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
                  processOutput
                )
              );
          }
        );
      };
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

async function runCurlDownload(command, getTask, onProgress, getProgress) {
  const process = await spawnProcessWithShell(command);
  const task = getTask();
  if (task) task.pid = getOsProcessId(process);
  let processOutput = "";
  let maxPercent = 0;
  const reportProgress = (percent) => {
    if (Number.isNaN(percent) || percent < maxPercent) return;
    maxPercent = percent;
    onProgress?.("Downloading...", 2 + percent * 0.96);
  };
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

async function downloadSingleArchive({ url, outPath, getTask, onProgress }) {
  await runCurlDownload(
    `curl -# -L --fail --show-error ${quoteCommandArgument(url)} -o ${quoteCommandArgument(outPath)}`,
    getTask,
    onProgress
  );
}

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
      (part) => `-L --range ${part.start}-${part.end} -o ${quoteCommandArgument(part.path)} ${quoteCommandArgument(url)}`
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
        `hdiutil attach -nobrowse -readonly -mountpoint ${quoteCommandArgument(mountPath)} ${quoteCommandArgument(archivePath)}`
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
          `hdiutil detach ${quoteCommandArgument(mountPath)}`,
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
  const command = portable7z ? `${quoteCommandArgument(portable7z)} x -y -aoa -o${quoteCommandArgument(destinationPath)} ${quoteCommandArgument(archivePath)}` : isWindows ? getWindowsExtractionCommand(archivePath, destinationPath) : archiveFormat === "tar" || archiveFormat === "gzip" ? `tar -xf ${quoteCommandArgument(archivePath)} -C ${quoteCommandArgument(destinationPath)}` : archiveFormat === "rar" || archiveFormat === "7z" ? window.NL_OS === "Darwin" ? `tar -xf ${quoteCommandArgument(archivePath)} -C ${quoteCommandArgument(destinationPath)}` : `7z x -y -aoa -o${quoteCommandArgument(destinationPath)} ${quoteCommandArgument(archivePath)}` : `unzip -oq ${quoteCommandArgument(archivePath)} -d ${quoteCommandArgument(destinationPath)}`;
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
        if (event.data === 0 || !isWindows && isNonFatalUnzipFilenameWarning(event.data, processOutput))
          resolve();
        else
          reject(createProcessError("Extraction", event.data, processOutput));
      }
    );
  };
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
        `tar -xf ${quoteCommandArgument(archivePath)} -C ${quoteCommandArgument(destinationPath)}`
      ];
      if (window.NL_OS !== "Darwin") {
        fallbackCommands.push(
          `7z x -y -aoa -o${quoteCommandArgument(destinationPath)} ${quoteCommandArgument(archivePath)}`
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

export { extractArchive, downloadArchive, listenForProcess };
