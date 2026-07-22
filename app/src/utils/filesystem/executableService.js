import { getParentPath, getRealEntries } from "./pathUtils.js";

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

export class ExecutableService {
  async find(dir) {
    this.lastError = null;
    const isWindows = window.NL_OS === "Windows";
    const isMacOS = window.NL_OS === "Darwin";
    const directories = [dir];

    while (directories.length > 0) {
      const currentDir = directories.pop();
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
                    appEntry.entry === bundleExecutable,
                );
                if (executable) return `${macOSDirectory}/${executable.entry}`;

                const fallback = appEntries.find(
                  (appEntry) =>
                    String(appEntry.type).toUpperCase() === "FILE" &&
                    !appEntry.entry.includes("."),
                );
                if (fallback) return `${macOSDirectory}/${fallback.entry}`;
              } catch (error) {
                this.lastError = describeFileSystemError(error);
              }
            }
            directories.push(fullPath);
            continue;
          }
          if (
            entry.entry.toLowerCase().endsWith(".exe") ||
            (!isWindows &&
              !entry.entry.includes(".") &&
              entry.entry !== "CodeResources")
          ) {
            return fullPath;
          }
        }
      } catch (error) {
        this.lastError = describeFileSystemError(error);
        console.warn(
          "Could not inspect engine directory:",
          currentDir,
          this.lastError,
        );
      }
    }

    if (isWindows) {
      try {
        const result = await Neutralino.os.execCommand(
          `where.exe /r "${dir.replace(/\//g, "\\")}" *.exe`,
          { background: false },
        );
        if (result.exitCode === 0) {
          return (
            (result.stdOut || "")
              .split(/\r?\n/)
              .map((path) => path.trim())
              .find(Boolean) || null
          );
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
}
