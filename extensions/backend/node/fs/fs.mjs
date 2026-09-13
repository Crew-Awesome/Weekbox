import fs from "node:fs/promises";
import { constants } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import { flattenFolder } from "./flattener.mjs";

const execAsync = promisify(exec);
const isWin = process.platform === "win32";
const isDarwin = process.platform === "darwin";
const isLinux = process.platform === "linux";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Escapa los argumentos para la línea de comandos dependiendo del sistema operativo.
 * @param {string} arg - El argumento a escapar.
 * @returns {string} El argumento con el formato de escape correcto.
 */
function quoteShellArgument(arg) {
  if (isWin) return '"' + arg.replace(/"/g, '\\"') + '"';
  return "'" + arg.replace(/'/g, "'\\''") + "'";
}

let cached7zPath = null;

/**
 * Localiza el binario de 7za empaquetado con la aplicación según la plataforma.
 * @returns {Promise<string|null>} Ruta absoluta al ejecutable o null si no existe.
 */
async function getBundled7zPath() {
  if (cached7zPath) return cached7zPath;

  const binName = isWin
    ? "7za.exe"
    : isDarwin
      ? "7za-mac"
      : "7za-linux";

  const candidates = [
    path.resolve(__dirname, "../../bin", binName),
    path.resolve(__dirname, "../../../../app/assets/bin", binName),
    path.resolve(__dirname, "../../../app/assets/bin", binName),
    path.resolve(process.cwd(), "extensions/backend/bin", binName),
    path.resolve(process.cwd(), "app/assets/bin", binName),
    path.resolve(process.cwd(), "bin", binName),
  ];

  if (process.env.NL_PATH) {
    candidates.unshift(
      path.resolve(process.env.NL_PATH, "extensions/backend/bin", binName),
      path.resolve(process.env.NL_PATH, "app/assets/bin", binName),
      path.resolve(process.env.NL_PATH, "bin", binName)
    );
  }

  for (const candidate of candidates) {
    try {
      await fs.access(candidate, constants.F_OK);
      if (!isWin) {
        await fs.chmod(candidate, 0o755).catch(() => {});
      }
      cached7zPath = candidate;
      return candidate;
    } catch {}
  }

  return null;
}

/**
 * Analiza una linea de salida de herramientas de extraccion (7z, tar, unzip)
 * y extrae el nombre del archivo en proceso.
 * @param {string} rawLine - Linea cruda de stdout o stderr.
 * @returns {string|null} Nombre relativo del archivo o null si no corresponde.
 */
function parseExtractedFileName(rawLine) {
  if (!rawLine) return null;
  const line = rawLine.trim();
  if (!line) return null;

  const match7z = line.match(/^Extracting\s+(.+)$/i);
  if (match7z) {
    const candidate = match7z[1].trim();
    return candidate.endsWith("/") || candidate.endsWith("\\") ? null : candidate;
  }

  const matchUnzip = line.match(/^(?:inflating|extracting):\s+(.+)$/i);
  if (matchUnzip) {
    const candidate = matchUnzip[1].trim();
    return candidate.endsWith("/") || candidate.endsWith("\\") ? null : candidate;
  }

  if (line.startsWith("x ")) {
    const candidate = line.substring(2).trim();
    return candidate.endsWith("/") || candidate.endsWith("\\") ? null : candidate;
  }

  if (
    !line.includes(":") &&
    !line.startsWith("7-Zip") &&
    !line.startsWith("Copyright") &&
    !line.startsWith("Scanning") &&
    !line.startsWith("Everything") &&
    (line.includes("/") || line.includes("\\") || line.includes("."))
  ) {
    if (!line.endsWith("/") && !line.endsWith("\\")) {
      return line;
    }
  }

  return null;
}

/**
 * Ejecuta un comando de extraccion capturando y transmitiendo los nombres de archivos extraidos en tiempo real.
 * @param {string} command - Comando a ejecutar.
 * @param {Function} [onFile] - Callback invocado con cada archivo extraido.
 * @returns {Promise<void>}
 */
function runExtractionCommand(command, onFile) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true });
    let stdoutBuffer = "";
    let stderrBuffer = "";
    let lastReportedTime = 0;

    const handleData = (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        const file = parseExtractedFileName(line);
        if (file && onFile) {
          const now = Date.now();
          if (now - lastReportedTime > 40) {
            lastReportedTime = now;
            onFile(file);
          }
        }
      }
    };

    child.stdout?.on("data", handleData);
    child.stderr?.on("data", (chunk) => {
      stderrBuffer += chunk.toString();
      handleData(chunk);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Extraction process failed with code ${code}: ${stderrBuffer || "Unknown error"}`));
      }
    });
  });
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
      type: stats.isDirectory() ? "DIRECTORY" : "FILE",
    };
  },

  /**
   * Lee el contenido de un directorio.
   * @param {string} targetPath - Ruta del directorio a leer.
   * @returns {Promise<Array<{entry: string, type: "DIRECTORY" | "FILE"}>>} Los elementos dentro del directorio.
   */
  async readDirectory(targetPath) {
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    return entries.map((e) => ({
      entry: e.name,
      type: e.isDirectory() ? "DIRECTORY" : "FILE",
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
    await fs.writeFile(targetPath, data, "utf-8");
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
    await fs.appendFile(targetPath, data, "utf-8");
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
    return await fs.readFile(targetPath, "utf-8");
  },

  /**
   * Lee un archivo como datos binarios (ArrayBuffer).
   * @param {string} targetPath - Ruta del archivo a leer.
   * @returns {Promise<ArrayBuffer>} Los datos leídos.
   */
  async readBinaryFile(targetPath) {
    const buffer = await fs.readFile(targetPath);
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
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
        const normalized = isWin ? targetPath.replace(/\//g, "\\") : targetPath;
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
      errorOnExist: options.skip ? true : false,
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
      if (err.code === "EXDEV") {
        await this.copy(source, dest, { recursive: true, overwrite: true });
        await this.remove(source);
      } else {
        throw err;
      }
    }
  },

  /**
   * Extrae un archivo comprimido (ZIP, TAR, GZ, RAR, 7Z) en una carpeta destino.
   * Soporta de forma robusta Linux, macOS (Darwin) y Windows con múltiples estrategias de fallback:
   * - Linux: unzip, 7za empaquetado, 7z/7za del sistema, python3 zipfile, tar.
   * - Darwin (macOS): ditto nativo, unzip, 7za empaquetado, 7z, tar.
   * - Windows: tar, 7za empaquetado, PowerShell Expand-Archive.
   * @param {string} archivePath - Ruta del archivo comprimido.
   * @param {string} destFolder - Carpeta destino.
   * @param {Function} [onFile] - Callback invocado con cada archivo extraído.
   */
  async extractArchive(archivePath, destFolder, onFile) {
    if (!(await this.exists(destFolder))) {
      await this.createDirectory(destFolder);
    }
    const normalizedArchive = isWin
      ? archivePath.replace(/\//g, "\\")
      : archivePath;
    const normalizedDest = isWin ? destFolder.replace(/\//g, "\\") : destFolder;

    const qArchive = quoteShellArgument(normalizedArchive);
    const qDest = quoteShellArgument(normalizedDest);

    const lowerArchive = archivePath.toLowerCase();
    const isZip = lowerArchive.endsWith(".zip");
    const isTar =
      lowerArchive.endsWith(".tar") ||
      lowerArchive.endsWith(".tar.gz") ||
      lowerArchive.endsWith(".tgz") ||
      lowerArchive.endsWith(".tar.bz2") ||
      lowerArchive.endsWith(".tbz2") ||
      lowerArchive.endsWith(".tar.xz") ||
      lowerArchive.endsWith(".txz");

    const bundled7z = await getBundled7zPath();
    const q7z = bundled7z ? quoteShellArgument(bundled7z) : null;

    const commandsToTry = [];

    if (isDarwin) {
      if (isZip) {
        commandsToTry.push(`ditto -V -xk ${qArchive} ${qDest}`);
        commandsToTry.push(`unzip -o ${qArchive} -d ${qDest}`);
        if (q7z) commandsToTry.push(`${q7z} x -y -aoa -o${qDest} ${qArchive}`);
        commandsToTry.push(`tar -xvf ${qArchive} -C ${qDest}`);
      } else if (isTar) {
        commandsToTry.push(`tar -xvf ${qArchive} -C ${qDest}`);
        if (q7z) commandsToTry.push(`${q7z} x -y -aoa -o${qDest} ${qArchive}`);
      } else {
        if (q7z) commandsToTry.push(`${q7z} x -y -aoa -o${qDest} ${qArchive}`);
        commandsToTry.push(`7z x -y -aoa -o${qDest} ${qArchive}`);
        commandsToTry.push(`ditto -V -xk ${qArchive} ${qDest}`);
        commandsToTry.push(`tar -xvf ${qArchive} -C ${qDest}`);
      }
    } else if (isLinux) {
      if (isZip) {
        commandsToTry.push(`unzip -o ${qArchive} -d ${qDest}`);
        if (q7z) commandsToTry.push(`${q7z} x -y -aoa -o${qDest} ${qArchive}`);
        commandsToTry.push(`7z x -y -aoa -o${qDest} ${qArchive}`);
        commandsToTry.push(`7za x -y -aoa -o${qDest} ${qArchive}`);
        commandsToTry.push(`python3 -m zipfile -e ${qArchive} ${qDest}`);
        commandsToTry.push(`python -m zipfile -e ${qArchive} ${qDest}`);
        commandsToTry.push(`tar -xvf ${qArchive} -C ${qDest}`);
      } else if (isTar) {
        commandsToTry.push(`tar -xvf ${qArchive} -C ${qDest}`);
        if (q7z) commandsToTry.push(`${q7z} x -y -aoa -o${qDest} ${qArchive}`);
        commandsToTry.push(`7z x -y -aoa -o${qDest} ${qArchive}`);
      } else {
        if (q7z) commandsToTry.push(`${q7z} x -y -aoa -o${qDest} ${qArchive}`);
        commandsToTry.push(`7z x -y -aoa -o${qDest} ${qArchive}`);
        commandsToTry.push(`7za x -y -aoa -o${qDest} ${qArchive}`);
        commandsToTry.push(`unzip -o ${qArchive} -d ${qDest}`);
        commandsToTry.push(`tar -xvf ${qArchive} -C ${qDest}`);
      }
    } else {
      commandsToTry.push(`tar -xvf ${qArchive} -C ${qDest}`);
      if (q7z) commandsToTry.push(`${q7z} x -y -aoa -o${qDest} ${qArchive}`);
      const psCommand = `powershell -NoProfile -NonInteractive -Command "Expand-Archive -LiteralPath '${normalizedArchive.replace(/'/g, "''")}' -DestinationPath '${normalizedDest.replace(/'/g, "''")}' -Force"`;
      commandsToTry.push(psCommand);
    }

    let extracted = false;
    const errors = [];

    for (const cmd of commandsToTry) {
      try {
        await runExtractionCommand(cmd, onFile);
        extracted = true;
        break;
      } catch (err) {
        errors.push(`[${cmd}]: ${err.message || String(err)}`);
      }
    }

    if (!extracted) {
      throw new Error(
        `Failed to extract archive "${archivePath}". Attempted commands:\n${errors.join("\n")}`
      );
    }

    try {
      if (typeof onFile === "function") {
        onFile("__FLATTENING_START__");
      }
      await flattenFolder(destFolder);
    } catch (flattenErr) {
      console.warn(`[fs.extractArchive] Warning: Failed to flatten folder "${destFolder}":`, flattenErr);
    }
  },

  /**
   * Aplanes las carpetas anidadas de un mod buscando .json o .exe como fondo.
   * @param {string} targetFolder - Carpeta a aplanar.
   */
  async flattenFolder(targetFolder) {
    return await flattenFolder(targetFolder);
  },
};
