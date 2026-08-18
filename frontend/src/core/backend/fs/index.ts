import { platform } from "../../platform";
import type { BackendOperation } from "../types";

/**
 * @description Unified interface for the File System (FS).
 * Communicates exclusively with the Node.js backend, offering a raw API for manipulating files and directories.
 */
export const fs = {
  /**
   * @description Reads the contents of a directory.
   * @param {string} path - The path of the directory to read.
   * @returns {Promise<Array<{entry: string, type: 'FILE' | 'DIRECTORY'}>>} Directory entries.
   */
  async readDirectory(path: string) {
    return await platform.call("fs.readDirectory" as BackendOperation, {
      path,
    });
  },

  /**
   * @description Creates a directory.
   * @param {string} path - The path of the directory to create.
   * @returns {Promise<void>}
   */
  async createDirectory(path: string) {
    return await platform.call("fs.createDirectory" as BackendOperation, {
      path,
    });
  },

  /**
   * @description Reads a file as text via Node.
   * @param {string} path - The path of the file to read.
   * @returns {Promise<string>} The text content of the file.
   */
  async readFile(path: string) {
    return await platform.call("fs.readFile" as BackendOperation, { path });
  },

  /**
   * @description Reads a binary file via Node.
   * @param {string} path - The path of the binary file.
   * @returns {Promise<ArrayBuffer>} The binary content of the file.
   */
  async readBinaryFile(path: string) {
    return await platform.call("fs.readBinaryFile" as BackendOperation, {
      path,
    });
  },

  /**
   * @description Writes text content to a file via Node.
   * @param {string} path - The destination path of the file.
   * @param {string} content - The text content to write.
   * @returns {Promise<void>}
   */
  async writeFile(path: string, content: string) {
    return await platform.call("fs.writeFile" as BackendOperation, {
      path,
      content,
    });
  },

  /**
   * @description Writes binary content to a file via Node.
   * @param {string} path - The destination path of the file.
   * @param {ArrayBuffer} content - The binary content to write.
   * @returns {Promise<void>}
   */
  async writeBinaryFile(path: string, content: ArrayBuffer) {
    return await platform.call("fs.writeBinaryFile" as BackendOperation, {
      path,
      content,
    });
  },

  /**
   * @description Checks if a file or directory exists.
   * @param {string} path - The path to check.
   * @returns {Promise<boolean>} True if the path exists.
   */
  async exists(path: string) {
    return await platform.call("fs.exists" as BackendOperation, { path });
  },

  /**
   * @description Safely and recursively removes a file or directory via Node.
   * @param {string} path - The path of the file or directory to remove.
   * @returns {Promise<void>}
   */
  async remove(path: string) {
    return await platform.call("fs.remove" as BackendOperation, { path });
  },

  /**
   * @description Gets the statistics of a file or directory.
   * @param {string} path - The path to check.
   * @returns {Promise<{size: number, isDirectory: boolean, isFile: boolean, type: string}>} File stats.
   */
  async getStats(path: string) {
    return await platform.call("fs.getStats" as BackendOperation, { path });
  },

  /**
   * @description Extracts a compressed archive (ZIP, TAR, GZ, RAR) to a destination folder.
   * @param {string} archivePath - The path of the compressed archive.
   * @param {string} destFolder - The destination folder.
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
