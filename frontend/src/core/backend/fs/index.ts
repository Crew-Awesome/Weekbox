import { platform } from "../../platform";
import type { BackendOperation } from "../types";

/**
 * @description Interfaz unificada para el File System (FS).
 * Se comunica exclusivamente con el backend en Node.js, ofreciendo un API crudo (Raw) de manipulación de archivos y carpetas.
 */
export const fs = {
  /**
   * @description Lee el contenido de un directorio.
   * @param {string} path - La ruta del directorio a leer.
   * @returns {Promise<Array<{entry: string, type: 'FILE' | 'DIRECTORY'}>>} Elementos del directorio.
   */
  async readDirectory(path: string) {
    return await platform.call("fs.readDirectory" as BackendOperation, {
      path,
    });
  },

  /**
   * @description Crea un directorio.
   * @param {string} path - La ruta del directorio a crear.
   * @returns {Promise<void>}
   */
  async createDirectory(path: string) {
    return await platform.call("fs.createDirectory" as BackendOperation, {
      path,
    });
  },

  /**
   * @description Lee un archivo como texto a través de Node.
   * @param {string} path - La ruta del archivo a leer.
   * @returns {Promise<string>} El contenido del archivo en formato de texto.
   */
  async readFile(path: string) {
    return await platform.call("fs.readFile" as BackendOperation, { path });
  },

  /**
   * @description Lee un archivo binario a través de Node.
   * @param {string} path - La ruta del archivo binario.
   * @returns {Promise<ArrayBuffer>} El contenido del archivo.
   */
  async readBinaryFile(path: string) {
    return await platform.call("fs.readBinaryFile" as BackendOperation, {
      path,
    });
  },

  /**
   * @description Escribe texto en un archivo a través de Node.
   * @param {string} path - La ruta destino del archivo.
   * @param {string} content - El contenido de texto a escribir.
   * @returns {Promise<void>}
   */
  async writeFile(path: string, content: string) {
    return await platform.call("fs.writeFile" as BackendOperation, {
      path,
      content,
    });
  },

  /**
   * @description Escribe contenido binario en un archivo a través de Node.
   * @param {string} path - La ruta destino del archivo.
   * @param {ArrayBuffer} content - El contenido binario a escribir.
   * @returns {Promise<void>}
   */
  async writeBinaryFile(path: string, content: ArrayBuffer) {
    return await platform.call("fs.writeBinaryFile" as BackendOperation, {
      path,
      content,
    });
  },

  /**
   * @description Verifica si un archivo o carpeta existe.
   * @param {string} path - La ruta a verificar.
   * @returns {Promise<boolean>}
   */
  async exists(path: string) {
    return await platform.call("fs.exists" as BackendOperation, { path });
  },

  /**
   * @description Elimina un archivo o directorio de forma recursiva y segura usando Node.
   * @param {string} path - La ruta del archivo o directorio a eliminar.
   * @returns {Promise<void>}
   */
  async remove(path: string) {
    return await platform.call("fs.remove" as BackendOperation, { path });
  },

  /**
   * @description Obtiene las estadísticas de un archivo o carpeta.
   * @param {string} path - La ruta.
   * @returns {Promise<{size: number, isDirectory: boolean, isFile: boolean, type: string}>}
   */
  async getStats(path: string) {
    return await platform.call("fs.getStats" as BackendOperation, { path });
  },

  /**
   * @description Extrae un archivo comprimido (ZIP, TAR, GZ, RAR) en una carpeta destino.
   * @param {string} archivePath - La ruta del archivo comprimido.
   * @param {string} destFolder - La carpeta destino.
   * @returns {Promise<void>}
   */
  async extractArchive(archivePath: string, destFolder: string) {
    return await platform.call("fs.extractArchive" as BackendOperation, {
      archivePath,
      destFolder,
    });
  },
};

export default fs;
