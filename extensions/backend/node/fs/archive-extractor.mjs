import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { flattenFolder } from "./flattener.mjs";
import { fsIoApi } from "./fs-io.mjs";

const isWin = process.platform === "win32";
const isDarwin = process.platform === "darwin";
const isLinux = process.platform === "linux";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Escapes argument for command line execution.
 * @param {string} arg
 * @returns {string}
 */
export function quoteShellArgument(arg) {
  if (isWin) return '"' + arg.replace(/"/g, '\\"') + '"';
  return "'" + arg.replace(/'/g, "'\\''") + "'";
}

let cached7zPath = null;

/**
 * Locates bundled 7za binary according to platform.
 * @returns {Promise<string|null>}
 */
export async function getBundled7zPath() {
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
 * Parses extraction output lines to extract relative file paths.
 * @param {string} rawLine
 * @returns {string|null}
 */
export function parseExtractedFileName(rawLine) {
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
 * Executes an extraction command capturing extracted files in real-time.
 * @param {string} command
 * @param {Function} [onFile]
 * @returns {Promise<void>}
 */
export function runExtractionCommand(command, onFile) {
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
 * Archive extraction service (SRP).
 */
export const archiveExtractorApi = {
  async extractArchive(archivePath, destFolder, onFile) {
    if (!(await fsIoApi.exists(destFolder))) {
      await fsIoApi.createDirectory(destFolder);
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
};
