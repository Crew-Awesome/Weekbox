import { appSettings } from "../../core/settings.js";

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

function getGoogleDriveFileId(url) {
  const parsed = new URL(url);
  return (
    parsed.searchParams.get("id") ||
    parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ||
    null
  );
}

async function resolveExternalDownloadUrl(url) {
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "drive.google.com" || hostname === "docs.google.com") {
    const fileId = getGoogleDriveFileId(url);
    if (!fileId) throw new Error("Could not find the Google Drive file ID");
    return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;
  }
  if (hostname === "mediafire.com" || hostname === "www.mediafire.com") {
    const result = await Neutralino.os.execCommand(
      `curl -fsSL --connect-timeout 10 --max-time 30 ${quoteCommandArgument(url)}`,
      { background: false },
    );
    if (result.exitCode !== 0)
      throw new Error(
        result.stdErr || "Could not open the MediaFire download page",
      );
    const directUrl = (result.stdOut || "")
      .replaceAll("&amp;", "&")
      .match(/https?:\/\/download[^"'\s<>]+\.mediafire\.com[^"'\s<>]*/i)?.[0];
    if (!directUrl)
      throw new Error("Could not find the MediaFire download link");
    return directUrl;
  }
  return url;
}

async function getRangeSupportedFileSize(url) {
  const result = await Neutralino.os.execCommand(
    `curl -sS -L -I --connect-timeout 3 --max-time 3 --range 0-0 ${quoteCommandArgument(url)}`,
    { background: false },
  );
  if (result.exitCode !== 0) {
    throw new Error(
      result.stdErr || `Range check failed with exit code ${result.exitCode}`,
    );
  }
  const headers = `${result.stdOut || ""}\n${result.stdErr || ""}`;
  const match = headers.match(/content-range:\s*bytes\s+0-0\/(\d+)/i);
  return match ? Number(match[1]) : 0;
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

async function mergeParts(parts, outPath) {
  const command =
    window.NL_OS === "Windows"
      ? getWindowsMergeCommand(parts, outPath)
      : `cat ${parts.map((part) => quoteCommandArgument(part.path)).join(" ")} > ${quoteCommandArgument(outPath)}`;
  const result = await Neutralino.os.execCommand(command, {
    background: false,
  });
  if (result.exitCode !== 0) {
    throw new Error(result.stdErr || "Could not merge download parts");
  }
}

function quotePowerShellString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function encodePowerShellScript(script) {
  const bytes = new Uint8Array(script.length * 2);
  for (let index = 0; index < script.length; index += 1) {
    const code = script.charCodeAt(index);
    bytes[index * 2] = code & 0xff;
    bytes[index * 2 + 1] = code >> 8;
  }
  return btoa(String.fromCharCode(...bytes));
}

function getWindowsMergeCommand(parts, outPath) {
  const copyParts = parts
    .map(
      (part) =>
        `$source=[System.IO.File]::OpenRead(${quotePowerShellString(part.path)});try{$source.CopyTo($destination)}finally{$source.Dispose()}`,
    )
    .join(";");
  const script = `$destination=[System.IO.File]::Open(${quotePowerShellString(outPath)},[System.IO.FileMode]::Create,[System.IO.FileAccess]::Write,[System.IO.FileShare]::None);try{${copyParts}}finally{$destination.Dispose()}`;
  return `powershell -NoProfile -NonInteractive -EncodedCommand ${encodePowerShellScript(script)}`;
}

async function runCurlDownload(command, getTask, onProgress, getProgress) {
  const process = await Neutralino.os.spawnProcess(command);
  const task = getTask();
  if (task) task.pid = process.id ?? process.pid;

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
          if (getProgress) return;
          const matches = event.data.match(/(\d+\.?\d*)%/g);
          if (!matches?.length) return;
          reportProgress(Number.parseFloat(matches[matches.length - 1]));
          return;
        }
        if (event.action !== "exit") return;
        Neutralino.events.off("spawnedProcess", handler);
        if (event.data === 0) resolve();
        else reject(new Error(`Download failed with exit code ${event.data}`));
      },
    );
  } finally {
    if (progressTimer) clearInterval(progressTimer);
  }
}

async function downloadSingleArchive({ url, outPath, getTask, onProgress }) {
  await runCurlDownload(
    `curl -# -L ${quoteCommandArgument(url)} -o ${quoteCommandArgument(outPath)}`,
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
      `curl -# --parallel --parallel-max ${parts.length} ${requests}`,
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
    url = await resolveExternalDownloadUrl(url);
  }
  let remoteFileSize = 0;
  try {
    onProgress?.("Checking download server...", 2);
    remoteFileSize = await getRangeSupportedFileSize(url);
  } catch (error) {
    if (getTask()?.cancelled) throw error;
  }

  if (
    appSettings.get("multithreadDownloads") &&
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
}) {
  const isWindows = window.NL_OS === "Windows";
  const command = isWindows
    ? `tar -xvf "${archivePath}" -C "${destinationPath}"`
    : `unzip -o "${archivePath}" -d "${destinationPath}"`;
  const process = await Neutralino.os.spawnProcess(command);
  const task = getTask();
  if (task) task.pid = process.id ?? process.pid;

  return listenForProcess(
    process,
    getTask,
    (event, handler, resolve, reject) => {
      if (event.action === "stdOut" || event.action === "stdErr") {
        const output = event.data.trim();
        if (output) onEntry?.(formatArchiveEntry(output));
        return;
      }
      if (event.action !== "exit") return;
      Neutralino.events.off("spawnedProcess", handler);
      // Windows tar can return 1 for recoverable archive warnings. The caller
      // verifies that real files were extracted before recording an install.
      if (event.data === 0 || (isWindows && event.data === 1)) resolve();
      else reject(new Error(`Extraction failed with exit code ${event.data}`));
    },
  );
}
