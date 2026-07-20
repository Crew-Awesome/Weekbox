import { appSettings } from "../../core/settings.js";
import {
  getRangeSupportedFileSize,
  resolveExternalDownloadUrl,
} from "./externalDownloadResolver.js";

function formatArchiveEntry(output) {
  const lines = output.trim().split("\n");
  let name = lines[lines.length - 1]
    .trim()
    .replace(/^x\s+/, "")
    .replace(/^inflating:\s+/, "")
    .replace(/^extracting:\s+/, "")
    .replace(/^creating:\s+/, "")
    .trim();
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
  return new Promise(async (resolve, reject) => {
    const handler = (event) => {
      const task = getTask();
      if (task?.cancelled) {
        Neutralino.events.off("spawnedProcess", handler);
        reject(new Error("Cancelled"));
        return;
      }
      if (event.detail.id !== process.id) return;
      onEvent(event.detail, handler, resolve, reject);
    };
    try {
      await Neutralino.events.on("spawnedProcess", handler);
    } catch (error) {
      reject(error);
    }
  });
}

const MIN_SEGMENTED_DOWNLOAD_BYTES = 8 * 1024 * 1024;
const MAX_DOWNLOAD_SEGMENTS = 4;

function quoteCommandArgument(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function appendProcessOutput(output, data) {
  const next = `${output}${String(data || "")}`;
  return next.length > 4000 ? next.slice(-4000) : next;
}

function createProcessError(operation, exitCode, output) {
  const detail = output.trim();
  return new Error(
    `${operation} failed with exit code ${exitCode}${detail ? `: ${detail}` : ""}`,
  );
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
  const result = await Neutralino.os.execCommand(command, { background: false });
  if (result.exitCode !== 0) {
    throw new Error(
      `Could not merge download parts: ${result.stdErr || result.stdOut || "unknown error"}`,
    );
  }
}

function getWindowsExtractionCommand(archivePath, destinationPath) {
  const archive = archivePath.replace(/\//g, "\\");
  const destination = destinationPath.replace(/\//g, "\\");
  return `tar.exe -xf ${quoteCommandArgument(archive)} -C ${quoteCommandArgument(destination)}`;
}

const NESTED_ARCHIVE_PATTERNS = [
  /\.zip$/i,
  /\.tar\.gz$/i,
  /\.tgz$/i,
  /\.tar$/i,
];

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
      } else if (
        NESTED_ARCHIVE_PATTERNS.some((pattern) => pattern.test(entry.entry))
      ) {
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
  const archive = isWindows ? archivePath.replace(/\//g, "\\") : archivePath;
  const dest = isWindows
    ? destinationPath.replace(/\//g, "\\")
    : destinationPath;
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
      const command = getNestedExtractionCommand(archivePath, parentDir);
      const process = await Neutralino.os.spawnProcess(command);
      const activeTask = getTask?.();
      if (activeTask) activeTask.pid = process.id ?? process.pid;
      try {
        await listenForProcess(
          process,
          getTask,
          (event, handler, resolve, reject) => {
            if (event.action === "stdOut" || event.action === "stdErr") {
              const output = String(event.data || "").trim();
              if (output) reportEntry(output);
              return;
            }
            if (event.action !== "exit") return;
            Neutralino.events.off("spawnedProcess", handler);
            if (event.data === 0) resolve();
            else
              reject(createProcessError("Nested extraction", event.data, ""));
          },
        );
        await Neutralino.filesystem.remove(archivePath).catch(() => {});
      } catch (error) {
        console.warn("Could not extract nested archive:", archivePath, error);
      }
    }
  }
}

async function runCurlDownload(command, getTask, onProgress, getProgress) {
  const process = await Neutralino.os.spawnProcess(command);
  const task = getTask();
  if (task) task.pid = process.id ?? process.pid;

  let processOutput = "";
  let maxPercent = 0;
  const reportProgress = (percent) => {
    if (Number.isNaN(percent) || percent < maxPercent) return;
    maxPercent = percent;
    onProgress?.("Downloading...", 2 + percent * 0.96);
  };
  let isCheckingProgress = false;
  const progressTimer = getProgress
    ? setInterval(async () => {
        if (isCheckingProgress) return;
        isCheckingProgress = true;
        try {
          reportProgress(await getProgress());
        } catch (error) {
          // A part may not exist yet while curl is opening connections.
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
          if (!matches?.length) return;
          reportProgress(Number.parseFloat(matches[matches.length - 1]));
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

async function downloadSingleArchive({ url, outPath, getTask, onProgress }) {
  await runCurlDownload(
    `curl -# -L --fail --show-error ${quoteCommandArgument(url)} -o ${quoteCommandArgument(outPath)}`,
    getTask,
    onProgress,
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
  try {
    await removeParts(parts);
    onProgress?.("Opening parallel download connections...", 2);
    const requests = parts
      .map(
        (part) =>
          `-L --range ${part.start}-${part.end} -o ${quoteCommandArgument(part.path)} ${quoteCommandArgument(url)}`,
      )
      .join(" --next ");
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
          }),
        );
        return (
          (sizes.reduce((total, size) => total + size, 0) / totalBytes) * 100
        );
      },
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

export async function downloadArchive({
  url,
  outPath,
  getTask,
  onProgress,
  sourceType,
}) {
  if (sourceType === "external") {
    onProgress?.("Preparing external download...", 2);
    url = await resolveExternalDownloadUrl(url, (...args) =>
      Neutralino.os.execCommand(...args),
    );
  }
  const useMultithreadDownloads = appSettings.get("multithreadDownloads");
  let remoteFileSize = 0;
  if (useMultithreadDownloads) {
    try {
      onProgress?.("Checking download server...", 2);
      remoteFileSize = await getRangeSupportedFileSize(url, (...args) =>
        Neutralino.os.execCommand(...args),
      );
    } catch (error) {
      if (getTask()?.cancelled) throw error;
    }
  }

  if (
    useMultithreadDownloads &&
    remoteFileSize >= MIN_SEGMENTED_DOWNLOAD_BYTES
  ) {
    try {
      await downloadSegmentedArchive({
        url,
        outPath,
        totalBytes: remoteFileSize,
        getTask,
        onProgress,
      });
    } catch (error) {
      if (getTask()?.cancelled) throw error;
      await Neutralino.filesystem.remove(outPath).catch(() => {});
      onProgress?.("Retrying download...", 2);
      await downloadSingleArchive({ url, outPath, getTask, onProgress });
    }
    return;
  }

  await downloadSingleArchive({ url, outPath, getTask, onProgress });
}

export async function extractArchive({
  archivePath,
  destinationPath,
  getTask,
  onEntry,
  extractNested = false,
}) {
  const reportEntry = createThrottledEntryReporter(onEntry);
  const isDiskImage =
    window.NL_OS === "Darwin" && /\.dmg$/i.test(String(archivePath));
  if (isDiskImage) {
    const mountPath = `${destinationPath}/.weekbox-dmg-${Date.now()}`;
    let attached = false;
    let processOutput = "";

    try {
      await Neutralino.filesystem.createDirectory(mountPath);
      const process = await Neutralino.os.spawnProcess(
        `hdiutil attach -nobrowse -readonly -mountpoint ${quoteCommandArgument(mountPath)} ${quoteCommandArgument(archivePath)}`,
      );
      const task = getTask();
      if (task) task.pid = process.id ?? process.pid;

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
  const command = isWindows
    ? getWindowsExtractionCommand(archivePath, destinationPath)
    : `unzip -oq "${archivePath}" -d "${destinationPath}"`;
  const process = await Neutralino.os.spawnProcess(command);
  const task = getTask();
  if (task) task.pid = process.id ?? process.pid;

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
      // Windows tar can return 1 for recoverable archive warnings. The caller
      // verifies that real files were extracted before recording an install.
      if (event.data === 0 || (isWindows && event.data === 1)) resolve();
      else reject(createProcessError("Extraction", event.data, processOutput));
    },
  );

  if (extractNested) {
    await extractNestedArchives(destinationPath, getTask, onEntry);
  }
}
