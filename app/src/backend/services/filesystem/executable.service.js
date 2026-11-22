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

function encodePowerShellCommand(command) {
  const bytes = new Uint8Array(command.length * 2);
  for (let index = 0; index < command.length; index += 1) {
    const code = command.charCodeAt(index);
    bytes[index * 2] = code & 0xff;
    bytes[index * 2 + 1] = code >> 8;
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return window.btoa(binary);
}

function quotePowerShellString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function getEmbeddedIconDataUrl(executablePath) {
  if (window.NL_OS !== "Windows") return "";
  try {
    const command = encodePowerShellCommand(
      `Add-Type -AssemblyName System.Drawing;$icon=[System.Drawing.Icon]::ExtractAssociatedIcon(${quotePowerShellString(executablePath)});if($icon){$bitmap=$icon.ToBitmap();$stream=[System.IO.MemoryStream]::new();$bitmap.Save($stream,[System.Drawing.Imaging.ImageFormat]::Png);[Convert]::ToBase64String($stream.ToArray());$bitmap.Dispose();$stream.Dispose();$icon.Dispose()}`,
    );
    const result = await Neutralino.os.execCommand(
      `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${command}`,
      { background: false },
    );
    const embedded = String(result.stdOut || "").trim();
    return result.exitCode === 0 && embedded
      ? `data:image/png;base64,${embedded}`
      : "";
  } catch {
    return "";
  }
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
    if (error?.code !== "NE_FS_NOPATHE") {
      service.lastError = describeFileSystemError(error);
      throw new Error(
        `WeekBox could not inspect executable files in ${macOSDirectory}. ${error?.message || error}`,
        { cause: error },
      );
    }
    return null;
  }
}

async function scanExecutableDirectory(
  service,
  currentDir,
  depth,
  isMacOS,
  isWindows,
) {
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
        !isWindows &&
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
    if (error?.code !== "NE_FS_NOPATHE") {
      throw new Error(
        `WeekBox could not inspect executable files in ${currentDir}. ${error?.message || error}`,
        { cause: error },
      );
    }
  }
  return { result: null, children };
}

function isExecutableCandidate(entry, isWindows) {
  return (
    (isWindows && entry.entry.toLowerCase().endsWith(".exe")) ||
    (!isWindows && !entry.entry.includes(".") && entry.entry !== "CodeResources")
  ) && !isExcludedExecutable(entry.entry);
}

async function scanExecutableCandidates(
  service,
  path,
  depth,
  isWindows,
  isMacOS,
  limit,
) {
  const candidates = [];
  const children = [];
  try {
    const entries = getRealEntries(
      await Neutralino.filesystem.readDirectory(path),
    );
    for (const entry of entries) {
      const fullPath = `${path}/${entry.entry}`;
      if (entry.type === "DIRECTORY") {
        if (isMacOS && /\.app$/i.test(entry.entry)) {
          const bundleExecutable = await findMacBundleExecutable(service, fullPath);
          if (bundleExecutable) candidates.push(bundleExecutable);
        }
        if (depth < 3) children.push({ path: fullPath, depth: depth + 1 });
      } else if (isExecutableCandidate(entry, isWindows)) {
        candidates.push(fullPath);
      }
      if (candidates.length >= limit) break;
    }
  } catch (error) {
    if (error?.code !== "NE_FS_NOPATHE") {
      service.lastError = describeFileSystemError(error);
      throw new Error(
        `WeekBox could not inspect executable files in ${path}. ${error?.message || error}`,
        { cause: error },
      );
    }
  }
  return { candidates, children };
}

var _ExecutableService = class _ExecutableService {
  constructor() {
    this.cache = new Map();
    this.pending = new Map();
    this.cacheTtlMs = 60_000;
    this.maxCacheEntries = 512;
    this.iconCache = new Map();
    this.pendingIcons = new Map();
    this.iconCacheTtlMs = 10 * 60_000;
    this.maxIconCacheEntries = 64;
  }

  async find(dir) {
    if (!dir) return null;
    const normalizedDir = String(dir).replace(/\\/g, "/").replace(/\/+$/, "");
    const now = Date.now();
    const cached = this.cache.get(normalizedDir);
    if (cached && cached.expiresAt > now) {
      this.cache.delete(normalizedDir);
      this.cache.set(normalizedDir, cached);
      if (!cached.path) return null;
      try {
        await Neutralino.filesystem.getStats(cached.path);
        return cached.path;
      } catch (error) {
        if (error?.code !== "NE_FS_NOPATHE") throw error;
        this.cache.delete(normalizedDir);
      }
    }
    const pending = this.pending.get(normalizedDir);
    if (pending) return pending.promise;

    const requestEntry = { stale: false, promise: null };
    requestEntry.promise = this.findUncached(normalizedDir)
      .then((path) => {
        if (requestEntry.stale) {
          return this.find(normalizedDir);
        }
        while (this.cache.size >= this.maxCacheEntries) {
          this.cache.delete(this.cache.keys().next().value);
        }
        this.cache.set(normalizedDir, {
          path,
          expiresAt: Date.now() + this.cacheTtlMs,
        });
        return path;
      })
      .finally(() => {
        if (this.pending.get(normalizedDir) === requestEntry) {
          this.pending.delete(normalizedDir);
        }
      });
    this.pending.set(normalizedDir, requestEntry);
    return requestEntry.promise;
  }

  async findUncached(normalizedDir) {
    this.lastError = null;
    const isWindows = window.NL_OS === "Windows";
    const isMacOS = window.NL_OS === "Darwin";
    const queue = [{ path: normalizedDir, depth: 0 }];
    let queueIndex = 0;

    while (queueIndex < queue.length) {
      const { path: currentDir, depth } = queue[queueIndex];
      queueIndex += 1;
      const scan = await scanExecutableDirectory(
        this,
        currentDir,
        depth,
        isMacOS,
        isWindows,
      );
      if (scan.result) return scan.result;
      queue.push(...scan.children);
    }
    return null;
  }
  async findAll(dir) {
    if (!dir) return [];
    this.lastError = null;
    const normalizedDir = String(dir).replace(/\\/g, "/").replace(/\/+$/, "");
    const isWindows = window.NL_OS === "Windows";
    const isMacOS = window.NL_OS === "Darwin";
    const results = [];
    const queue = [{ path: normalizedDir, depth: 0 }];
    let queueIndex = 0;
    while (queueIndex < queue.length && results.length < 24) {
      const directory = queue[queueIndex];
      queueIndex += 1;
      const scan = await scanExecutableCandidates(
        this,
        directory.path,
        directory.depth,
        isWindows,
        isMacOS,
        24 - results.length,
      );
      results.push(...scan.candidates);
      queue.push(...scan.children);
    }
    return [...new Set(results)];
  }
  invalidate(dir) {
    if (!dir) return;
    const normalized = String(dir).replace(/\\/g, "/").replace(/\/+$/, "");
    this.cache.delete(normalized);
    const pending = this.pending.get(normalized);
    if (pending) pending.stale = true;
    this.pending.delete(normalized);
    for (const path of this.iconCache.keys()) {
      if (path === normalized || path.startsWith(`${normalized}/`))
        this.iconCache.delete(path);
    }
  }
  getLastError() {
    return this.lastError;
  }
  getDirectory(executablePath) {
    return getParentPath(executablePath);
  }
  async getIconDataUrl(executablePath) {
    const path = String(executablePath).replace(/\\/g, "/");
    const cached = this.iconCache.get(path);
    if (cached && cached.expiresAt > Date.now()) {
      this.iconCache.delete(path);
      this.iconCache.set(path, cached);
      return cached.value;
    }
    if (cached) this.iconCache.delete(path);
    if (this.pendingIcons.has(path)) return this.pendingIcons.get(path);
    const request = this.getIconDataUrlUncached(path)
      .then((value) => {
        while (this.iconCache.size >= this.maxIconCacheEntries)
          this.iconCache.delete(this.iconCache.keys().next().value);
        this.iconCache.set(path, {
          value,
          expiresAt: Date.now() + this.iconCacheTtlMs,
        });
        return value;
      })
      .finally(() => this.pendingIcons.delete(path));
    this.pendingIcons.set(path, request);
    return request;
  }
  async getIconDataUrlUncached(executablePath) {
    try {
      const executableDir = this.getDirectory(executablePath);
      const entries = await Neutralino.filesystem.readDirectory(executableDir);
      const iconMimeTypes = {
        ".ico": "image/x-icon",
        ".icns": "image/x-icns",
        ".png": "image/png",
        ".svg": "image/svg+xml",
      };
      const files = entries.filter((entry) => {
        const extension = entry.entry
          .slice(entry.entry.lastIndexOf("."))
          .toLowerCase();
        return entry.type === "FILE" && extension in iconMimeTypes;
      });
      const executableName = executablePath
        .split(/[\\/]/)
        .at(-1)
        ?.replace(/\.[^.]+$/, "")
        .toLowerCase();
      const sidecarIcon =
        files.find(
          (entry) => entry.entry.toLowerCase() === `${executableName}.ico`,
        ) || files.find((entry) => entry.entry.toLowerCase().endsWith(".ico"));
      if (!sidecarIcon) {
        const embedded = await getEmbeddedIconDataUrl(executablePath);
        if (embedded) return embedded;
      }
      const icon = sidecarIcon || files[0];
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
      const sidecar = `data:${iconMimeTypes[extension]};base64,${window.btoa(binary)}`;
      return sidecar;
    } catch {
      return "";
    }
  }
};

var ExecutableService = _ExecutableService;

export { ExecutableService };
