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
 * Validates whether an archive entry path resolves strictly within the destination directory,
 * preventing Directory Traversal / Zip Slip attacks.
 *
 * @param {string} destinationBase - The target extraction directory.
 * @param {string} relativeOrResolvedPath - The path found in or extracted from the archive.
 * @returns {boolean} True if safely contained within destinationBase, false otherwise.
 */
export function isSafeExtractionPath(destinationBase, relativeOrResolvedPath) {
  if (!destinationBase || !relativeOrResolvedPath) return false;
  if (typeof destinationBase !== "string" || typeof relativeOrResolvedPath !== "string") return false;

  // Reject paths with null bytes or suspicious characters
  if (relativeOrResolvedPath.includes("\0")) return false;

  const resolvedBase = path.resolve(destinationBase);
  const resolvedTarget = path.isAbsolute(relativeOrResolvedPath)
    ? path.resolve(relativeOrResolvedPath)
    : path.resolve(resolvedBase, relativeOrResolvedPath);

  const relative = path.relative(resolvedBase, resolvedTarget);
  // If the relative path starts with '..' or is root/empty outside, it escapes the target directory
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return false;
  }

  // On Windows, also verify drive letters match
  if (isWin) {
    const baseRoot = path.parse(resolvedBase).root.toLowerCase();
    const targetRoot = path.parse(resolvedTarget).root.toLowerCase();
    if (baseRoot !== targetRoot) {
      return false;
    }
  }

  return true;
}

/**
 * Recursively scans an extracted folder to ensure no file or symlink escapes the base folder.
 * If any malicious traversal entry or external symlink is detected, it is immediately removed (quarantined).
 *
 * @param {string} baseFolder - The target extraction folder to sanitize.
 * @returns {Promise<string[]>} List of quarantined file paths, if any.
 */
export async function sanitizeExtractedDirectory(baseFolder) {
  const resolvedBase = path.resolve(baseFolder);
  const quarantined = [];

  async function scan(currentDir) {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (!isSafeExtractionPath(resolvedBase, fullPath)) {
        quarantined.push(fullPath);
        await fs.rm(fullPath, { recursive: true, force: true }).catch(() => {});
        continue;
      }

      if (entry.isSymbolicLink()) {
        try {
          const target = await fs.readlink(fullPath);
          const resolvedLink = path.isAbsolute(target)
            ? path.resolve(target)
            : path.resolve(path.dirname(fullPath), target);

          if (!isSafeExtractionPath(resolvedBase, resolvedLink)) {
            quarantined.push(fullPath);
            await fs.unlink(fullPath).catch(() => {});
            continue;
          }
        } catch {
          await fs.unlink(fullPath).catch(() => {});
          continue;
        }
      }

      if (entry.isDirectory()) {
        await scan(fullPath);
      }
    }
  }

  await scan(resolvedBase);
  if (quarantined.length > 0) {
    console.warn(`[Security Alert] Zip Slip / Traversal attempt blocked! Quarantined ${quarantined.length} unsafe entries:`, quarantined);
  }
  return quarantined;
}

/**
 * Parses extraction output lines to extract relative file paths with path traversal protection.
 * @param {string} rawLine
 * @returns {string|null}
 */
export function parseExtractedFileName(rawLine) {
  if (!rawLine) return null;
  const line = rawLine.trim();
  if (!line) return null;

  const filterCandidate = (candidate) => {
    if (!candidate) return null;
    const trimmed = candidate.trim();
    if (trimmed.endsWith("/") || trimmed.endsWith("\\")) return null;
    // Check against Zip Slip / Traversal patterns
    if (
      trimmed.includes("..") ||
      trimmed.startsWith("/") ||
      trimmed.startsWith("\\") ||
      /^[a-zA-Z]:/.test(trimmed) ||
      trimmed.includes("\0")
    ) {
      console.warn(`[Security] Filtered traversal or unsafe entry: "${trimmed}"`);
      return null;
    }
    return trimmed;
  };

  const match7z = line.match(/^Extracting\s+(.+)$/i);
  if (match7z) {
    return filterCandidate(match7z[1]);
  }

  const matchUnzip = line.match(/^(?:inflating|extracting):\s+(.+)$/i);
  if (matchUnzip) {
    return filterCandidate(matchUnzip[1]);
  }

  if (line.startsWith("x ")) {
    return filterCandidate(line.substring(2));
  }

  if (
    !line.includes(":") &&
    !line.startsWith("7-Zip") &&
    !line.startsWith("Copyright") &&
    !line.startsWith("Scanning") &&
    !line.startsWith("Everything") &&
    (line.includes("/") || line.includes("\\") || line.includes("."))
  ) {
    return filterCandidate(line);
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
      const psSafeScript = `$zip = [System.IO.Compression.ZipFile]::OpenRead('${normalizedArchive.replace(/'/g, "''")}'); $dest = [System.IO.Path]::GetFullPath('${normalizedDest.replace(/'/g, "''")}'); foreach ($entry in $zip.Entries) { $target = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($dest, $entry.FullName)); if ($target.StartsWith($dest, [System.StringComparison]::OrdinalIgnoreCase)) { if ($entry.FullName.EndsWith('/') -or $entry.FullName.EndsWith('\\')) { [System.IO.Directory]::CreateDirectory($target) | Out-Null; } else { $dir = [System.IO.Path]::GetDirectoryName($target); if (-not [System.IO.Directory]::Exists($dir)) { [System.IO.Directory]::CreateDirectory($dir) | Out-Null }; [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true); } } }; $zip.Dispose();`;
      commandsToTry.push(`powershell -NoProfile -NonInteractive -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; ${psSafeScript}"`);
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

    // Zip Slip and Path Traversal security audit after extraction
    try {
      await sanitizeExtractedDirectory(destFolder);
    } catch (secErr) {
      console.warn(`[fs.extractArchive] Warning during post-extraction security sanitization:`, secErr);
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
