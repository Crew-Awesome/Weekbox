import { getRealEntries, getParentPath } from "./path.util.js";

function describeFileSystemError(error) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    return (
      error.message || error.description || error.code || JSON.stringify(error)
    );
  }
  return String(error || "Unknown filesystem error");
}

function getBundleExecutableName(infoPlist) {
  const match = String(infoPlist).match(
    /<key>\s*CFBundleExecutable\s*<\/key>\s*<string>\s*([^<]+?)\s*<\/string>/i,
  );
  return match?.[1]?.trim() || "";
}

export const EXCLUDED_EXECUTABLE_NAMES = new Set([
  "fe-crashdialog.exe",
  "fe-crashdialog",
]);

function isExcludedExecutable(fileName) {
  if (!fileName) return true;
  const name = String(fileName).trim().toLowerCase();
  return (
    EXCLUDED_EXECUTABLE_NAMES.has(name) || name.startsWith("fe-crashdialog")
  );
}

async function findMacBundleExecutable(service, fullPath) {
  const macOSDirectory = `${fullPath}/Contents/MacOS`;
  try {
    const appEntries = getRealEntries(
      await Neutralino.filesystem.readDirectory(macOSDirectory),
    );
    const bundleExecutable = getBundleExecutableName(
      await Neutralino.filesystem.readFile(`${fullPath}/Contents/Info.plist`),
    );
    const executable = appEntries.find(
      (entry) =>
        String(entry.type).toUpperCase() === "FILE" &&
        entry.entry === bundleExecutable &&
        !isExcludedExecutable(entry.entry),
    );
    const fallback = appEntries.find(
      (entry) =>
        String(entry.type).toUpperCase() === "FILE" &&
        !entry.entry.includes(".") &&
        !isExcludedExecutable(entry.entry),
    );
    const match = executable || fallback;
    return match ? `${macOSDirectory}/${match.entry}` : null;
  } catch (error) {
    service.lastError = describeFileSystemError(error);
    return null;
  }
}

async function scanExecutableDirectory(service, currentDir, depth, isMacOS) {
  const children = [];
  try {
    const entries = getRealEntries(
      await Neutralino.filesystem.readDirectory(currentDir),
    );
    for (const entry of entries) {
      const fullPath = `${currentDir}/${entry.entry}`;
      if (String(entry.type).toUpperCase() === "DIRECTORY") {
        if (isMacOS && /\.app$/i.test(entry.entry)) {
          const bundleExecutable = await findMacBundleExecutable(
            service,
            fullPath,
          );
          if (bundleExecutable) return { result: bundleExecutable, children };
        }
        if (depth < 3) children.push({ path: fullPath, depth: depth + 1 });
        continue;
      }
      const isWindowsExecutable =
        entry.entry.toLowerCase().endsWith(".exe") &&
        !isExcludedExecutable(entry.entry);
      const isUnixExecutable =
        !isWindowsExecutable &&
        !entry.entry.includes(".") &&
        entry.entry !== "CodeResources" &&
        !isExcludedExecutable(entry.entry);
      if (isWindowsExecutable || isUnixExecutable) {
        return { result: fullPath, children };
      }
    }
  } catch (error) {
    service.lastError = describeFileSystemError(error);
  }
  return { result: null, children };
}

async function findWindowsExecutable(service, normalizedDir) {
  try {
    const cmdPromise = Neutralino.os.execCommand(
      `where.exe /r "${normalizedDir.replace(/\//g, "\\")}" *.exe`,
      { background: false },
    );
    const result = await Promise.race([
      cmdPromise,
      new Promise((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);
    if (!result || result.exitCode !== 0) return null;
    for (const path of (result.stdOut || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)) {
      const fileName = path.split(/[\\/]/).pop();
      if (!isExcludedExecutable(fileName)) return path.replace(/\\/g, "/");
    }
  } catch (error) {
    console.warn(
      "Could not search for a Windows executable:",
      normalizedDir,
      error,
    );
  }
  return null;
}

var _ExecutableService = class _ExecutableService {
  constructor() {
    this.cache = new Map();
  }

  async find(dir) {
    if (!dir) return null;
    const normalizedDir = String(dir).replace(/\\/g, "/").replace(/\/+$/, "");
    if (this.cache.has(normalizedDir)) {
      return this.cache.get(normalizedDir);
    }

    this.lastError = null;
    const isWindows = window.NL_OS === "Windows";
    const isMacOS = window.NL_OS === "Darwin";
    const queue = [{ path: normalizedDir, depth: 0 }];

    while (queue.length > 0) {
      const { path: currentDir, depth } = queue.shift();
      const scan = await scanExecutableDirectory(
        this,
        currentDir,
        depth,
        isMacOS,
      );
      if (scan.result) {
        this.cache.set(normalizedDir, scan.result);
        return scan.result;
      }
      queue.push(...scan.children);
    }
    if (isWindows) {
      const result = await findWindowsExecutable(this, normalizedDir);
      if (result) {
        this.cache.set(normalizedDir, result);
        return result;
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
        ".svg": "image/svg+xml",
      };
      const icon = entries.find((entry) => {
        const extension = entry.entry
          .slice(entry.entry.lastIndexOf("."))
          .toLowerCase();
        return entry.type === "FILE" && extension in iconMimeTypes;
      });
      if (!icon) return "";
      const data = await Neutralino.filesystem.readBinaryFile(
        `${executableDir}/${icon.entry}`,
      );
      const bytes = new Uint8Array(data);
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      const extension = icon.entry
        .slice(icon.entry.lastIndexOf("."))
        .toLowerCase();
      return `data:${iconMimeTypes[extension]};base64,${window.btoa(binary)}`;
    } catch (error) {
      return "";
    }
  }
};

var ExecutableService = _ExecutableService;

export { ExecutableService };
