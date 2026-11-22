async function replaceFile(sourcePath, destinationPath) {
  if (!(await APIneuFileSystem.exists(destinationPath))) {
    await moveFileAndConfirm(sourcePath, destinationPath);
    return;
  }
  const backupPath = `${destinationPath}.weekbox-backup-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
  await moveFileAndConfirm(destinationPath, backupPath);
  try {
    await moveFileAndConfirm(sourcePath, destinationPath);
  } catch (error) {
    const [backupExists, destinationExists] = await Promise.all([
      APIneuFileSystem.exists(backupPath),
      APIneuFileSystem.exists(destinationPath),
    ]);
    if (backupExists && !destinationExists) {
      try {
        await moveFileAndConfirm(backupPath, destinationPath);
      } catch (restoreError) {
        throw new Error(
          `Could not replace ${destinationPath}; the original file is preserved at ${backupPath}. ${restoreError?.message || restoreError}`,
          { cause: error },
        );
      }
    } else if (backupExists) {
      throw new Error(
        `Could not confirm the replacement of ${destinationPath}; the original file is preserved at ${backupPath}. ${error?.message || error}`,
        { cause: error },
      );
    }
    throw error;
  }
  await APIneuFileSystem.remove(backupPath).catch((error) =>
    console.warn("WeekBox storage: could not remove the previous file backup.", error),
  );
}

async function moveFileAndConfirm(sourcePath, destinationPath) {
  const maxAttempts = window.NL_OS === "Windows" ? 8 : 5;
  await APIneuFileSystem.move(sourcePath, destinationPath, { maxAttempts });
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const [sourceExists, destinationExists] = await Promise.all([
      APIneuFileSystem.exists(sourcePath),
      APIneuFileSystem.exists(destinationPath),
    ]);
    if (!sourceExists && destinationExists) return;
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 150));
    }
  }
  throw new Error(
    `WeekBox could not confirm moving ${sourcePath} to ${destinationPath}.`,
  );
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

async function pathIsConfirmedAbsent(path, visited = new Set()) {
  const rawPath = String(path).replace(/\\/g, "/");
  const normalized =
    rawPath.replace(/\/+$/, "") || (rawPath.startsWith("/") ? "/" : "");
  if (
    !normalized ||
    normalized === "/" ||
    /^[a-z]:\/?$/i.test(normalized) ||
    /^\/\/[^/]+\/[^/]+$/.test(normalized) ||
    visited.has(normalized)
  ) {
    return false;
  }
  visited.add(normalized);
  const drivePath = normalized.match(/^([a-z]:)\/(.+)$/i);
  const separator = normalized.lastIndexOf("/");
  if (separator < 0 && !drivePath) return false;
  const parent = drivePath
    ? separator === 2
      ? `${drivePath[1]}/`
      : normalized.slice(0, separator)
    : normalized.slice(0, separator) || "/";
  const basename = normalized.slice(separator + 1);
  let entries;
  try {
    entries = await Neutralino.filesystem.readDirectory(parent);
  } catch (error) {
    if (
      error?.code === "NE_FS_NOPATHE" &&
      (await pathIsConfirmedAbsent(parent, visited))
    ) {
      return true;
    }
    throw error;
  }
  return !entries.some((entry) =>
    window.NL_OS === "Windows"
      ? String(entry.entry).toLocaleLowerCase() === basename.toLocaleLowerCase()
      : String(entry.entry) === basename,
  );
}

var APIneuFileSystem = {
  async exists(path) {
    if (typeof path !== "string" || !path.trim()) return false;
    try {
      await Neutralino.filesystem.getStats(path);
      return true;
    } catch (error) {
      if (error?.code === "NE_FS_NOPATHE") {
        if (await pathIsConfirmedAbsent(path)) return false;
      }
      throw error;
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
    } catch (error) {
      await this.remove(temporaryPath).catch(() => {});
      throw new Error(
        `Could not replace ${path} atomically: ${error?.message || error}`,
        { cause: error },
      );
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

    await Neutralino.filesystem.remove(normalizedPath);
    if (await this.exists(normalizedPath)) {
      throw new Error(`WeekBox could not remove ${normalizedPath}.`);
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
    if (await this.exists(normalizedDest)) {
      throw new Error(
        `WeekBox could not move ${normalizedSource} because ${normalizedDest} already exists.`,
      );
    }

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
    throw lastError;
  },
};

export { APIneuFileSystem };
