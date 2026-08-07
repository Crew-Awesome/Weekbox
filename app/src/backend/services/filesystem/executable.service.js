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
    EXCLUDED_EXECUTABLE_NAMES.has(name) ||
    name.startsWith("fe-crashdialog")
  );
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
    const MAX_DEPTH = 3;

    while (queue.length > 0) {
      const { path: currentDir, depth } = queue.shift();
      try {
        const entries = getRealEntries(
          await Neutralino.filesystem.readDirectory(currentDir),
        );
        for (const entry of entries) {
          const fullPath = `${currentDir}/${entry.entry}`;
          if (String(entry.type).toUpperCase() === "DIRECTORY") {
            if (isMacOS && /\.app$/i.test(entry.entry)) {
              const macOSDirectory = `${fullPath}/Contents/MacOS`;
              try {
                const appEntries = getRealEntries(
                  await Neutralino.filesystem.readDirectory(macOSDirectory),
                );
                const bundleExecutable = getBundleExecutableName(
                  await Neutralino.filesystem.readFile(
                    `${fullPath}/Contents/Info.plist`,
                  ),
                );
                const executable = appEntries.find(
                  (appEntry) =>
                    String(appEntry.type).toUpperCase() === "FILE" &&
                    appEntry.entry === bundleExecutable &&
                    !isExcludedExecutable(appEntry.entry),
                );
                if (executable) {
                  const result = `${macOSDirectory}/${executable.entry}`;
                  this.cache.set(normalizedDir, result);
                  return result;
                }
                const fallback = appEntries.find(
                  (appEntry) =>
                    String(appEntry.type).toUpperCase() === "FILE" &&
                    !appEntry.entry.includes(".") &&
                    !isExcludedExecutable(appEntry.entry),
                );
                if (fallback) {
                  const result = `${macOSDirectory}/${fallback.entry}`;
                  this.cache.set(normalizedDir, result);
                  return result;
                }
              } catch (error) {
                this.lastError = describeFileSystemError(error);
              }
            }
            if (depth < MAX_DEPTH) {
              queue.push({ path: fullPath, depth: depth + 1 });
            }
            continue;
          }
          if (
            (entry.entry.toLowerCase().endsWith(".exe") &&
              !isExcludedExecutable(entry.entry)) ||
            (!isWindows &&
              !entry.entry.includes(".") &&
              entry.entry !== "CodeResources" &&
              !isExcludedExecutable(entry.entry))
          ) {
            this.cache.set(normalizedDir, fullPath);
            return fullPath;
          }
        }
      } catch (error) {
        this.lastError = describeFileSystemError(error);
      }
    }
    if (isWindows) {
      try {
        const cmdPromise = Neutralino.os.execCommand(
          `where.exe /r "${normalizedDir.replace(/\//g, "\\")}" *.exe`,
          { background: false },
        );
        const result = await Promise.race([
          cmdPromise,
          new Promise((resolve) => setTimeout(() => resolve(null), 1500)),
        ]);
        if (result && result.exitCode === 0) {
          const paths = (result.stdOut || "")
            .split(/\r?\n/)
            .map((path) => path.trim())
            .filter(Boolean);
          for (const path of paths) {
            const fileName = path.split(/[\\/]/).pop();
            if (!isExcludedExecutable(fileName)) {
              const res = path.replace(/\\/g, "/");
              this.cache.set(normalizedDir, res);
              return res;
            }
          }
        }
      } catch (error) {
        console.warn("Could not search for a Windows executable:", dir, error);
      }
    }
    this.cache.set(normalizedDir, null);
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
