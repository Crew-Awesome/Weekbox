function quoteShellArgument(value) {
  const argument = String(value ?? "").replace(/[\r\n]/g, "");
  if (window.NL_OS === "Windows") {
    return `"${argument.replace(/["^%]/g, "^$&")}"`;
  }
  return `'${argument.replaceAll("'", "'\"'\"'")}'`;
}

var APIneuFileSystem = {
  /**
   * Comprueba si un archivo o directorio existe.
   */
  async exists(path) {
    if (typeof path !== "string" || !path.trim()) return false;
    try {
      await Neutralino.filesystem.getStats(path);
      return true;
    } catch (error) {
      return false;
    }
  },
  /**
   * Asegura que un directorio exista. Si no existe, lo crea.
   */
  async ensureDir(path) {
    if (typeof path !== "string" || !path.trim()) {
      throw new Error(
        "WeekBox could not create a storage folder because its path is missing.",
      );
    }
    const normalizedPath = path.replace(/\\/g, "/").replace(/\/+$/, "");
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
  /**
   * Escribe datos en un archivo. Reemplaza el archivo si ya existe.
   */
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
  /**
   * Agrega datos al final de un archivo existente.
   */
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
  /**
   * Lee el contenido de un archivo.
   */
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
  /**
   * Borra un archivo o directorio.
   */
  async remove(path) {
    if (typeof path !== "string" || !path.trim()) return;
    const normalizedPath = String(path).replace(/\\/g, "/");
    const exists = await this.exists(normalizedPath);
    if (!exists) return;

    try {
      await Neutralino.filesystem.remove(normalizedPath);
      return;
    } catch (error) {
      // Native remove can fail if path is a non-empty directory
    }

    if (await this.exists(normalizedPath)) {
      try {
        const isWin = window.NL_OS === "Windows";
        const stats = await Neutralino.filesystem
          .getStats(normalizedPath)
          .catch(() => null);
        const command = isWin
          ? stats?.isDirectory
            ? `cmd /c rmdir /S /Q ${quoteShellArgument(normalizedPath.replace(/\//g, "\\"))}`
            : `cmd /c del /F /Q ${quoteShellArgument(normalizedPath.replace(/\//g, "\\"))}`
          : `rm -rf ${quoteShellArgument(normalizedPath)}`;
        const result = await Neutralino.os.execCommand(command, {
          background: false,
        });
        if (result?.exitCode === 0 || !(await this.exists(normalizedPath))) {
          return;
        }
      } catch (cmdError) {
        console.warn("Recursive removal fallback failed:", cmdError);
      }
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
    let sourceExists = false;
    // ponytail: bounded source-visibility polling; use native filesystem events if delayed extraction persists.
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (await this.exists(normalizedSource)) {
        sourceExists = true;
        break;
      }
      if (await this.exists(normalizedDest)) return;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 150));
      }
    }
    if (!sourceExists) {
      throw new Error(
        `WeekBox could not move ${normalizedSource} because it does not exist.`,
      );
    }

    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await Neutralino.filesystem.move(normalizedSource, normalizedDest);
        return;
      } catch (error) {
        lastError = error;
        if (
          !(await this.exists(normalizedSource)) &&
          (await this.exists(normalizedDest))
        ) {
          return;
        }
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 150));
        }
      }
    }

    try {
      let isDirectory = false;
      try {
        const stats = await Neutralino.filesystem.getStats(normalizedSource);
        isDirectory = Boolean(
          stats?.isDirectory || stats?.type === "DIRECTORY",
        );
      } catch {
        try {
          await Neutralino.filesystem.readDirectory(normalizedSource);
          isDirectory = true;
        } catch {
          isDirectory = false;
        }
      }

      if (isDirectory) {
        await this.ensureDir(normalizedDest);
        await Neutralino.filesystem.copy(normalizedSource, normalizedDest, {
          recursive: true,
          overwrite: true,
          skip: false,
        });
      } else {
        const separator = normalizedDest.lastIndexOf("/");
        if (separator > 0) {
          await this.ensureDir(normalizedDest.slice(0, separator));
        }
        await Neutralino.filesystem.copy(normalizedSource, normalizedDest, {
          recursive: false,
          overwrite: true,
          skip: false,
        });
      }

      if (await this.exists(normalizedDest)) {
        await this.remove(normalizedSource).catch(() => {});
        return;
      }
    } catch (fallbackError) {
      throw lastError || fallbackError;
    }
  },
};

export { APIneuFileSystem };
