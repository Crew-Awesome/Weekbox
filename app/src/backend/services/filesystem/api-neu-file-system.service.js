function quoteShellArgument(value) {
  const argument = String(value ?? "").replace(/[\r\n]/g, "");
  if (window.NL_OS === "Windows") {
    return `"${argument.replace(/["^%]/g, "^$&")}"`;
  }
  return `'${argument.replaceAll("'", "'\"'\"'")}'`;
}

async function replaceFile(sourcePath, destinationPath) {
  if (!(await APIneuFileSystem.exists(destinationPath))) {
    await Neutralino.filesystem.move(sourcePath, destinationPath);
    return;
  }

  const source =
    window.NL_OS === "Windows" ? sourcePath.replaceAll("/", "\\") : sourcePath;
  const destination =
    window.NL_OS === "Windows"
      ? destinationPath.replaceAll("/", "\\")
      : destinationPath;
  const command =
    window.NL_OS === "Windows"
      ? `cmd /c move /Y ${quoteShellArgument(source)} ${quoteShellArgument(destination)}`
      : `mv -f ${quoteShellArgument(source)} ${quoteShellArgument(destination)}`;
  await Neutralino.os.execCommand(command, { background: false });
}

function getRemovalCommand(path, isDirectory) {
  if (window.NL_OS !== "Windows") {
    return `rm -rf ${quoteShellArgument(path)}`;
  }
  const windowsPath = quoteShellArgument(path.replace(/\//g, "\\"));
  return isDirectory
    ? `cmd /c rmdir /S /Q ${windowsPath}`
    : `cmd /c del /F /Q ${windowsPath}`;
}

async function removeWithCommand(path) {
  const stats = await Neutralino.filesystem.getStats(path).catch(() => null);
  const command = getRemovalCommand(path, Boolean(stats?.isDirectory));
  await Neutralino.os.execCommand(command, { background: false });
}

async function waitForMoveSource(api, source, destination, maxAttempts) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (await api.exists(source)) return true;
    if (await api.exists(destination)) return false;
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 150));
    }
  }
  return false;
}

async function moveWithRetries(source, destination, maxAttempts) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await Neutralino.filesystem.move(source, destination);
      return null;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 150));
      }
    }
  }
  return lastError;
}

async function copyMoveFallback(api, source, destination, lastError) {
  let isDirectory = false;
  try {
    const stats = await Neutralino.filesystem.getStats(source);
    isDirectory = Boolean(stats?.isDirectory || stats?.type === "DIRECTORY");
  } catch {
    try {
      await Neutralino.filesystem.readDirectory(source);
      isDirectory = true;
    } catch {}
  }

  if (isDirectory) {
    await api.ensureDir(destination);
  } else {
    const separator = destination.lastIndexOf("/");
    if (separator > 0) await api.ensureDir(destination.slice(0, separator));
  }
  await Neutralino.filesystem.copy(source, destination, {
    recursive: isDirectory,
    overwrite: true,
    skip: false,
  });
  if (await api.exists(destination)) {
    await api.remove(source);
    if (await api.exists(source)) {
      throw new Error(
        `WeekBox copied ${source} to ${destination} but could not remove the source.`,
      );
    }
    return true;
  }
  if (lastError) throw lastError;
  return false;
}

var APIneuFileSystem = {
  async exists(path) {
    if (typeof path !== "string" || !path.trim()) return false;
    try {
      await Neutralino.filesystem.getStats(path);
      return true;
    } catch {
      return false;
    }
  },

  async ensureDir(path) {
    if (typeof path !== "string" || !path.trim()) {
      throw new Error(
        "WeekBox could not create a storage folder because its path is missing.",
      );
    }
    const rawPath = path.replace(/\\/g, "/");
    const normalizedPath =
      rawPath.replace(/\/+$/, "") || (rawPath.startsWith("/") ? "/" : rawPath);
    if (normalizedPath === "/" || /^[a-zA-Z]:$/.test(normalizedPath)) return;
    if (await this.exists(normalizedPath)) return;
    const separator = normalizedPath.lastIndexOf("/");
    if (
      separator > 0 &&
      !/^[a-zA-Z]:$/.test(normalizedPath.slice(0, separator))
    ) {
      await this.ensureDir(normalizedPath.slice(0, separator));
    }
    try {
      await Neutralino.filesystem.createDirectory(normalizedPath);
    } catch (error) {
      if (!(await this.exists(normalizedPath))) {
        throw new Error(
          `WeekBox could not create its storage folder at ${normalizedPath}. ${error?.message || error}`,
        );
      }
    }
    if (!(await this.exists(normalizedPath))) {
      throw new Error(
        `WeekBox could not create its storage folder at ${normalizedPath}.`,
      );
    }
  },

  async write(path, data, isBinary = false) {
    if (typeof path !== "string" || !path.trim()) {
      throw new Error(
        "WeekBox could not write storage data because the destination path is missing.",
      );
    }
    if (data === undefined || data === null) {
      throw new Error(
        `WeekBox could not write ${path} because the file contents are missing.`,
      );
    }
    const normalizedPath = String(path).replace(/\\/g, "/");
    const separator = normalizedPath.lastIndexOf("/");
    if (separator > 0) await this.ensureDir(normalizedPath.slice(0, separator));
    try {
      if (isBinary) {
        await Neutralino.filesystem.writeBinaryFile(path, data);
      } else {
        await Neutralino.filesystem.writeFile(path, data);
      }
    } catch (error) {
      const fileName = normalizedPath.slice(separator + 1) || normalizedPath;
      throw new Error(
        `WeekBox could not write ${fileName}. Check that its storage folder is writable and has free space. ${error?.message || error}`,
      );
    }
  },

  async writeAtomic(path, data, isBinary = false) {
    if (typeof path !== "string" || !path.trim()) {
      throw new Error(
        "WeekBox could not write storage data because the destination path is missing.",
      );
    }
    const token =
      globalThis.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const temporaryPath = `${path}.tmp-${token}`;
    try {
      await this.write(temporaryPath, data, isBinary);
      await replaceFile(temporaryPath, path);
      if (!(await this.exists(path)) || (await this.exists(temporaryPath))) {
        throw new Error(`Could not replace ${path} atomically.`);
      }
    } catch (error) {
      await this.remove(temporaryPath).catch(() => {});
      throw error;
    }
  },

  async append(path, data, isBinary = false) {
    if (typeof path !== "string" || !path.trim()) {
      throw new Error(
        "WeekBox could not append storage data because the destination path is missing.",
      );
    }
    if (data === undefined || data === null) {
      throw new Error(
        `WeekBox could not append ${path} because the file contents are missing.`,
      );
    }
    if (isBinary) {
      await Neutralino.filesystem.appendBinaryFile(path, data);
    } else {
      await Neutralino.filesystem.appendFile(path, data);
    }
  },

  async read(path, isBinary = false) {
    if (typeof path !== "string" || !path.trim()) {
      throw new Error(
        "WeekBox could not read storage data because the source path is missing.",
      );
    }
    if (isBinary) {
      return await Neutralino.filesystem.readBinaryFile(path);
    } else {
      return await Neutralino.filesystem.readFile(path);
    }
  },

  async remove(path) {
    if (typeof path !== "string" || !path.trim()) return;
    const normalizedPath = String(path).replace(/\\/g, "/");
    const exists = await this.exists(normalizedPath);
    if (!exists) return;

    try {
      await Neutralino.filesystem.remove(normalizedPath);
      if (!(await this.exists(normalizedPath))) return;
    } catch {
      // Native remove can fail if path is a non-empty directory
    }

    const maxAttempts = window.NL_OS === "Windows" ? 3 : 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (!(await this.exists(normalizedPath))) return;
      try {
        await removeWithCommand(normalizedPath);
        if (!(await this.exists(normalizedPath))) return;
      } catch (cmdError) {
        console.warn("Recursive removal fallback failed:", cmdError);
      }
      if (attempt < maxAttempts)
        await new Promise((resolve) => setTimeout(resolve, attempt * 200));
    }

    if (await this.exists(normalizedPath)) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        await Neutralino.filesystem.remove(normalizedPath);
      } catch (error) {
        if (
          (await this.exists(normalizedPath)) ||
          /access|permission|denied/i.test(String(error?.message || error))
        ) {
          throw error;
        }
      }
    }
  },
  /**
   * @fix 2026-08-05T03:42:17.113Z - Fix NE_FS_MOVEERR during folder/file move
   */
  async move(sourcePath, destinationPath, options = {}) {
    if (typeof sourcePath !== "string" || !sourcePath.trim()) {
      throw new Error(
        "WeekBox could not move storage data because the source path is missing.",
      );
    }
    if (typeof destinationPath !== "string" || !destinationPath.trim()) {
      throw new Error(
        "WeekBox could not move storage data because the destination path is missing.",
      );
    }
    const normalizedSource = String(sourcePath).replace(/\\/g, "/");
    const normalizedDest = String(destinationPath).replace(/\\/g, "/");

    const maxAttempts =
      options.maxAttempts || (window.NL_OS === "Windows" ? 8 : 5);
    // Neutralino can expose extracted paths late; bounded polling avoids a move race.
    if (
      !(await waitForMoveSource(
        this,
        normalizedSource,
        normalizedDest,
        maxAttempts,
      ))
    ) {
      if (await this.exists(normalizedDest)) return;
      throw new Error(
        `WeekBox could not move ${normalizedSource} because it does not exist.`,
      );
    }

    const lastError = await moveWithRetries(
      normalizedSource,
      normalizedDest,
      maxAttempts,
    );
    if (!lastError) return;
    if (
      !(await this.exists(normalizedSource)) &&
      (await this.exists(normalizedDest))
    ) {
      return;
    }

    try {
      if (
        await copyMoveFallback(
          this,
          normalizedSource,
          normalizedDest,
          lastError,
        )
      )
        return;
    } catch (fallbackError) {
      throw lastError || fallbackError;
    }
  },
};

export { APIneuFileSystem };
