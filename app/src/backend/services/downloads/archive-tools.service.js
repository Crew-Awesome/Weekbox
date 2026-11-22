import { quoteCommandArgument } from "./shell-argument.util.js";

let bundledArchiveToolsPromise = null;

export function getWindowsExtractionCommand(archivePath, destinationPath) {
  const normArchive = String(archivePath || "").replace(/\//g, "\\");
  const normDest = String(destinationPath || "").replace(/\//g, "\\");
  return `tar.exe -xf "${normArchive}" -C "${normDest}"`;
}

export function get7zExtractionCommand(
  binaryPath,
  archivePath,
  destinationPath,
) {
  const isWindows = window.NL_OS === "Windows";
  if (isWindows) {
    const normBin = String(binaryPath || "").replace(/\//g, "\\");
    const normArchive = String(archivePath || "").replace(/\//g, "\\");
    const normDest = String(destinationPath || "").replace(/\//g, "\\");
    return `"${normBin}" x -y -aoa "-o${normDest}" "${normArchive}"`;
  }
  const cleanSteamEnvironment =
    window.NL_OS === "Linux" ? "unset LD_PRELOAD; " : "";
  return `${cleanSteamEnvironment}${quoteCommandArgument(binaryPath)} x -y -aoa -o${quoteCommandArgument(destinationPath)} ${quoteCommandArgument(archivePath)}`;
}

export function get7zTestCommand(binaryPath, archivePath) {
  const isWindows = window.NL_OS === "Windows";
  if (isWindows) {
    const normBin = String(binaryPath || "").replace(/\//g, "\\");
    const normArchive = String(archivePath || "").replace(/\//g, "\\");
    return `"${normBin}" t -y "${normArchive}"`;
  }
  const cleanSteamEnvironment =
    window.NL_OS === "Linux" ? "unset LD_PRELOAD; " : "";
  return `${cleanSteamEnvironment}${quoteCommandArgument(binaryPath)} t -y ${quoteCommandArgument(archivePath)}`;
}

export function getPowerShellExtractCommand(archivePath, destinationPath) {
  const safeArchive = String(archivePath || "")
    .replace(/\//g, "\\")
    .replace(/'/g, "''");
  const safeDest = String(destinationPath || "")
    .replace(/\//g, "\\")
    .replace(/'/g, "''");
  return `powershell -NoProfile -NonInteractive -Command "Expand-Archive -Path '${safeArchive}' -DestinationPath '${safeDest}' -Force"`;
}

async function prepareArchiveTool(binaryPath) {
  if (window.NL_OS !== "Windows") {
    await Neutralino.filesystem.chmod(binaryPath, 0o755).catch(() => {});
  }
  return binaryPath;
}

function getArchiveToolNames() {
  if (window.NL_OS === "Windows") return ["7z.exe", "7za.exe"];
  if (window.NL_OS === "Darwin") return ["7zz-mac", "7zz", "7za-mac"];
  return ["7zz-linux", "7zzs", "7zz", "7za-linux"];
}

function getArchiveToolPaths(binNames) {
  const candidateDirs = new Set();
  if (window.NL_PATH) {
    candidateDirs.add(window.NL_PATH);
    candidateDirs.add(`${window.NL_PATH}/..`);
  }
  if (window.NL_CWD) {
    candidateDirs.add(window.NL_CWD);
    candidateDirs.add(`${window.NL_CWD}/..`);
  }
  if (window.NL_ARGS?.[0]) {
    const exeDir = window.NL_ARGS[0].replace(/[/\\][^/\\]+$/, "");
    candidateDirs.add(exeDir);
    candidateDirs.add(`${exeDir}/..`);
  }
  const paths = [];
  for (const dir of candidateDirs) {
    for (const bin of binNames) {
      paths.push(
        `${dir}/app/assets/bin/${bin}`,
        `${dir}/assets/bin/${bin}`,
        `${dir}/resources/app/assets/bin/${bin}`,
        `${dir}/resources/assets/bin/${bin}`,
        `${dir}/bin/${bin}`,
      );
    }
  }
  for (const bin of binNames)
    paths.push(`app/assets/bin/${bin}`, `assets/bin/${bin}`);
  if (window.NL_OS === "Windows") {
    paths.push(
      "C:/Program Files/7-Zip/7z.exe",
      "C:/Program Files (x86)/7-Zip/7z.exe",
    );
  }
  return paths;
}

async function findArchiveTool(paths) {
  for (const rawPath of paths) {
    const normalized = rawPath.replace(/\\/g, "/");
    try {
      const stats = await Neutralino.filesystem.getStats(normalized);
      if (stats?.isFile || stats?.type === "FILE")
        return prepareArchiveTool(normalized);
    } catch {}
  }
  return null;
}

async function extractBundledArchiveTools() {
  if (!window.NL_DATAPATH || !Neutralino.resources?.extractDirectory)
    return null;
  const destination = `${window.NL_DATAPATH}/.weekbox-tools`;
  try {
    await Neutralino.filesystem.createDirectory(destination).catch(() => {});
    await Neutralino.resources.extractDirectory("/app/assets/bin", destination);
    return destination;
  } catch (error) {
    console.warn("Could not extract the bundled archive tools", error);
    return null;
  }
}

export async function find7zBinary() {
  const binNames = getArchiveToolNames();
  const directTool = await findArchiveTool(getArchiveToolPaths(binNames));
  if (directTool) return directTool;

  if (!bundledArchiveToolsPromise) {
    bundledArchiveToolsPromise = extractBundledArchiveTools();
  }
  const bundledDirectory = await bundledArchiveToolsPromise;
  return bundledDirectory
    ? findArchiveTool(binNames.map((bin) => `${bundledDirectory}/${bin}`))
    : null;
}
