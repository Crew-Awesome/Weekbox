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
    service.lastError = describeFileSystemError(error);
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
      const cached = this.cache.get(normalizedDir);
      try {
        await Neutralino.filesystem.getStats(cached);
        return cached;
      } catch {
        this.cache.delete(normalizedDir);
      }
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
        isWindows,
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
  async findAll(dir) {
    if (!dir) return [];
    const normalizedDir = String(dir).replace(/\\/g, "/").replace(/\/+$/, "");
    if (window.NL_OS === "Windows") {
      try {
        const result = await Neutralino.os.execCommand(
          `where.exe /r "${normalizedDir.replace(/\//g, "\\")}" *.exe`,
          { background: false },
        );
        if (result?.exitCode === 0) {
          return [
            ...new Set(
              String(result.stdOut || "")
                .split(/\r?\n/)
                .map((path) => path.trim().replace(/\\/g, "/"))
                .filter(
                  (path) => !isExcludedExecutable(path.split("/").at(-1)),
                ),
            ),
          ].slice(0, 24);
        }
      } catch {}
    }
    const executable = await this.find(normalizedDir);
    return executable ? [executable] : [];
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
