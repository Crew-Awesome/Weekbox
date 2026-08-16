import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import os from 'node:os';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const isWin = process.platform === "win32";

/**
 * Escapa los argumentos para la línea de comandos dependiendo del sistema operativo.
 * @param {string} arg - El argumento a escapar.
 * @returns {string} El argumento con el formato de escape correcto.
 */
function quoteShellArgument(arg) {
  if (isWin) return '"' + arg.replace(/"/g, '\\"') + '"';
  return "'" + arg.replace(/'/g, "'\\\\''") + "'";
}

/**
 * Módulo de API puro para Node.js File System.
 * Se encarga de proveer acceso nativo y rápido al disco para Weekbox.
 */
export const fsApi = {
  /**
   * Obtiene las estadísticas de un archivo o directorio.
   * @param {string} targetPath - Ruta absoluta o relativa.
   * @returns {Promise<{size: number, isDirectory: boolean, isFile: boolean, type: "DIRECTORY" | "FILE"}>} Estadísticas.
   */
  async getStats(targetPath) {
    const stats = await fs.stat(targetPath);
    return { 
      size: stats.size, 
      isDirectory: stats.isDirectory(), 
      isFile: stats.isFile(), 
      type: stats.isDirectory() ? "DIRECTORY" : "FILE" 
    };
  },

  /**
   * Lee el contenido de un directorio.
   * @param {string} targetPath - Ruta del directorio a leer.
   * @returns {Promise<Array<{entry: string, type: "DIRECTORY" | "FILE"}>>} Los elementos dentro del directorio.
   */
  async readDirectory(targetPath) {
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    return entries.map(e => ({ 
      entry: e.name, 
      type: e.isDirectory() ? "DIRECTORY" : "FILE" 
    }));
  },

  /**
   * Comprueba si un archivo o directorio existe en el disco.
   * @param {string} targetPath - Ruta absoluta o relativa.
   * @returns {Promise<boolean>} Devuelve true si el elemento existe.
   */
  async exists(targetPath) {
    try { 
      await fs.access(targetPath, constants.F_OK); 
      return true; 
    } catch { 
      return false; 
    }
  },

  /**
   * Crea un directorio (y sus carpetas padres si no existen).
   * @param {string} targetPath - Ruta donde se creará el directorio.
   * @returns {Promise<void>}
   */
  async createDirectory(targetPath) {
    await fs.mkdir(targetPath, { recursive: true });
  },

  /**
   * Escribe contenido en un archivo de texto. Si el archivo no existe, lo crea.
   * @param {string} targetPath - Ruta del archivo.
   * @param {string} data - El texto a guardar.
   * @returns {Promise<void>}
   */
  async writeFile(targetPath, data) {
    await fs.writeFile(targetPath, data, 'utf-8');
  },

  /**
   * Escribe datos binarios (ArrayBuffer, Buffer) en un archivo.
   * @param {string} targetPath - Ruta del archivo binario.
   * @param {ArrayBuffer|Buffer} data - Los datos binarios a escribir.
   * @returns {Promise<void>}
   */
  async writeBinaryFile(targetPath, data) {
    await fs.writeFile(targetPath, Buffer.from(data));
  },

  /**
   * Adjunta texto al final de un archivo existente.
   * @param {string} targetPath - Ruta del archivo.
   * @param {string} data - El texto a añadir.
   * @returns {Promise<void>}
   */
  async appendFile(targetPath, data) {
    await fs.appendFile(targetPath, data, 'utf-8');
  },

  /**
   * Adjunta datos binarios al final de un archivo existente.
   * @param {string} targetPath - Ruta del archivo.
   * @param {ArrayBuffer|Buffer} data - Los datos binarios a añadir.
   * @returns {Promise<void>}
   */
  async appendBinaryFile(targetPath, data) {
    await fs.appendFile(targetPath, Buffer.from(data));
  },

  /**
   * Lee todo el contenido de un archivo como texto UTF-8.
   * @param {string} targetPath - Ruta del archivo a leer.
   * @returns {Promise<string>} El contenido de texto.
   */
  async readFile(targetPath) {
    return await fs.readFile(targetPath, 'utf-8');
  },

  /**
   * Lee un archivo como datos binarios (ArrayBuffer).
   * @param {string} targetPath - Ruta del archivo a leer.
   * @returns {Promise<ArrayBuffer>} Los datos leídos.
   */
  async readBinaryFile(targetPath) {
    const buffer = await fs.readFile(targetPath);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  },

  /**
   * Elimina un archivo o un directorio de forma recursiva (rm -rf).
   * Falla limpiamente si el directorio no existe.
   * @param {string} targetPath - Ruta del archivo/directorio a eliminar.
   * @returns {Promise<void>}
   */
  async remove(targetPath) {
    try {
      await fs.rm(targetPath, { recursive: true, force: true });
    } catch (err) {
      if (await this.exists(targetPath)) {
        const normalized = isWin ? targetPath.replace(/\//g, '\\') : targetPath;
        const command = isWin 
          ? `cmd /c rmdir /S /Q ${quoteShellArgument(normalized)}` 
          : `rm -rf ${quoteShellArgument(normalized)}`;
        await execAsync(command);
      }
    }
  },

  /**
   * Copia un archivo o directorio a un nuevo destino.
   * @param {string} source - Ruta de origen.
   * @param {string} dest - Ruta de destino.
   * @param {{recursive?: boolean, overwrite?: boolean, skip?: boolean}} options - Opciones.
   * @returns {Promise<void>}
   */
  async copy(source, dest, options = {}) {
    await fs.cp(source, dest, { 
      recursive: options.recursive ?? true, 
      force: options.overwrite ?? true, 
      errorOnExist: options.skip ? true : false 
    });
  },

  /**
   * Mueve un archivo o directorio a un nuevo destino.
   * Si ocurre un error EXDEV (entre distintos discos), usa copy() + remove().
   * @param {string} source - Ruta de origen.
   * @param {string} dest - Ruta de destino.
   * @param {{recursive?: boolean, overwrite?: boolean}} options - Opciones.
   * @returns {Promise<void>}
   */
  async move(source, dest, options = {}) {
    try { 
      await fs.rename(source, dest); 
    } catch (err) {
      if (err.code === 'EXDEV') {
        await this.copy(source, dest, { recursive: true, overwrite: true });
        await this.remove(source);
      } else {
        throw err;
      }
    }
  }
};
