var APIneuFileSystem = {
  /**
   * Comprueba si un archivo o directorio existe.
   */
  async exists(path) {
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
      throw new Error("WeekBox could not create a storage folder because its path is missing.");
    }
    const normalizedPath = path.replace(/\\/g, "/");
    if (await this.exists(normalizedPath)) return;
    try {
      await Neutralino.filesystem.createDirectory(normalizedPath);
    } catch (error) {
      if (!await this.exists(normalizedPath)) {
        throw new Error(`WeekBox could not create its storage folder at ${normalizedPath}. ${error?.message || error}`);
      }
    }
    if (!await this.exists(normalizedPath)) {
      throw new Error(`WeekBox could not create its storage folder at ${normalizedPath}.`);
    }
  },
  /**
   * Escribe datos en un archivo. Reemplaza el archivo si ya existe.
   */
  async write(path, data, isBinary = false) {
    if (typeof path !== 'string' || !path.trim()) {
      throw new Error('WeekBox could not write storage data because the destination path is missing.');
    }
    if (data === undefined || data === null) {
      throw new Error(`WeekBox could not write ${path} because the file contents are missing.`);
    }
    const normalizedPath = String(path).replace(/\\/g, '/');
    const separator = normalizedPath.lastIndexOf('/');
    if (separator > 0) await this.ensureDir(normalizedPath.slice(0, separator));
    try {
      if (isBinary) {
        await Neutralino.filesystem.writeBinaryFile(path, data);
      } else {
        await Neutralino.filesystem.writeFile(path, data);
      }
    } catch (error) {
      const fileName = normalizedPath.slice(separator + 1) || normalizedPath;
      throw new Error(`WeekBox could not write ${fileName}. Check that its storage folder is writable and has free space. ${error?.message || error}`);
    }
  },
  /**
   * Agrega datos al final de un archivo existente.
   */
  async append(path, data, isBinary = false) {
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
    const exists = await this.exists(path);
    if (exists) {
      await Neutralino.filesystem.remove(path);
    }
  }
};

export { APIneuFileSystem };
