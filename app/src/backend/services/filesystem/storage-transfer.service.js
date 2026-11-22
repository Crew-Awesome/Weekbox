import { appSettings } from "../../core/system/settings.service.js";
import {
  getParentPath,
  getRealEntries,
  pathsOverlap,
  normalizeComparablePath,
  trimPath,
} from "./path.util.js";
import {
  allSettledWithConcurrency,
  forEachWithConcurrencyUntilError,
} from "../../utils/async-concurrency.util.mjs";
import {
  createThrottledProgressReporter,
  encodePowerShellCommand,
  findVerifiedExistingStorageFiles,
  parseDfAvailableBytes,
  getRequiredStorageBytes,
  getStoragePartialPathCollision,
  getStorageDiskForPath,
  pathsShareStorageMount,
  getStorageTransferId,
  quotePosixShellArgument,
} from "./storage-transfer.util.mjs";
import { copyVerifyCommitStorageFile } from "./storage-transfer-copy.util.mjs";
import {
  filesMatchInChunks,
  STORAGE_FILE_VERIFY_CHUNK_SIZE,
} from "./storage-file-verify.util.mjs";
import { STORAGE_LAYOUT_VERSION, getStoragePaths } from "./storage-paths.js";

const STORAGE_MOVE_PARTIAL_SUFFIX = ".weekbox-partial";
const STORAGE_MOVE_COPY_CONCURRENCY = 2;
const STORAGE_LAYOUT_DIRECTORIES = new Set([
  "config",
  "data",
  "state",
  "runtime",
  "engines",
  "mods",
]);

function getStorageMoveMarkerPaths(path) {
  const paths = getStoragePaths(path);
  const applicationRoot = trimPath(window.NL_DATAPATH);
  return [
    applicationRoot && `${applicationRoot}/.weekbox-moving.json`,
    paths.storageMoveMarkerFile,
    paths.legacyStorageMoveMarkerFile,
    applicationRoot && `${applicationRoot}/weekbox-moving.json`,
  ].filter(
    (markerPath, index, allPaths) =>
      markerPath && allPaths.indexOf(markerPath) === index,
  );
}

function storageMoveMarkerPath(path) {
  return getStorageMoveMarkerPaths(path)[0];
}

async function readStorageMoveMarker(service) {
  for (const markerPath of getStorageMoveMarkerPaths(service.basePath)) {
    let exists;
    try {
      exists = await service.api.exists(markerPath);
    } catch (error) {
      throw new Error(
        `Could not check for an interrupted storage-move record at ${markerPath}: ${error?.message || error}`,
        { cause: error },
      );
    }
    if (!exists) continue;
    let content;
    try {
      content = await service.api.read(markerPath);
    } catch (error) {
      throw new Error(
        `Could not read the interrupted storage-move record at ${markerPath}: ${error?.message || error}`,
        { cause: error },
      );
    }
    let marker;
    try {
      marker = JSON.parse(content);
    } catch (error) {
      throw new Error(
        `The interrupted storage-move record at ${markerPath} is invalid. Keep both library folders intact and contact support before retrying.`,
        { cause: error },
      );
    }
    if (
      !marker ||
      ![1, 2].includes(marker.version) ||
      marker.operation !== "move"
    ) {
      throw new Error(
        `The interrupted storage-move record at ${markerPath} has an unsupported format. Keep both library folders intact and contact support before retrying.`,
      );
    }
    if (
      normalizeComparablePath(marker.source) !==
        normalizeComparablePath(service.basePath) &&
      normalizeComparablePath(marker.destination) !==
        normalizeComparablePath(service.basePath)
    ) {
      continue;
    }
    return { ...marker, markerPath };
  }
  return null;
}

async function migrateFile(api, sourcePath, destinationPath) {
  if (!(await api.exists(sourcePath))) return true;
  if (!(await api.exists(destinationPath))) {
    await api.move(sourcePath, destinationPath);
    return true;
  }
  const [source, destination] = await Promise.all([
    api.read(sourcePath),
    api.read(destinationPath),
  ]);
  if (source === destination) {
    await api.remove(sourcePath);
    return true;
  }
  console.warn(
    `[WeekBox] Preserved conflicting legacy metadata file: ${sourcePath}`,
  );
  return false;
}

async function migrateStorageMetadata(service) {
  let manifestVersion = 0;
  try {
    manifestVersion = Number(
      JSON.parse(await service.api.read(service.paths.storageManifestFile))
        ?.version,
    );
  } catch {}
  if (manifestVersion >= STORAGE_LAYOUT_VERSION) return true;
  let complete = await migrateFile(
    service.api,
    service.paths.legacyInstalledModsFile,
    service.paths.installedModsFile,
  );
  complete =
    (await migrateFile(
      service.api,
      service.paths.legacyEngineUpdatesFile,
      service.paths.engineUpdatesFile,
    )) && complete;
  complete =
    (await migrateFile(
      service.api,
      service.paths.legacyDeeplinkFile,
      service.paths.deeplinkFile,
    )) && complete;
  return complete;
}

async function cleanupAtomicWriteTemps(service) {
  const paths = [
    service.paths.settingsFile,
    service.paths.storageManifestFile,
    service.paths.bookmarksFile,
    service.paths.customEnginesFile,
    service.paths.installedModsFile,
    service.paths.legacyInstalledModsFile,
    service.paths.engineUpdatesFile,
    service.paths.legacyEngineUpdatesFile,
    service.paths.deeplinkFile,
    service.paths.legacyDeeplinkFile,
    service.paths.legacySettingsFile,
    service.paths.legacyDataSettingsFile,
    ...getStorageMoveMarkerPaths(service.basePath),
  ];
  await Promise.all(
    paths.map(async (path) => {
      const directory = getParentPath(path);
      const fileName = path.slice(directory.length + 1);
      if (!(await service.api.exists(directory))) return;
      let entries;
      try {
        entries = await Neutralino.filesystem.readDirectory(directory);
      } catch (error) {
        throw new Error(
          `Could not inspect temporary files in ${directory}: ${error?.message || error}`,
          { cause: error },
        );
      }
      await Promise.all(
        getRealEntries(entries)
          .filter(
            (entry) =>
              entry.type === "FILE" &&
              String(entry.entry).startsWith(`${fileName}.tmp-`),
          )
          .map((entry) => service.api.remove(`${directory}/${entry.entry}`)),
      );
    }),
  );
}

function isStorageMoveMarkerPath(path, root) {
  return getStorageMoveMarkerPaths(root).some(
    (markerPath) =>
      markerPath &&
      normalizeComparablePath(markerPath) === normalizeComparablePath(path),
  );
}

function relativeStoragePath(path, sourcePath) {
  const value = String(path || "").replace(/\\/g, "/");
  const source = trimPath(sourcePath).replace(/\\/g, "/");
  const prefix = `${source}/`;
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function storageMoveCancelled(service) {
  if (!service.storageMoveCancelled) return;
  const error = new Error("Storage move cancelled");
  error.code = "STORAGE_MOVE_CANCELLED";
  throw error;
}

async function scanStorageFiles(
  sourcePath,
  markerPath,
  onProgress,
  allowedRootEntries = null,
) {
  const files = [];
  let totalBytes = 0;
  let lastProgressAt = 0;
  const marker = normalizeComparablePath(markerPath);
  const walk = async (directoryPath) => {
    const entries = getRealEntries(
      await Neutralino.filesystem.readDirectory(directoryPath),
    );
    for (const entry of entries) {
      if (
        directoryPath === sourcePath &&
        allowedRootEntries &&
        !allowedRootEntries.has(entry.entry)
      ) {
        continue;
      }
      const entryPath = `${directoryPath}/${entry.entry}`;
      if (
        normalizeComparablePath(entryPath) === marker ||
        isStorageMoveMarkerPath(entryPath, sourcePath)
      )
        continue;
      if (entry.type === "DIRECTORY") {
        await walk(entryPath);
        continue;
      }
      if (entry.type !== "FILE") continue;
      const stats = await Neutralino.filesystem.getStats(entryPath);
      const file = {
        path: entryPath,
        relativePath: relativeStoragePath(entryPath, sourcePath),
        size: Number(stats.size) || 0,
        modifiedAt: Number(stats.modifiedAt) || 0,
      };
      files.push(file);
      totalBytes += file.size;
      const now = performance.now();
      if (
        files.length === 1 ||
        files.length % 64 === 0 ||
        now - lastProgressAt >= 200
      ) {
        onProgress({
          phase: "PREPARING",
          status: "SCANNING",
          progress: null,
          bytesMoved: 0,
          totalBytes,
          copiedFiles: 0,
          totalFiles: files.length,
          currentFile: file.relativePath,
        });
        lastProgressAt = now;
      }
    }
  };
  await walk(sourcePath);
  if (files.length) {
    onProgress({
      phase: "PREPARING",
      status: "SCANNING",
      progress: null,
      bytesMoved: 0,
      totalBytes,
      copiedFiles: 0,
      totalFiles: files.length,
      currentFile: files.at(-1).relativePath,
    });
  }
  return { files };
}

async function hasStorageIdentity(service, root) {
  const paths = getStoragePaths(root);
  const identityPaths = [
    paths.storageManifestFile,
    paths.settingsFile,
    paths.legacySettingsFile,
    paths.legacyDataSettingsFile,
  ];
  for (const path of identityPaths) {
    if (!(await service.api.exists(path))) continue;
    if (path !== paths.storageManifestFile) return true;
    try {
      if (Number(JSON.parse(await service.api.read(path))?.version) > 0)
        return true;
    } catch {}
  }
  return false;
}

async function isEmptyDirectory(path) {
  const rawEntries = await Neutralino.filesystem
    .readDirectory(path)
    .catch(() => null);
  if (!Array.isArray(rawEntries)) return false;
  return getRealEntries(rawEntries).length === 0;
}

async function isEmptyStorageScaffold(path, entries = null) {
  let rootEntries = entries;
  if (rootEntries === null) {
    const rawEntries = await Neutralino.filesystem
      .readDirectory(path)
      .catch(() => null);
    if (!Array.isArray(rawEntries)) return false;
    rootEntries = getRealEntries(rawEntries);
  }
  if (!rootEntries.length) return true;
  if (
    rootEntries.some(
      (entry) =>
        entry.type !== "DIRECTORY" ||
        !STORAGE_LAYOUT_DIRECTORIES.has(
          String(entry.entry).toLocaleLowerCase(),
        ),
    )
  ) {
    return false;
  }
  return Promise.all(
    rootEntries.map((entry) => isEmptyDirectory(`${path}/${entry.entry}`)),
  ).then((results) => results.every(Boolean));
}

async function filesMatch(sourcePath, destinationPath, size, service) {
  return filesMatchInChunks(sourcePath, destinationPath, size, {
    readBinaryFile: (path, options) =>
      Neutralino.filesystem.readBinaryFile(path, options),
    checkCancelled: () => storageMoveCancelled(service),
    chunkSize: STORAGE_FILE_VERIFY_CHUNK_SIZE,
  });
}

async function findWindowsStorageReparsePoint(rootPath, scanPaths) {
  const quotePowerShell = (path) => `'${String(path).replaceAll("'", "''")}'`;
  const roots = scanPaths.map(quotePowerShell).join(",");
  const script = `try{$root=Get-Item -LiteralPath ${quotePowerShell(rootPath)} -Force -ErrorAction Stop;if($root.Attributes -band [IO.FileAttributes]::ReparsePoint){[Console]::Out.Write($root.FullName);exit 0};$roots=@(${roots});foreach($path in $roots){$item=Get-Item -LiteralPath $path -Force -ErrorAction Stop;if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){[Console]::Out.Write($item.FullName);exit 0};if($item.PSIsContainer){$link=Get-ChildItem -LiteralPath $path -Force -Recurse -ErrorAction Stop | Where-Object {($_.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0} | Select-Object -First 1;if($link){[Console]::Out.Write($link.FullName);exit 0}}};exit 1}catch{[Console]::Error.WriteLine($_);exit 2}`;
  const encoded = encodePowerShellCommand(script, (value) =>
    window.btoa(value),
  );
  const result = await Neutralino.os.execCommand(
    `powershell.exe -NoLogo -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
    { background: false },
  );
  if (result.exitCode === 1) return null;
  if (result.exitCode !== 0)
    throw new Error(
      `WeekBox could not check for junctions or reparse points under ${rootPath}. ${result.stdErr || result.stdOut || ""}`,
    );
  return String(result.stdOut || "").trim() || rootPath;
}

async function findPosixStorageSymlink(rootPath, scanPaths, checkRoot) {
  if (checkRoot) {
    const rootCheck = await Neutralino.os.execCommand(
      `test -L ${quotePosixShellArgument(rootPath)}`,
      { background: false },
    );
    if (rootCheck.exitCode === 0) return rootPath;
    if (rootCheck.exitCode !== 1)
      throw new Error(
        `WeekBox could not inspect the source folder ${rootPath}. ${rootCheck.stdErr || rootCheck.stdOut || ""}`,
      );
  }
  const paths = scanPaths.length ? scanPaths : checkRoot ? [] : [rootPath];
  if (!paths.length) return null;
  const result = await Neutralino.os.execCommand(
    `find -P ${paths.map(quotePosixShellArgument).join(" ")} -type l -print -quit`,
    { background: false },
  );
  if (result.exitCode !== 0)
    throw new Error(
      `WeekBox could not check for symbolic links under ${rootPath}. ${result.stdErr || result.stdOut || ""}`,
    );
  return String(result.stdOut || "").trim() || null;
}

async function findStorageReparsePoint(
  service,
  rootPath,
  allowedRootEntries = null,
) {
  const scanPaths = allowedRootEntries
    ? await mapWithConcurrency([...allowedRootEntries], 4, async (entry) => {
        const path = `${rootPath}/${entry}`;
        return (await service.api.exists(path)) ? path : null;
      }).then((paths) => paths.filter(Boolean))
    : [rootPath];
  return window.NL_OS === "Windows"
    ? findWindowsStorageReparsePoint(rootPath, scanPaths)
    : findPosixStorageSymlink(rootPath, scanPaths, Boolean(allowedRootEntries));
}

async function pathIsReparsePoint(path) {
  if (window.NL_OS === "Windows") {
    const quotedPath = `'${String(path).replaceAll("'", "''")}'`;
    const script = `try{$item=Get-Item -LiteralPath ${quotedPath} -Force -ErrorAction Stop;if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){exit 0};exit 1}catch{[Console]::Error.WriteLine($_);exit 2}`;
    const encoded = encodePowerShellCommand(script, (value) =>
      window.btoa(value),
    );
    const result = await Neutralino.os.execCommand(
      `powershell.exe -NoLogo -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
      { background: false },
    );
    if (result.exitCode === 0) return true;
    if (result.exitCode === 1) return false;
    throw new Error(
      `WeekBox could not inspect ${path} for a junction or reparse point. ${result.stdErr || result.stdOut || ""}`,
    );
  }
  const result = await Neutralino.os.execCommand(
    `test -L ${quotePosixShellArgument(path)}`,
    { background: false },
  );
  if (result.exitCode === 0) return true;
  if (result.exitCode === 1) return false;
  throw new Error(
    `WeekBox could not inspect ${path} for a symbolic link. ${result.stdErr || result.stdOut || ""}`,
  );
}

async function getWindowsPathFreeBytes(path) {
  const quotedPath = `'${String(path).replaceAll("'", "''")}'`;
  const script = `try{$source='using System;using System.Runtime.InteropServices;public static class WeekBoxDiskSpace{[DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)]public static extern bool GetDiskFreeSpaceEx(string path,out ulong available,out ulong total,out ulong freeTotal);}';Add-Type -TypeDefinition $source -ErrorAction Stop;[UInt64]$available=0;[UInt64]$total=0;[UInt64]$freeTotal=0;if(![WeekBoxDiskSpace]::GetDiskFreeSpaceEx(${quotedPath},[ref]$available,[ref]$total,[ref]$freeTotal)){exit 2};[Console]::Out.Write($available);exit 0}catch{[Console]::Error.WriteLine($_);exit 2}`;
  const encoded = encodePowerShellCommand(script, (value) =>
    window.btoa(value),
  );
  const result = await Neutralino.os.execCommand(
    `powershell.exe -NoLogo -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
    { background: false },
  );
  if (result.exitCode !== 0)
    throw new Error(
      `WeekBox could not check available space for ${path}. ${result.stdErr || result.stdOut || ""}`,
    );
  const freeBytes = Number(String(result.stdOut || "").trim());
  if (!Number.isFinite(freeBytes))
    throw new Error(
      `WeekBox received an invalid free-space value for ${path}.`,
    );
  return freeBytes;
}

async function getPosixPathFreeBytes(path) {
  const result = await Neutralino.os.execCommand(
    `df -Pk ${quotePosixShellArgument(path)}`,
    { background: false },
  );
  if (result.exitCode !== 0)
    throw new Error(
      `WeekBox could not check available space for ${path}. ${result.stdErr || result.stdOut || ""}`,
    );
  const freeBytes = parseDfAvailableBytes(result.stdOut);
  if (freeBytes === null)
    throw new Error(
      `WeekBox received an invalid free-space value for ${path}.`,
    );
  return freeBytes;
}

async function findExistingStorageAncestor(service, path) {
  let current = trimPath(path);
  while (current) {
    if (await service.api.exists(current)) return current;
    if (window.NL_OS === "Windows" && /^[a-z]:\/?$/i.test(current)) break;
    const parent = getParentPath(current);
    if (!parent || parent === current) break;
    current = parent;
  }
  throw new Error(`WeekBox could not locate an accessible parent for ${path}.`);
}

async function assertNoStoragePathReparsePoints(service, destinationPath) {
  const ancestors = [];
  let current = trimPath(destinationPath);
  const uncRoot = current.match(/^\/\/[^/]+\/[^/]+/)?.[0];
  while (current) {
    if (
      (window.NL_OS === "Windows" && /^[a-z]:\/?$/i.test(current)) ||
      (uncRoot &&
        normalizeComparablePath(current) === normalizeComparablePath(uncRoot))
    ) {
      break;
    }
    ancestors.push(current);
    const parent = getParentPath(current);
    if (!parent || parent === current) break;
    current = parent;
  }
  for (const path of ancestors.reverse()) {
    if (!(await service.api.exists(path))) break;
    if (await pathIsReparsePoint(path)) {
      throw new Error(
        `The destination path uses a symbolic link, junction, or reparse point at ${path}. Choose a regular folder path and try again.`,
      );
    }
  }
}

async function preflightStorageDestination(service, files, destinationPath) {
  await assertNoStoragePathReparsePoints(service, destinationPath);
  if (await service.api.exists(destinationPath)) {
    const reparsePoint = await findStorageReparsePoint(
      service,
      destinationPath,
    );
    if (reparsePoint) {
      throw new Error(
        `The destination library contains a symbolic link, junction, or reparse point at ${reparsePoint}. Remove it and resume the transfer.`,
      );
    }
  }
  const existingSameSizePaths = await findVerifiedExistingStorageFiles(
    files,
    destinationPath,
    {
      exists: (path) => service.api.exists(path),
      getStats: (path) => Neutralino.filesystem.getStats(path),
      matches: (file, path) => filesMatch(file.path, path, file.size, service),
    },
  );
  const requiredBytes = getRequiredStorageBytes(files, existingSameSizePaths);

  let disks;
  try {
    disks = await Neutralino.computer.getDisks();
  } catch (error) {
    throw new Error(
      `WeekBox could not check free space for ${destinationPath}. ${error?.message || error}`,
    );
  }
  const disk = getStorageDiskForPath(disks, destinationPath);
  const spaceCheckPath = await findExistingStorageAncestor(
    service,
    destinationPath,
  );
  const freeBytes =
    disk && Number.isFinite(Number(disk.free))
      ? Number(disk.free)
      : window.NL_OS === "Windows"
        ? await getWindowsPathFreeBytes(spaceCheckPath)
        : await getPosixPathFreeBytes(spaceCheckPath);
  if (!Number.isFinite(freeBytes)) {
    throw new Error(
      `WeekBox could not determine available space for ${destinationPath}. Choose a mounted local or external drive and try again.`,
    );
  }
  if (freeBytes < requiredBytes) {
    const requiredGb = (requiredBytes / 1024 ** 3).toFixed(2);
    const freeGb = (freeBytes / 1024 ** 3).toFixed(2);
    throw new Error(
      `The destination drive has ${freeGb} GB free, but this transfer needs about ${requiredGb} GB. Free up space and retry.`,
    );
  }

  await service.ensureStorageDirectoriesAt(destinationPath);
  const probePath = `${destinationPath}/.weekbox-write-test-${crypto.randomUUID()}`;
  try {
    await service.api.write(probePath, "");
  } catch (error) {
    throw new Error(
      `WeekBox cannot write to ${destinationPath}. Check folder permissions and available space. ${error?.message || error}`,
    );
  } finally {
    await service.api.remove(probePath);
  }
}

async function canUseNativeStorageRootMove(service, destinationPath, pending) {
  if (pending && pending.strategy !== "native-root-rename") return false;
  if (pending?.strategy === "native-root-rename") {
    const sourceExists = await service.api.exists(service.basePath);
    const destinationExists = await service.api.exists(destinationPath);
    if (!sourceExists && destinationExists) return true;
    if (sourceExists && destinationExists) return false;
  } else if (await service.api.exists(destinationPath)) {
    return false;
  }
  try {
    const disks = await Neutralino.computer.getDisks();
    return pathsShareStorageMount(disks, service.basePath, destinationPath);
  } catch {
    return false;
  }
}

async function moveStorageRootNatively(
  service,
  sourcePath,
  destinationPath,
  mods,
  engines,
  report,
) {
  const sourceExists = await service.api.exists(sourcePath);
  const destinationExists = await service.api.exists(destinationPath);
  if (sourceExists && destinationExists) {
    throw new Error(
      "Both the source and destination libraries exist during a native move. Keep both folders intact and resume the move.",
    );
  }
  if (!sourceExists && !destinationExists) {
    throw new Error(
      "Neither the source nor destination WeekBox library could be found. Keep the move record and restore a library folder before resuming.",
    );
  }
  if (!sourceExists) {
    if (!(await service.isCompleteStorage(destinationPath))) {
      throw new Error(
        "The moved WeekBox library is incomplete at its destination. Keep the folder intact and resume the move.",
      );
    }
    return true;
  }

  if (!(await service.isCompleteStorage(sourcePath))) {
    throw new Error("The current WeekBox library is incomplete.");
  }
  await assertNoStoragePathReparsePoints(service, destinationPath);
  await assertNoStoragePathReparsePoints(service, sourcePath);
  const reparsePoint = await findStorageReparsePoint(service, sourcePath);
  if (reparsePoint) {
    throw new Error(
      `The source library contains a symbolic link, junction, or reparse point at ${reparsePoint}. Remove it before moving the library.`,
    );
  }
  const unlinkResults = await allSettledWithConcurrency(mods, 3, (mod) =>
    service.injection.unlinkFromInstalledEngines(mod, engines),
  );
  const unlinkFailure = unlinkResults.find(
    (result) => result.status === "rejected",
  );
  if (unlinkFailure) throw unlinkFailure.reason;
  storageMoveCancelled(service);
  report({ phase: "MOVING", progress: null, bytesMoved: 0, totalBytes: 0 });
  await service.api.move(sourcePath, destinationPath);
  return true;
}

async function moveStorageFile(
  service,
  file,
  destinationRoot,
  state,
  report,
  partialSuffix,
  onTransferStart = () => {},
) {
  const destinationPath = `${destinationRoot}/${file.relativePath}`;
  const partialPath = `${destinationPath}${partialSuffix}`;
  const result = await copyVerifyCommitStorageFile(
    file,
    destinationPath,
    partialPath,
    {
      ensureDirectory: (path) => service.api.ensureDir(getParentPath(path)),
      exists: (path) => service.api.exists(path),
      getStats: (path) => Neutralino.filesystem.getStats(path),
      matches: (plannedFile, path) =>
        filesMatch(plannedFile.path, path, plannedFile.size, service),
      remove: (path) => service.api.remove(path),
      copy: (source, destination) =>
        Neutralino.filesystem.copy(source, destination, {
          recursive: false,
          overwrite: false,
          skip: false,
        }),
      move: (source, destination) => service.api.move(source, destination),
      checkCancelled: () => storageMoveCancelled(service),
      onTransferStart,
    },
  );

  if (result.status === "already-present") {
    state.bytesMoved += file.size;
    state.copiedFiles += 1;
    report({ ...state, currentFile: file.relativePath });
    return;
  }
  state.bytesMoved += file.size;
  state.copiedFiles += 1;
  report({
    ...state,
    currentFile: file.relativePath,
    progress: state.totalBytes
      ? (state.bytesMoved / state.totalBytes) * 100
      : 100,
  });
}

async function scanStorageTransferSource(
  service,
  sourcePath,
  markerPath,
  report,
) {
  if (!(await service.api.exists(sourcePath))) {
    throw new Error(
      `The current WeekBox library is unavailable at ${sourcePath}.`,
    );
  }
  await assertNoStoragePathReparsePoints(service, sourcePath);
  const allowedRootEntries = service.isStorageInExecutableDirectory()
    ? new Set([
        "config",
        "data",
        "state",
        "runtime",
        "engines",
        "mods",
        "settings.json",
        "storage-manifest.json",
      ])
    : null;
  const reparsePoint = await findStorageReparsePoint(
    service,
    sourcePath,
    allowedRootEntries,
  );
  if (reparsePoint) {
    throw new Error(
      `The source library contains a symbolic link, junction, or reparse point at ${reparsePoint}. Remove it or move the linked data into the library before transferring.`,
    );
  }
  const { files } = await scanStorageFiles(
    sourcePath,
    markerPath,
    report,
    allowedRootEntries,
  );
  return files;
}

function createStorageTransferManifest(
  service,
  sourcePath,
  destinationPath,
  files,
) {
  const previousManifest = service.pendingStorageMove;
  const previousFiles = new Map(
    (previousManifest?.files || []).map((file) => [file.relativePath, file]),
  );
  const samePlan =
    previousManifest?.version === 2 &&
    normalizeComparablePath(previousManifest.source) ===
      normalizeComparablePath(sourcePath) &&
    normalizeComparablePath(previousManifest.destination) ===
      normalizeComparablePath(destinationPath) &&
    Array.isArray(previousManifest.files) &&
    previousManifest.files.length === files.length &&
    files.every((file) => {
      const planned = previousFiles.get(file.relativePath);
      return (
        planned?.size === file.size && planned?.modifiedAt === file.modifiedAt
      );
    });
  const completedFiles = new Set(
    samePlan ? previousManifest.completedFiles || [] : [],
  );
  const manifest = {
    version: 2,
    operation: "move",
    transferId: getStorageTransferId(previousManifest?.transferId, () =>
      crypto.randomUUID(),
    ),
    source: sourcePath,
    destination: destinationPath,
    startedAt: previousManifest?.startedAt || new Date().toISOString(),
    files: files.map(({ relativePath, size, modifiedAt }) => ({
      relativePath,
      size,
      modifiedAt,
    })),
    completedFiles: [...completedFiles],
  };
  const partialSuffix = `${STORAGE_MOVE_PARTIAL_SUFFIX}-${manifest.transferId}`;
  const partialCollision = getStoragePartialPathCollision(files, partialSuffix);
  if (partialCollision) {
    throw new Error(
      `The source contains a path that conflicts with the transfer staging name for ${partialCollision}. Rename that file and retry.`,
    );
  }
  return { completedFiles, manifest, partialSuffix };
}

async function transferStorageFiles(
  service,
  sourcePath,
  destinationPath,
  markerPath,
  report,
) {
  const files = await scanStorageTransferSource(
    service,
    sourcePath,
    markerPath,
    report,
  );
  const { completedFiles, manifest, partialSuffix } =
    createStorageTransferManifest(service, sourcePath, destinationPath, files);
  const markerPaths = getStorageMoveMarkerPaths(sourcePath).slice(0, 2);
  const persistManifest = async () => {
    manifest.completedFiles = [...completedFiles];
    const serialized = `${JSON.stringify(manifest)}\n`;
    await Promise.all(
      markerPaths.map((path) => service.api.writeAtomic(path, serialized)),
    );
    service.pendingStorageMove = manifest;
  };
  await persistManifest();
  await preflightStorageDestination(service, files, destinationPath);
  storageMoveCancelled(service);
  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  const state = {
    phase: "MOVING",
    progress: totalBytes ? 0 : 100,
    bytesMoved: 0,
    totalBytes,
    copiedFiles: 0,
    totalFiles: files.length,
    currentFile: "",
  };
  let transferStartedAt = null;
  const emitMoveProgress = createThrottledProgressReporter(report, 100);
  const reportMove = (event, force = false) => {
    const bytesMoved = Number(event.bytesMoved) || 0;
    const elapsed = transferStartedAt
      ? Math.max(0.001, (performance.now() - transferStartedAt) / 1000)
      : 0;
    const speed = elapsed ? bytesMoved / elapsed : 0;
    emitMoveProgress(
      {
        ...event,
        phase: "MOVING",
        speed,
        eta:
          speed > 0 && totalBytes > bytesMoved
            ? (totalBytes - bytesMoved) / speed
            : null,
      },
      { force },
    );
  };
  reportMove(state, true);
  let completedSinceSave = 0;
  let manifestWrite = Promise.resolve();
  let transferFailure = null;
  try {
    await forEachWithConcurrencyUntilError(
      files,
      STORAGE_MOVE_COPY_CONCURRENCY,
      async (file) => {
        await moveStorageFile(
          service,
          file,
          destinationPath,
          state,
          reportMove,
          partialSuffix,
          () => {
            if (transferStartedAt === null)
              transferStartedAt = performance.now();
          },
        );
        completedFiles.add(file.relativePath);
        completedSinceSave += 1;
        if (completedSinceSave >= 32) {
          completedSinceSave = 0;
          manifestWrite = manifestWrite.then(persistManifest);
          await manifestWrite;
        }
      },
    );
  } catch (error) {
    transferFailure = error;
  }
  let manifestFailure = null;
  try {
    await manifestWrite;
  } catch (error) {
    manifestFailure = error;
  }
  try {
    await persistManifest();
  } catch (error) {
    manifestFailure ||= error;
  }
  if (transferFailure || manifestFailure)
    throw transferFailure || manifestFailure;
  reportMove({ ...state, progress: 100 }, true);
  return state;
}

async function prepareStorageDestination(service, destinationPath, marker) {
  if (!(await service.api.exists(destinationPath))) return;
  const entries = getRealEntries(
    await Neutralino.filesystem.readDirectory(destinationPath),
  ).filter(
    (entry) =>
      !isStorageMoveMarkerPath(
        `${destinationPath}/${entry.entry}`,
        destinationPath,
      ),
  );
  if (await isEmptyStorageScaffold(destinationPath, entries)) {
    return;
  }
  if (
    !marker ||
    normalizeComparablePath(marker.destination) !==
      normalizeComparablePath(destinationPath)
  ) {
    throw new Error(
      "The selected storage folder must be empty. Use the existing WeekBox library directly instead.",
    );
  }
}

async function getStorageMovePlan(
  service,
  basePath,
  { destinationIsResolved = false } = {},
) {
  const destinationPath = destinationIsResolved
    ? trimPath(basePath)
    : service.getStorageDestinationPath(basePath);
  if (!destinationPath) throw new Error("Choose a storage folder first");
  const pending = service.pendingStorageMove;
  if (
    normalizeComparablePath(destinationPath) ===
    normalizeComparablePath(service.basePath)
  ) {
    return { destinationPath, pending, samePath: true };
  }
  await service.assertStoragePathAllowed(destinationPath);
  if (service.hasRunningProcesses()) {
    throw new Error("Close running engines before moving WeekBox files");
  }
  if (pathsOverlap(destinationPath, service.basePath)) {
    throw new Error(
      "Choose a storage folder outside the current storage folder.",
    );
  }
  if (
    pending &&
    normalizeComparablePath(pending.destination) !==
      normalizeComparablePath(destinationPath)
  ) {
    throw new Error(
      `Resume the interrupted storage move to ${pending.destination} before choosing another location.`,
    );
  }
  return {
    destinationPath,
    pending,
    samePath: false,
    markerPath: pending?.markerPath || storageMoveMarkerPath(service.basePath),
  };
}

async function finishSamePathStorageMove(service, plan) {
  if (
    plan.pending &&
    normalizeComparablePath(plan.pending.destination) ===
      normalizeComparablePath(service.basePath) &&
    (await service.isCompleteStorage(service.basePath))
  ) {
    await Promise.all(
      [plan.pending.markerPath, ...getStorageMoveMarkerPaths(service.basePath)]
        .filter(
          (path, index, allPaths) => path && allPaths.indexOf(path) === index,
        )
        .map((path) => service.api.remove(path)),
    );
    service.pendingStorageMove = null;
  }
  return service.weekboxPath;
}

async function restoreStorageMoveState(
  service,
  { basePath, settingsPath, settingsDocument, storagePath, mods, engines },
) {
  service.setStoragePaths(basePath);
  appSettings.path = settingsPath;
  appSettings.document = settingsDocument;
  appSettings.set("storagePath", storagePath, { persist: false });
  const results = await service.injection.injectModsIntoInstalledEngines(
    mods,
    engines,
  );
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length) {
    return new Error(
      `Restored storage, but ${failures.length} installed mod(s) could not be linked back into engines.`,
    );
  }
  return null;
}

async function finalizeStorageMove(service, destinationPath, markerPaths) {
  service.setStoragePaths(destinationPath);
  await cleanupAtomicWriteTemps(service);
  const metadataMigrationComplete = await service.migrateStorageMetadata();
  await service.customEngines.load();
  await service.selectSettingsPath(destinationPath);
  await service.writeStorageManifest(destinationPath, {
    allowUpgrade: metadataMigrationComplete,
  });
  const movedMods = (await service.mods.getAll()) || [];
  const movedEngines = await service.getInstalledEngines();
  const injectionResults =
    await service.injection.injectModsIntoInstalledEngines(
      movedMods,
      movedEngines,
    );
  const injectionFailure = injectionResults.find(
    (result) => result.status === "rejected",
  );
  if (injectionFailure) throw injectionFailure.reason;
  await Promise.all(
    [...new Set(markerPaths.filter(Boolean))].map((path) =>
      service.api.remove(path),
    ),
  );
  service.pendingStorageMove = null;
}

async function completeStorageMove(
  service,
  destinationPath,
  transferState,
  mods,
  engines,
  markerPaths,
  nativeMove,
  report,
) {
  report({ ...transferState, phase: "VERIFYING", progress: 100 });
  await service.ensureStorageDirectoriesAt(destinationPath);
  if (!(await service.isCompleteStorage(destinationPath))) {
    throw new Error("The destination is missing required WeekBox folders.");
  }
  if (!nativeMove) {
    const unlinkResults = await allSettledWithConcurrency(mods, 3, (mod) =>
      service.injection.unlinkFromInstalledEngines(mod, engines),
    );
    const unlinkFailure = unlinkResults.find(
      (result) => result.status === "rejected",
    );
    if (unlinkFailure) throw unlinkFailure.reason;
  }
  report({ ...transferState, phase: "FINALIZING", progress: 100 });
  await finalizeStorageMove(service, destinationPath, markerPaths);
  report({ phase: "COMPLETE", progress: 100 });
}

async function recoverStorageMoveFailure(
  service,
  error,
  {
    previousBasePath,
    previousSettingsPath,
    previousStoragePath,
    previousSettingsDocument,
    mods,
    engines,
    lastProgress,
    report,
  },
) {
  const cancelled = error?.code === "STORAGE_MOVE_CANCELLED";
  let restoreError = null;
  try {
    restoreError = await restoreStorageMoveState(service, {
      basePath: previousBasePath,
      settingsPath: previousSettingsPath,
      settingsDocument: previousSettingsDocument,
      storagePath: previousStoragePath,
      mods,
      engines,
    });
  } catch (stateError) {
    restoreError = stateError;
  }
  if (cancelled) {
    report({ ...lastProgress, phase: "CANCELLED" });
    console.info("[WeekBox] Storage move cancelled");
    throw error;
  }
  const failureMessage = [
    error?.message || String(error),
    restoreError?.message && `Recovery warning: ${restoreError.message}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  report({ ...lastProgress, phase: "FAILED", error: failureMessage });
  console.error("[WeekBox] Storage move failed", error, restoreError);
  throw new Error(
    `Could not move the WeekBox library. The files already transferred are safe. You can retry the move to continue where it stopped.\n\nReason: ${failureMessage}`,
  );
}

async function moveStorageTo(
  service,
  basePath,
  onProgress = () => {},
  { destinationIsResolved = false } = {},
) {
  service.assertStorageUnlocked({ allowPending: true });
  const plan = await getStorageMovePlan(service, basePath, {
    destinationIsResolved,
  });
  if (plan.samePath) return finishSamePathStorageMove(service, plan);
  const { destinationPath, pending, markerPath } = plan;
  const isResume = Boolean(pending);
  const useNativeRootMove = await canUseNativeStorageRootMove(
    service,
    destinationPath,
    pending,
  );
  const previousBasePath = service.basePath;
  const previousSettingsPath = appSettings.path;
  const previousStoragePath = appSettings.get("storagePath");
  const previousSettingsDocument = JSON.parse(
    JSON.stringify(appSettings.document),
  );
  let mods = [];
  let engines = [];
  let nativeRootMoved = false;
  service.isStorageMoveInProgress = true;
  service.storageMoveCancelled = false;
  let lastProgress = {};
  const report = (event) => {
    lastProgress = { ...lastProgress, ...event };
    onProgress({ phase: "PREPARING", ...lastProgress });
  };
  try {
    await service.api.ensureDir(getParentPath(destinationPath));
    if (!useNativeRootMove) {
      await prepareStorageDestination(service, destinationPath, pending);
    } else if (!(await service.isCompleteStorage(previousBasePath))) {
      throw new Error("The current WeekBox library is incomplete.");
    }
    const marker = {
      ...pending,
      version: pending?.version || 1,
      source: previousBasePath,
      destination: destinationPath,
      startedAt: pending?.startedAt || new Date().toISOString(),
      operation: "move",
      ...(useNativeRootMove ? { strategy: "native-root-rename" } : {}),
    };
    await Promise.all(
      getStorageMoveMarkerPaths(previousBasePath)
        .slice(0, 2)
        .map((path) =>
          service.api.writeAtomic(path, `${JSON.stringify(marker)}\n`),
        ),
    );
    service.pendingStorageMove = { ...marker, markerPath };
    console.info(`[WeekBox] Storage move ${isResume ? "resumed" : "started"}`, {
      source: previousBasePath,
      destination: destinationPath,
    });
    report({
      phase: "PREPARING",
      progress: null,
      bytesMoved: 0,
      totalBytes: 0,
    });
    const storedMods = await service.mods.getAll();
    mods = Array.isArray(storedMods) ? storedMods : [];
    engines = await service.getInstalledEngines();
    let transferState;
    if (useNativeRootMove) {
      nativeRootMoved = await moveStorageRootNatively(
        service,
        previousBasePath,
        destinationPath,
        mods,
        engines,
        report,
      );
      transferState = {
        phase: "MOVING",
        progress: 100,
        bytesMoved: 0,
        totalBytes: 0,
      };
    } else {
      transferState = await transferStorageFiles(
        service,
        previousBasePath,
        destinationPath,
        markerPath,
        (event) => report(event),
      );
    }
    await completeStorageMove(
      service,
      destinationPath,
      transferState,
      mods,
      engines,
      [
        markerPath,
        ...getStorageMoveMarkerPaths(previousBasePath),
        ...getStorageMoveMarkerPaths(destinationPath),
      ],
      useNativeRootMove,
      report,
    );
    console.info("[WeekBox] Storage move completed", {
      source: previousBasePath,
      destination: destinationPath,
    });
    return service.weekboxPath;
  } catch (error) {
    if (nativeRootMoved) {
      service.setStoragePaths(destinationPath);
      const message = `The library was moved to ${destinationPath}, but final setup did not finish. Restart WeekBox to resume setup.\n\nReason: ${error?.message || error}`;
      report({ ...lastProgress, phase: "FAILED", error: message });
      throw new Error(message, { cause: error });
    }
    await recoverStorageMoveFailure(service, error, {
      previousBasePath,
      previousSettingsPath,
      previousStoragePath,
      previousSettingsDocument,
      mods,
      engines,
      lastProgress,
      report,
    });
  } finally {
    service.isStorageMoveInProgress = false;
    service.storageMoveCancelled = false;
  }
}

export {
  cleanupAtomicWriteTemps,
  hasStorageIdentity,
  isEmptyStorageScaffold,
  migrateStorageMetadata,
  moveStorageTo,
  readStorageMoveMarker,
};
