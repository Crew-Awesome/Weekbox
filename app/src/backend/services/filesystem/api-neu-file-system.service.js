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
    const normalizedPath = path.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');
    let currentPath = parts[0];
    
    for (let i = 1; i < parts.length; i++) {
      currentPath += '/' + parts[i];
      if (currentPath === '' || currentPath.endsWith(':')) continue;
      
      const exists = await this.exists(currentPath);
      if (!exists) {
        try {
          await Neutralino.filesystem.createDirectory(currentPath);
        } catch (error) {
          if (error.code !== 'NE_FS_DIRCRER' && error.code !== 'EEXIST') {
            console.warn(`No se pudo crear el directorio: ${currentPath}`, error);
          }
        }
      }
    }
    
    if (!await this.exists(path)) {
      throw new Error(`Directory was not created: ${path}`);
    }
  },
  /**
   * Escribe datos en un archivo. Reemplaza el archivo si ya existe.
   */
  async write(path, data, isBinary = false) {
    if (isBinary) {
      await Neutralino.filesystem.writeBinaryFile(path, data);
    } else {
      await Neutralino.filesystem.writeFile(path, data);
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
