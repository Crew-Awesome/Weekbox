import fs from "node:fs/promises";
import { constants } from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const isWin = process.platform === "win32";

/**
 * Escapes argument for command line execution.
 * @param {string} arg
 * @returns {string}
 */
function quoteShellArgument(arg) {
  if (isWin) return '"' + arg.replace(/"/g, '\\"') + '"';
  return "'" + arg.replace(/'/g, "'\\''") + "'";
}

/**
 * Atomic I/O file system operations (SRP).
 */
export const fsIoApi = {
  async getStats(targetPath) {
    const stats = await fs.stat(targetPath);
    return {
      size: stats.size,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      type: stats.isDirectory() ? "DIRECTORY" : "FILE",
    };
  },

  async readDirectory(targetPath) {
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    return entries.map((e) => ({
      entry: e.name,
      type: e.isDirectory() ? "DIRECTORY" : "FILE",
    }));
  },

  async exists(targetPath) {
    try {
      await fs.access(targetPath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  },

  async createDirectory(targetPath) {
    await fs.mkdir(targetPath, { recursive: true });
  },

  async writeFile(targetPath, data) {
    await fs.writeFile(targetPath, data, "utf-8");
  },

  async writeBinaryFile(targetPath, data) {
    await fs.writeFile(targetPath, Buffer.from(data));
  },

  async appendFile(targetPath, data) {
    await fs.appendFile(targetPath, data, "utf-8");
  },

  async appendBinaryFile(targetPath, data) {
    await fs.appendFile(targetPath, Buffer.from(data));
  },

  async readFile(targetPath) {
    return await fs.readFile(targetPath, "utf-8");
  },

  async readBinaryFile(targetPath) {
    const buffer = await fs.readFile(targetPath);
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
  },

  async remove(targetPath) {
    try {
      await fs.rm(targetPath, { recursive: true, force: true });
    } catch (err) {
      if (await this.exists(targetPath)) {
        const normalized = isWin ? targetPath.replace(/\//g, "\\") : targetPath;
        const command = isWin
          ? `cmd /c rmdir /S /Q ${quoteShellArgument(normalized)}`
          : `rm -rf ${quoteShellArgument(normalized)}`;
        await execAsync(command);
      }
    }
  },

  async copy(source, dest, options = {}) {
    await fs.cp(source, dest, {
      recursive: options.recursive ?? true,
      force: options.overwrite ?? true,
      errorOnExist: options.skip ? true : false,
    });
  },

  async move(source, dest, options = {}) {
    try {
      await fs.rename(source, dest);
    } catch (err) {
      if (err.code === "EXDEV") {
        await this.copy(source, dest, { recursive: true, overwrite: true });
        await this.remove(source);
      } else {
        throw err;
      }
    }
  },
};
