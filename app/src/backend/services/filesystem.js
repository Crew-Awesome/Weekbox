import { APIneuFileSystem } from "./filesystem/api-neu-file-system.service.js";
import { ExecutableService } from "./filesystem/executable.service.js";
import { LibraryMaintenanceService } from "./filesystem/library-maintenance.service.js";
import { ModCoverService } from "./filesystem/mod-cover.service.js";
import { ModInjectionService } from "./filesystem/mod-injection.service.js";
import { ModRepository } from "./filesystem/mod-repository.service.js";
import { CustomEngineRepository } from "./filesystem/custom-engine-repository.service.js";
import { ProcessService } from "./processes/process.service.js";
import { appSettings } from "../core/system/settings.service.js";
import {
  getParentPath,
  sanitizePathSegment,
  getRealEntries,
  getModFolderName,
  getEngineModFolderName,
  pathsOverlap,
  normalizeComparablePath,
} from "./filesystem/path.util.js";
import { isValidEngineVersion } from "./filesystem/engine-version.service.js";
import {
  getEngineLaunchBehavior,
  getEngineModLaunchArgs,
  ENGINE_DETAILS as ENGINE_DETAILS,
} from "../../backend/config/engines.config.js";

function sameId(left, right) {
  return String(left) === String(right);
}

function isOneDrivePath(path) {
  return /(?:^|[\\/])OneDrive(?:[\\/]|$)/i.test(String(path));
}

function isICloudPath(path) {
  return /(?:^|\/)Library\/Mobile Documents\/com~apple~CloudDocs(?:\/|$)/i.test(
    String(path),
  );
}

function isWeekBoxFolder(path) {
  return /(?:^|[\\/])weekbox$/i.test(String(path).replace(/[\\/]+$/, ""));
}

function trimPath(path) {
  return String(path || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
}

const STORAGE_MOVE_MARKER_SUFFIX = ".weekbox-moving.json";
const STORAGE_REPLACEMENT_SUFFIX = ".weekbox-replacing";

function storageMoveMarkerPath(path) {
  return `${trimPath(path)}${STORAGE_MOVE_MARKER_SUFFIX}`;
}

function quoteWindowsArgument(value) {
  return `"${String(value)
    .replace(/(["^%])/g, "^$1")
    .replace(/\//g, "\\")}"`;
}

function isMatchingStorageMove(marker, sourcePath, destinationPath) {
  return (
    normalizeComparablePath(marker?.sourcePath) ===
      normalizeComparablePath(sourcePath) &&
    normalizeComparablePath(marker?.destinationPath) ===
      normalizeComparablePath(destinationPath)
  );
}

async function readStorageMoveMarker(service, markerPath) {
  if (!(await service.api.exists(markerPath))) return null;
  try {
    return JSON.parse(await service.api.read(markerPath));
  } catch {
    return null;
  }
}

function getWindowsBulkCopyCommand(sourcePath, destinationPath) {
  return [
    "robocopy",
    quoteWindowsArgument(sourcePath),
    quoteWindowsArgument(destinationPath),
    "/E",
    "/COPY:DAT",
    "/DCOPY:DA",
    "/MT:16",
    "/J",
    "/Z",
    "/R:2",
    "/W:2",
    "/XJ",
    "/NFL",
    "/NDL",
  ].join(" ");
}

async function moveStorageDirectory(service, sourcePath, destinationPath) {
  let nativeError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await Neutralino.filesystem.move(sourcePath, destinationPath);
      return;
    } catch (error) {
      nativeError = error;
      if (attempt < 3)
        await new Promise((resolve) => setTimeout(resolve, attempt * 150));
    }
  }

  if (!(await service.api.exists(sourcePath))) {
    if (await service.api.exists(destinationPath)) return;
    throw nativeError || new Error("Storage source disappeared during move");
  }

  if (window.NL_OS === "Windows") {
    const result = await Neutralino.os.execCommand(
      getWindowsBulkCopyCommand(sourcePath, destinationPath),
      { background: false },
    );
    if (Number(result?.exitCode) >= 8) {
      const detail = String(result?.stdErr || result?.stdOut || "")
        .replace(/[\0\r\n]+/g, " ")
        .trim();
      throw new Error(
        `Windows could not finish the storage move${detail ? `: ${detail}` : "."}`,
      );
    }
    if (await service.api.exists(sourcePath)) {
      const remaining = getRealEntries(
        await Neutralino.filesystem.readDirectory(sourcePath).catch(() => []),
      );
      if (remaining.length) {
        throw new Error(
          "Some storage files could not be copied. Retry the move to continue.",
        );
      }
      await service.api.remove(sourcePath);
    }
    return;
  }

  await service.api.ensureDir(destinationPath);
  await Neutralino.filesystem.copy(sourcePath, destinationPath, {
    recursive: true,
    overwrite: true,
    skip: false,
  });
  if (!(await service.api.exists(destinationPath))) {
    throw (
      nativeError || new Error("Storage copy did not create its destination")
    );
  }
  await service.api.remove(sourcePath);
}

const LOCAL_MOD_COVER_FILES = [
  "cover.png",
  "cover.jpg",
  "cover.jpeg",
  "thumbnail.png",
  "thumbnail.jpg",
  "thumbnail.jpeg",
  "icon.png",
  "icon.jpg",
  "icon.jpeg",
  "images/icon.png",
  "images/icon.jpg",
  "images/icon.jpeg",
];

function getDataUrlMimeType(path) {
  const extension = String(path || "")
    .split(".")
    .pop()
    ?.toLocaleLowerCase();
  return extension === "jpg" || extension === "jpeg"
    ? "image/jpeg"
    : extension === "webp"
      ? "image/webp"
      : "image/png";
}

async function prepareMoveDestination(
  service,
  { destinationBasePath, markerPath, marker, isResume, options },
) {
  let replacedDestinationPath = marker?.replacedDestinationPath || null;
  const destinationExists = await service.api.exists(destinationBasePath);
  if (!destinationExists) return replacedDestinationPath;
  if (isResume) {
    if (
      replacedDestinationPath &&
      !(await service.api.exists(replacedDestinationPath))
    ) {
      await service.api.move(destinationBasePath, replacedDestinationPath);
    }
    return replacedDestinationPath;
  }

  const entries = getRealEntries(
    await Neutralino.filesystem.readDirectory(destinationBasePath),
  );
  if (!entries.length) {
    if (!service.isStorageInExecutableDirectory()) {
      await service.api.remove(destinationBasePath);
    }
    return replacedDestinationPath;
  }
  if (!options.replaceExisting) {
    throw new Error(
      "The selected folder already contains files. Choose an empty folder or replace it explicitly.",
    );
  }
  replacedDestinationPath = `${destinationBasePath}${STORAGE_REPLACEMENT_SUFFIX}`;
  if (await service.api.exists(replacedDestinationPath)) {
    throw new Error(
      "A previous storage move is waiting for recovery. Retry the original destination or choose another folder.",
    );
  }
  await service.api.write(
    markerPath,
    `${JSON.stringify({
      version: 1,
      sourcePath: service.basePath,
      destinationPath: destinationBasePath,
      replacedDestinationPath,
      startedAt: new Date().toISOString(),
    })}\n`,
  );
  try {
    await service.api.move(destinationBasePath, replacedDestinationPath);
  } catch (error) {
    await service.api.remove(markerPath).catch(() => {});
    throw error;
  }
  return replacedDestinationPath;
}

async function prepareStorageMove(service, basePath, options = {}) {
  const destinationBasePath = service.getStorageDestinationPath(basePath);
  if (!destinationBasePath) throw new Error("Choose a storage folder first");
  if (
    normalizeComparablePath(destinationBasePath) ===
    normalizeComparablePath(service.basePath)
  ) {
    return { samePath: service.weekboxPath };
  }
  await service.assertStoragePathAllowed(destinationBasePath);
  if (service.hasRunningProcesses()) {
    throw new Error("Close running engines before moving WeekBox files");
  }
  if (pathsOverlap(destinationBasePath, service.basePath)) {
    throw new Error(
      "Choose a storage folder outside the current storage folder.",
    );
  }
  await service.api.ensureDir(getParentPath(destinationBasePath));
  const markerPath = storageMoveMarkerPath(destinationBasePath);
  const marker = await readStorageMoveMarker(service, markerPath);
  const isResume = isMatchingStorageMove(
    marker,
    service.basePath,
    destinationBasePath,
  );
  const replacedDestinationPath = await prepareMoveDestination(service, {
    destinationBasePath,
    markerPath,
    marker,
    isResume,
    options,
  });
  if (
    replacedDestinationPath &&
    pathsOverlap(replacedDestinationPath, service.basePath)
  ) {
    throw new Error("Choose a storage folder outside the current library.");
  }
  return {
    destinationBasePath,
    markerPath,
    marker,
    isResume,
    replacedDestinationPath,
    storageOnlyMove: service.isStorageInExecutableDirectory(),
  };
}

async function completeStorageMove(
  service,
  destinationBasePath,
  replacedDestinationPath,
  markerPath,
) {
  service.setStoragePaths(destinationBasePath);
  await service.customEngines.load();
  await appSettings.setDataPath(destinationBasePath);
  await appSettings.write();
  const movedMods = (await service.mods.getAll()) || [];
  const movedEngines = await service.getInstalledEngines();
  await Promise.all(
    movedMods.map((mod) =>
      service.injection.injectIntoInstalledEngines(mod.id, movedEngines),
    ),
  );
  if (
    replacedDestinationPath &&
    (await service.api.exists(replacedDestinationPath))
  ) {
    await service.api
      .remove(replacedDestinationPath)
      .catch((cleanupError) =>
        console.warn(
          "Could not remove the temporary replaced library",
          cleanupError,
        ),
      );
  }
  await service.api.remove(markerPath).catch(() => {});
}

async function prepareLocalModImport(
  service,
  { sourcePath, name, engineId, kind },
) {
  if (!service.isInitialized) throw new Error("WeekBox storage is not ready");
  const modName = String(name || "").trim();
  if (!modName) throw new Error("Give the mod a name");
  const normalizedSource = String(sourcePath || "")
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
  const normalizedModsPath = service.modsPath
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
  if (!normalizedSource) throw new Error("Choose a mod folder first");
  if (
    normalizedSource.toLowerCase() === normalizedModsPath.toLowerCase() ||
    normalizedSource
      .toLowerCase()
      .startsWith(`${normalizedModsPath.toLowerCase()}/`)
  ) {
    throw new Error("Choose a folder outside your WeekBox mods library");
  }
  const sourceStats = await Neutralino.filesystem.getStats(normalizedSource);
  if (!sourceStats.isDirectory)
    throw new Error("The selected path is not a folder");
  const isExecutable = Boolean(await service.findExecutable(normalizedSource));
  const resolvedEngineId = isExecutable ? "executable" : engineId;
  const requestedKind = ["mod", "addon", "dependency"].includes(kind)
    ? isExecutable
      ? "mod"
      : kind
    : "mod";
  if (
    requestedKind === "addon" &&
    resolvedEngineId !== "codename" &&
    !service.isCustomEngine(resolvedEngineId)
  ) {
    throw new Error("Addons are only available for Codename Engine mods");
  }
  const folderName = await service.getAvailableLocalModFolderName(modName);
  return {
    modId: `local-${crypto.randomUUID()}`,
    modName,
    normalizedSource,
    requestedKind,
    folderName,
    destinationPath: `${service.modsPath}/${folderName}`,
    engineFolderName: sanitizePathSegment(modName) || folderName,
    engineId: resolvedEngineId,
  };
}

async function removeModFiles(service, mod, folderName) {
  if (
    !folderName ||
    /[\\/]/.test(folderName) ||
    folderName === "." ||
    folderName === ".."
  ) {
    throw new Error(`Invalid mod folder for ${mod.name}`);
  }
  const modPath = `${service.modsPath}/${folderName}`;
  if (!(await service.api.exists(modPath))) return;
  const command =
    window.NL_OS === "Windows"
      ? `cmd /c rmdir /S /Q "${modPath.replace(/\//g, "\\")}"`
      : `rm -rf "${modPath}"`;
  let result;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    result = await Neutralino.os.execCommand(command, { background: false });
    if (result.exitCode === 0 || !(await service.api.exists(modPath))) return;
    if (attempt < 3)
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
  }
  if (result?.exitCode !== 0 && (await service.api.exists(modPath))) {
    const detail = String(result?.stdErr || result?.stdOut || "")
      .replace(/[\0\r]+/g, " ")
      .trim();
    throw new Error(
      detail
        ? `Could not remove mod files because a file is in use: ${detail}`
        : `Could not remove mod files for ${mod.name}. Close any program using this mod and try again.`,
    );
  }
}

async function copyCustomEngineInstall(
  service,
  { source, resolvedId, version, executable, details },
) {
  const installId = `${version}-${crypto.randomUUID().slice(0, 8)}`;
  const stagingPath = `${service.enginesPath}/.custom-install-${crypto.randomUUID()}`;
  const destinationPath = `${service.enginesPath}/${resolvedId}/${installId}`;
  try {
    await service.api.ensureDir(`${service.enginesPath}/${resolvedId}`);
    await Neutralino.filesystem.copy(source, stagingPath, {
      recursive: true,
      overwrite: false,
      skip: false,
    });
    const requestedExecutable = String(executable || details.executable || "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");
    const requestedExecutablePath = `${stagingPath}/${requestedExecutable}`;
    const stagedExecutable =
      requestedExecutable && (await service.api.exists(requestedExecutablePath))
        ? requestedExecutablePath
        : await service.findExecutable(stagingPath);
    if (!stagedExecutable)
      throw new Error("The imported folder has no runnable executable.");
    const stagedPrefix = `${stagingPath}/`;
    const executableRelative = stagedExecutable.startsWith(stagedPrefix)
      ? stagedExecutable.slice(stagedPrefix.length)
      : requestedExecutable;
    const manifest = {
      version: 1,
      engineId: resolvedId,
      originalVersion: version,
      executable: executableRelative,
      modDirectories: Array.isArray(details.contentFolders)
        ? details.contentFolders
            .filter((folder) => folder?.path && folder.enabled)
            .map((folder) => ({
              path: sanitizePathSegment(folder.path),
              type: ["mod", "addon", "dependency"].includes(folder.type)
                ? folder.type
                : "mod",
              enabled: true,
            }))
        : [],
      sourceName: source.split("/").at(-1) || source,
    };
    await service.api.write(
      `${stagingPath}/engine.json`,
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await service.api.move(stagingPath, destinationPath);
    return {
      installId,
      executable: executableRelative,
      modDirectories: manifest.modDirectories,
      sourceName: manifest.sourceName,
    };
  } catch (error) {
    await service.api.remove(stagingPath).catch(() => {});
    await service.api.remove(destinationPath).catch(() => {});
    throw error;
  }
}

async function importCustomEngineContent(service, install, engineId, version) {
  const imported = [];
  const existingMods = await service.mods.getAll();
  for (const directory of install.modDirectories || []) {
    if (directory.enabled === false) continue;
    const sourceDirectory = `${install.path}/${directory.path}`;
    if (!(await service.api.exists(sourceDirectory))) continue;
    const entries = getRealEntries(
      await Neutralino.filesystem
        .readDirectory(sourceDirectory)
        .catch(() => []),
    );
    for (const entry of entries.filter((item) => item.type === "DIRECTORY")) {
      const name = entry.entry.trim();
      if (!name) continue;
      const sourceEngineFolder = `${directory.path}/${entry.entry}`;
      const engineFolderName = sanitizePathSegment(name) || name;
      const sourceMatch = existingMods.find(
        (mod) =>
          mod.sourceEngineId === engineId &&
          mod.sourceEngineVersion === version &&
          mod.sourceEngineFolder === sourceEngineFolder,
      );
      if (sourceMatch) {
        // ponytail: legacy records have no source metadata; use their engine

        const legacyMatch = existingMods.find(
          (mod) =>
            sourceMatch.source === "custom-engine" &&
            String(sourceMatch.id).startsWith("local-") &&
            mod !== sourceMatch &&
            !mod.sourceEngineId &&
            mod.engineId === engineId &&
            mod.engineFolderName === engineFolderName &&
            (!mod.engineVersion || mod.engineVersion === version),
        );
        if (legacyMatch) {
          await removeModFiles(service, sourceMatch, sourceMatch.folderName);
          legacyMatch.engineVersion = version;
          legacyMatch.sourceEngineId = engineId;
          legacyMatch.sourceEngineVersion = version;
          legacyMatch.sourceEngineFolder = sourceEngineFolder;
          existingMods.splice(existingMods.indexOf(sourceMatch), 1);
          await service.mods.saveAll(existingMods);
        }
        continue;
      }
      const legacyMatch = existingMods.find(
        (mod) =>
          !mod.sourceEngineId &&
          mod.engineId === engineId &&
          mod.engineFolderName === engineFolderName &&
          (!mod.engineVersion || mod.engineVersion === version),
      );
      if (legacyMatch) {
        legacyMatch.engineVersion = version;
        legacyMatch.sourceEngineId = engineId;
        legacyMatch.sourceEngineVersion = version;
        legacyMatch.sourceEngineFolder = sourceEngineFolder;
        await service.mods.saveAll(existingMods);
        continue;
      }
      const folderName = await service.getAvailableLocalModFolderName(name);
      const modId = `local-${crypto.randomUUID()}`;
      const destinationPath = `${service.modsPath}/${folderName}`;
      try {
        await Neutralino.filesystem.copy(
          `${sourceDirectory}/${entry.entry}`,
          destinationPath,
          { recursive: true, overwrite: false, skip: false },
        );
        const kind = ["addon", "dependency"].includes(directory.type)
          ? directory.type
          : null;
        await service.saveInstalledMod(modId, name, {
          folderName,
          engineFolderName,
          engineId,
          engineVersion: version,
          ...(kind ? { kind } : {}),
          source: "custom-engine",
          sourceEngineId: engineId,
          sourceEngineVersion: version,
          sourceEngineFolder,
        });
        imported.push(modId);
      } catch (error) {
        await service.api.remove(destinationPath).catch(() => {});
        throw error;
      }
    }
  }
  const engines = await service.getInstalledEngines();
  await Promise.all(
    imported.map((modId) =>
      service.injection.injectIntoInstalledEngines(modId, engines),
    ),
  );
  return imported;
}

var _FileSystemService = class _FileSystemService {
  constructor() {
    this.basePath = "";
    this.weekboxPath = "";
    this.enginesPath = "";
    this.modsPath = "";
    this.dataPath = "";
    this.isInitialized = false;
    this.initPromise = null;
    this.startupMaintenancePromise = null;
    this.isStorageMoveInProgress = false;
    this.activeDownload = null;
    this.abortController = null;
    this.isPaused = false;
    this.api = APIneuFileSystem;
    this.executables = new ExecutableService();
    this.processes = new ProcessService(this.executables);
    this.customEngines = new CustomEngineRepository({
      api: this.api,
      getDataPath: () => this.dataPath,
    });
    this.activeEngineProcesses = this.processes.activeProcesses;
    this.activeEngineMods = /* @__PURE__ */ new Map();
    this.engineUpdates = /* @__PURE__ */ new Set();
    document.addEventListener("weekbox-process-exit", (event) => {
      this.activeEngineMods.delete(event.detail.key);
    });
    this.mods = new ModRepository({
      api: this.api,
      getDataPath: () => this.dataPath,
    });
    this.covers = new ModCoverService({
      api: this.api,
      getDataPath: () => this.dataPath,
    });
    this.injection = new ModInjectionService({
      api: this.api,
      executables: this.executables,
      modRepository: this.mods,
      getEnginesPath: () => this.enginesPath,
      getModsPath: () => this.modsPath,
      getCustomEngine: (engineId) => this.customEngines.get(engineId),
      isEngineRunning: (engineId, version) =>
        this.isEngineRunning(engineId, version),
    });
    this.maintenance = new LibraryMaintenanceService({
      api: this.api,
      mods: this.mods,
      injection: this.injection,
      getEnginesPath: () => this.enginesPath,
      getEngineModsPath: (engineId, version) =>
        this.injection.getEngineModsPath(engineId, version),
      getCustomEngine: (engineId) => this.customEngines.get(engineId),
      getModsPath: () => this.modsPath,
      getInstalledEngines: () => this.getInstalledEngines(),
      isEngineRunning: (engineId, version) =>
        this.isEngineRunning(engineId, version),
      findExecutable: (path) => this.findExecutable(path),
    });
  }
  async init(options = {}) {
    if (this.isInitialized) {
      if (!options.deferMaintenance) await this.runStartupMaintenance();
      return;
    }
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init(options);
    try {
      return await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }
  async _init({ deferMaintenance = false } = {}) {
    if (typeof Neutralino !== "undefined") {
      const defaultStoragePath = await this.getDefaultStoragePath();
      const savedPath = appSettings.get("storagePath");
      let storagePath = null;
      if (savedPath && (await this.isCompleteStorage(savedPath))) {
        try {
          await this.assertStoragePathAllowed(savedPath);
          storagePath = trimPath(savedPath);
        } catch {}
      }

      storagePath ||= await this.findFallbackStorage();

      storagePath ||= defaultStoragePath;
      this.setStoragePaths(storagePath);
      await this.ensureStorageDirectories();
      await this.ensureStorageManifest();
      await this.selectSettingsPath(storagePath);
      await this.customEngines.load();
    }
    this.isInitialized = true;
    const restoredProcesses = await this.processes.restore();
    restoredProcesses.forEach(({ key, modId }) => {
      if (modId !== null && modId !== void 0)
        this.activeEngineMods.set(key, modId);
    });
    if (!deferMaintenance) await this.runStartupMaintenance();
  }
  async runStartupMaintenance({ onProgress } = {}) {
    if (this.startupMaintenancePromise) return this.startupMaintenancePromise;
    const runPhase = async (label, progress, task) => {
      onProgress?.(label, progress);
      const startedAt = performance.now();
      try {
        await task((message, nextProgress = progress) =>
          onProgress?.(message, nextProgress),
        );
        console.info(
          `[WeekBox] Startup maintenance: ${label} finished in ${Math.round(performance.now() - startedAt)}ms`,
        );
      } catch (error) {
        // Maintenance repairs stale files and metadata; a single failed repair
        // must not prevent an otherwise healthy library from opening.
        console.warn(`[WeekBox] Startup maintenance skipped: ${label}`, error);
      }
    };
    this.startupMaintenancePromise = (async () => {
      await runPhase("Cleaning incomplete downloads\u2026", 90, () =>
        this.cleanupIncompleteDownloads(),
      );
      await runPhase("Checking installed engines\u2026", 91, () =>
        this.cleanupInvalidEngineInstallations(),
      );
      await runPhase("Cleaning empty custom engine families\u2026", 92, () =>
        this.cleanupEmptyCustomEngineFamilies(),
      );
      await runPhase("Checking installed mods\u2026", 93, () =>
        this.cleanupInvalidInstalledMods(),
      );
      await runPhase("Checking executable mods\u2026", 94, () =>
        this.maintenance.migrateExecutableMods(),
      );
      await runPhase("Updating mod artwork\u2026", 95, () =>
        this.migrateLegacyModCovers(),
      );
      let installedEngines = [];
      await runPhase("Scanning engine versions\u2026", 96, async () => {
        installedEngines = await this.getInstalledEngines();
      });
      await runPhase("Updating custom engine icons\u2026", 96, () =>
        this.refreshCustomEngineIcons(installedEngines),
      );
      await runPhase("Updating engine mod folders\u2026", 97, async () => {
        await this.injection.migrateLegacyEngineModsFor(installedEngines);
      });
      await runPhase("Importing Psych Online mods\u2026", 98, () =>
        this.importPsychOnlineEngineMods(installedEngines),
      );
      await runPhase("Cleaning stale mod links\u2026", 99, () =>
        this.cleanupHiddenModLinks(installedEngines),
      );
    })();
    return this.startupMaintenancePromise;
  }
  async getDefaultStoragePath() {
    if (window.NL_OS === "Windows") {
      const localAppDataPath = trimPath(
        await Neutralino.os.getEnv("LOCALAPPDATA").catch(() => ""),
      );
      if (localAppDataPath) return `${localAppDataPath}/WeekBoxLibrary`;
    }
    const nativeDataPath = trimPath(
      await Neutralino.os.getPath("data").catch(() => ""),
    );
    const applicationDataPath = trimPath(window.NL_DATAPATH);
    const defaultCandidates = [nativeDataPath, applicationDataPath]
      .filter(Boolean)
      .map((candidate) =>
        window.NL_OS === "Darwin" && !/(?:^|[\\/])WeekBox$/i.test(candidate)
          ? `${candidate}/WeekBox`
          : candidate,
      );
    for (const candidate of defaultCandidates) {
      if (!candidate) continue;
      try {
        await this.assertStoragePathAllowed(candidate);
        return candidate;
      } catch {}
    }
    const fallbackKey = window.NL_OS === "Windows" ? "LOCALAPPDATA" : "HOME";
    const fallbackPath = trimPath(
      await Neutralino.os.getEnv(fallbackKey).catch(() => ""),
    );
    if (fallbackPath) {
      return window.NL_OS === "Darwin"
        ? `${fallbackPath}/Library/Application Support/WeekBox`
        : `${fallbackPath}/WeekBox`;
    }
    throw new Error("WeekBox could not find a writable storage location");
  }
  async findFallbackStorage() {
    const candidates = [];
    const add = (path) => {
      const value = trimPath(path);
      if (
        value &&
        !candidates.some(
          (item) =>
            normalizeComparablePath(item) === normalizeComparablePath(value),
        )
      ) {
        candidates.push(value);
      }
    };
    const addRootCandidates = (root) => {
      const value = trimPath(root);
      if (!value) return;
      add(`${value}/WeekBoxLibrary`);
      add(`${value}/WeekBoxLibrary-storage`);
      add(`${value}/WeekBoxData/WeekBox`);
      add(`${value}/WeekBox`);
    };

    addRootCandidates(getParentPath(window.NL_PATH));
    addRootCandidates(
      await Neutralino.os.getEnv("LOCALAPPDATA").catch(() => ""),
    );
    addRootCandidates(await Neutralino.os.getPath("documents").catch(() => ""));
    addRootCandidates(await Neutralino.os.getEnv("HOME").catch(() => ""));

    for (const candidate of candidates) {
      if (!(await this.isCompleteStorage(candidate))) continue;
      try {
        await this.assertStoragePathAllowed(candidate);
        return candidate;
      } catch {}
    }
    return null;
  }
  async isCompleteStorage(path) {
    const root = trimPath(path);
    if (!root) return false;
    const requiredPaths = ["data", "engines", "mods"].map(
      (directory) => `${root}/${directory}`,
    );
    return (
      await Promise.all(requiredPaths.map((item) => this.api.exists(item)))
    ).every(Boolean);
  }
  getStorageDestinationPath(path) {
    const selectedPath = trimPath(path);
    return selectedPath;
  }
  async assertStoragePathAllowed(path) {
    const selectedPath = trimPath(path);
    const selectedComparablePath = normalizeComparablePath(selectedPath);
    const appPath = normalizeComparablePath(window.NL_PATH);
    if (
      window.NL_OS === "Darwin" &&
      /\/[^/]+\.app\/Contents\/MacOS(?:\/|$)/i.test(selectedPath)
    ) {
      throw new Error(
        "Choose a storage folder outside the WeekBox application folder.",
      );
    }
    const runningExecutable = trimPath(window.NL_ARGS?.[0]);
    const executableDirectory = normalizeComparablePath(
      runningExecutable ? getParentPath(runningExecutable) : "",
    );
    const executableName =
      runningExecutable.split("/").pop() ||
      (window.NL_OS === "Windows" ? "WeekBox.exe" : "WeekBox");
    const hasAppFile = await Promise.all(
      ["resources.neu", executableName].map((file) =>
        this.api.exists(`${selectedPath}/${file}`),
      ),
    );
    if (
      selectedComparablePath === appPath ||
      selectedComparablePath === executableDirectory ||
      hasAppFile.some(Boolean)
    ) {
      throw new Error(
        "Choose a storage folder outside the WeekBox application folder.",
      );
    }
  }
  async copyFileAndVerify(sourcePath, destinationPath, { force = false } = {}) {
    if (
      typeof sourcePath !== "string" ||
      !sourcePath.trim() ||
      typeof destinationPath !== "string" ||
      !destinationPath.trim()
    ) {
      throw new Error("Storage copy paths are missing");
    }
    const sourceStats = await Neutralino.filesystem.getStats(sourcePath);
    const destinationStats = await Neutralino.filesystem
      .getStats(destinationPath)
      .catch(() => null);
    if (
      !force &&
      destinationStats &&
      Number(destinationStats.size) === Number(sourceStats.size)
    ) {
      return;
    }
    let lastError;
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      try {
        await this.api.remove(destinationPath);
        await Neutralino.filesystem.copy(sourcePath, destinationPath, {
          recursive: false,
          overwrite: true,
          skip: false,
        });
        const copiedStats =
          await Neutralino.filesystem.getStats(destinationPath);
        if (Number(copiedStats.size) === Number(sourceStats.size)) return;
        lastError = new Error(
          `Storage verification failed for ${destinationPath}`,
        );
      } catch (error) {
        lastError = error;
      }
      if (attempt < 8)
        await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
    throw new Error(
      `Could not copy ${sourcePath} -> ${destinationPath}: ${lastError?.message || lastError}`,
    );
  }
  async writeStorageManifest(root, { force = false } = {}) {
    const manifestPath = `${root}/storage-manifest.json`;
    if (await this.api.exists(manifestPath)) {
      try {
        const manifest = JSON.parse(await this.api.read(manifestPath));
        if (!force && manifest?.version === 1) return;
      } catch {}
    }
    await this.api.write(
      manifestPath,
      `${JSON.stringify({ version: 1 }, null, 2)}\n`,
    );
  }
  async ensureStorageManifest() {
    await this.writeStorageManifest(this.basePath);
  }
  async selectSettingsPath(storagePath) {
    const root = trimPath(storagePath);
    const settingsPath = `${root}/settings.json`;
    if (
      normalizeComparablePath(appSettings.path) !==
      normalizeComparablePath(settingsPath)
    ) {
      await appSettings.load(root);
    }
    appSettings.set("storagePath", root, { persist: false });
    await appSettings.setDataPath(root);
    await appSettings.write();
  }
  async ensureStorageDirectoriesAt(root) {
    await this.api.ensureDir(root);
    await Promise.all(
      ["data", "engines", "mods"].map((directory) =>
        this.api.ensureDir(`${root}/${directory}`),
      ),
    );
  }
  setStoragePaths(basePath) {
    const normalizedBasePath = trimPath(basePath);
    if (
      !normalizedBasePath ||
      /^(?:undefined|null)$/i.test(normalizedBasePath)
    ) {
      throw new Error("WeekBox could not find a writable storage location");
    }
    this.basePath = normalizedBasePath;
    this.weekboxPath = this.basePath;
    this.enginesPath = `${this.basePath}/engines`;
    this.modsPath = `${this.basePath}/mods`;
    this.dataPath = `${this.basePath}/data`;
  }
  async ensureStorageDirectories() {
    await this.api.ensureDir(this.basePath);
    if (!(await this.api.exists(this.basePath))) {
      throw new Error("Selected storage folder is unavailable");
    }
    await this.api.ensureDir(this.enginesPath);
    await this.api.ensureDir(this.modsPath);
    await this.api.ensureDir(this.dataPath);
  }
  hasRunningProcesses() {
    return this.activeEngineProcesses.size > 0;
  }
  assertStorageUnlocked() {
    if (this.isStorageMoveInProgress) {
      throw new Error("Wait for WeekBox files to finish moving first");
    }
  }
  async findExistingStorage(basePath) {
    const selectedPath = trimPath(basePath);
    if (!selectedPath) return null;
    const candidates = isWeekBoxFolder(selectedPath)
      ? [selectedPath]
      : [selectedPath, `${selectedPath}/WeekBox`];
    for (const candidate of candidates) {
      if (await this.isCompleteStorage(candidate)) {
        return {
          basePath: candidate,
          weekboxPath: candidate,
        };
      }
    }
    return null;
  }
  async hasStorageFolder(basePath) {
    const selectedPath = trimPath(basePath);
    if (!selectedPath) return false;
    if (isWeekBoxFolder(selectedPath)) {
      return this.api.exists(selectedPath);
    }
    return this.api.exists(`${selectedPath}/WeekBox`);
  }
  async useExistingStorage(basePath) {
    this.assertStorageUnlocked();
    if (this.hasRunningProcesses()) {
      throw new Error("Close running engines before changing WeekBox storage");
    }
    const storage = await this.findExistingStorage(basePath);
    if (!storage) {
      throw new Error(
        "The selected folder does not contain a complete WeekBox library.",
      );
    }
    await this.assertStoragePathAllowed(storage.basePath);
    this.setStoragePaths(storage.basePath);
    await this.ensureStorageDirectories();
    await this.ensureStorageManifest();
    await this.selectSettingsPath(storage.basePath);
    await this.customEngines.load();
    return this.weekboxPath;
  }
  async moveStorageTo(basePath, onProgress = () => {}, options = {}) {
    this.assertStorageUnlocked();
    const move = await prepareStorageMove(this, basePath, options);
    if (move.samePath) return move.samePath;
    const {
      destinationBasePath,
      markerPath,
      marker: previousMarker,
      replacedDestinationPath,
      storageOnlyMove,
    } = move;
    this.isStorageMoveInProgress = true;
    const previousBasePath = this.basePath;
    const previousSettingsPath = appSettings.path;
    const previousStoragePath = appSettings.get("storagePath");
    let mods = [];
    let engines = [];
    let transferComplete = false;
    try {
      await this.api.write(
        markerPath,
        `${JSON.stringify({
          version: 1,
          sourcePath: previousBasePath,
          destinationPath: destinationBasePath,
          replacedDestinationPath,
          startedAt: previousMarker?.startedAt || new Date().toISOString(),
        })}\n`,
      );
      onProgress({
        progress: 0,
        copiedFiles: 0,
        totalFiles: 0,
        phase: "moving",
      });
      const storedMods = await this.mods.getAll();
      mods = Array.isArray(storedMods) ? storedMods : [];
      engines = await this.getInstalledEngines();
      await Promise.all(
        mods.map((mod) =>
          this.injection.unlinkFromInstalledEngines(mod, engines),
        ),
      );
      if (storageOnlyMove) {
        await this.api.ensureDir(destinationBasePath);
        for (const [index, directory] of [
          "data",
          "engines",
          "mods",
        ].entries()) {
          await moveStorageDirectory(
            this,
            `${this.weekboxPath}/${directory}`,
            `${destinationBasePath}/${directory}`,
          );
          onProgress({
            progress: ((index + 1) / 3) * 100,
            copiedFiles: 0,
            totalFiles: 0,
            phase: "moving",
          });
        }
      } else {
        await moveStorageDirectory(this, this.weekboxPath, destinationBasePath);
      }
      transferComplete = true;
      await this.api.remove(`${destinationBasePath}/data/settings.json`);
      await this.ensureStorageDirectoriesAt(destinationBasePath);
      appSettings.set("storagePath", destinationBasePath, { persist: false });
      await appSettings.write(`${destinationBasePath}/settings.json`);
      await this.writeStorageManifest(destinationBasePath);
      if (
        !(await this.isCompleteStorage(destinationBasePath)) ||
        !(await this.api.exists(`${destinationBasePath}/settings.json`))
      ) {
        throw new Error("WeekBox storage move did not pass verification");
      }
      await completeStorageMove(
        this,
        destinationBasePath,
        replacedDestinationPath,
        markerPath,
      );
      onProgress({
        progress: 100,
        copiedFiles: 0,
        totalFiles: 0,
        phase: "moving",
      });
      return this.weekboxPath;
    } catch (error) {
      if (transferComplete) {
        try {
          await completeStorageMove(
            this,
            destinationBasePath,
            replacedDestinationPath,
            markerPath,
          );
          return this.weekboxPath;
        } catch (recoveryError) {
          console.error(
            "Could not finish the completed storage move",
            recoveryError,
          );
          this.setStoragePaths(destinationBasePath);
          appSettings.path = `${destinationBasePath}/settings.json`;
          appSettings.set("storagePath", destinationBasePath, {
            persist: false,
          });
          throw new Error(
            `The storage files were moved, but WeekBox could not finish saving the new location. Restart WeekBox and retry if needed. ${recoveryError?.message || recoveryError}`,
          );
        }
      }
      this.setStoragePaths(previousBasePath);
      appSettings.path = previousSettingsPath;
      appSettings.set("storagePath", previousStoragePath, { persist: false });
      await Promise.all(
        mods.map((mod) =>
          this.injection.injectIntoInstalledEngines(mod.id, engines),
        ),
      ).catch(() => {});
      throw new Error(
        `Could not move WeekBox files: ${error?.message || error}. The original files were kept where possible; retry the same destination to resume.`,
      );
    } finally {
      this.isStorageMoveInProgress = false;
    }
  }
  async copyDirectoryWithProgress(
    sourcePath,
    destinationPath,
    onProgress,
    { continueOnError = false, forcePaths = new Set() } = {},
  ) {
    const files = [];
    const directories = [];
    const failures = [];
    let failedFileCount = 0;
    const recordFailure = (path, error) => {
      failedFileCount += 1;
      if (failures.length >= 100) return;
      const relativePath = String(path)
        .slice(sourcePath.length)
        .replace(/^[\\/]+/, "");
      failures.push({
        path: relativePath || String(path),
        reason: error?.message || String(error),
      });
    };
    onProgress({
      progress: 0,
      copiedFiles: 0,
      totalFiles: 0,
      failedFiles: 0,
      phase: "preparing",
    });
    const collectFiles = async (directoryPath) => {
      directories.push(directoryPath);
      let entries;
      try {
        entries = getRealEntries(
          await Neutralino.filesystem.readDirectory(directoryPath),
        );
      } catch (error) {
        if (!continueOnError) throw error;
        recordFailure(directoryPath, error);
        return;
      }
      for (const entry of entries) {
        const entryPath = `${directoryPath}/${entry.entry}`;
        if (entry.type === "DIRECTORY") {
          await collectFiles(entryPath);
        } else if (entry.type === "FILE") {
          try {
            const stats = await Neutralino.filesystem.getStats(entryPath);
            files.push({ path: entryPath, size: Number(stats.size) || 0 });
          } catch (error) {
            if (!continueOnError) throw error;
            recordFailure(entryPath, error);
          }
          onProgress({
            progress: 0,
            copiedFiles: 0,
            totalFiles: files.length,
            failedFiles: failedFileCount,
            phase: "preparing",
          });
        }
      }
    };
    await collectFiles(sourcePath);
    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    let copiedBytes = 0;
    let copiedFiles = 0;
    let processedBytes = 0;
    let processedFiles = 0;
    const reportProgress = () => {
      const progress = totalBytes
        ? (processedBytes / totalBytes) * 100
        : files.length
          ? (processedFiles / files.length) * 100
          : 100;
      onProgress({
        progress,
        copiedFiles,
        totalFiles: files.length,
        failedFiles: failedFileCount,
        phase: "copying",
      });
    };
    reportProgress();
    for (const sourceDirectory of directories) {
      const relativePath = sourceDirectory.slice(sourcePath.length);
      try {
        await this.api.ensureDir(`${destinationPath}${relativePath}`);
      } catch (error) {
        if (!continueOnError) throw error;
        recordFailure(sourceDirectory, error);
      }
    }
    const concurrency = appSettings.get("multithreadStorageMoves") ? 4 : 1;
    let nextFileIndex = 0;
    const copyNextFile = async () => {
      while (nextFileIndex < files.length) {
        const file = files[nextFileIndex++];
        const relativePath = file.path.slice(sourcePath.length);
        try {
          await this.copyFileAndVerify(
            file.path,
            `${destinationPath}${relativePath}`,
            {
              force: forcePaths.has(relativePath.replace(/^[\\/]+/, "")),
            },
          );
          copiedBytes += file.size;
          copiedFiles += 1;
        } catch (error) {
          if (!continueOnError) throw error;
          recordFailure(file.path, error);
        } finally {
          processedBytes += file.size;
          processedFiles += 1;
          reportProgress();
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(concurrency, files.length) }, copyNextFile),
    );
    return {
      failures,
      failedFileCount,
      totalFiles: files.length,
      copiedFiles,
      totalBytes,
      copiedBytes,
    };
  }
  async copyStorageDirectoriesWithProgress(
    sourceWeekboxPath,
    destinationWeekboxPath,
    onProgress,
  ) {
    const directories = ["data", "engines", "mods"];
    for (let index = 0; index < directories.length; index += 1) {
      const directory = directories[index];
      await this.copyDirectoryWithProgress(
        `${sourceWeekboxPath}/${directory}`,
        `${destinationWeekboxPath}/${directory}`,
        (event) =>
          onProgress({
            ...event,
            progress:
              ((index + Math.max(0, Math.min(100, event.progress)) / 100) /
                directories.length) *
              100,
          }),
      );
    }
  }
  async shouldRecommendDefaultStorage() {
    if (appSettings.get("storageMoveRecommendationDismissed")) return false;
    if (this.isStorageInExecutableDirectory()) return true;
    if (window.NL_OS !== "Windows" && window.NL_OS !== "Darwin") {
      return false;
    }
    if (window.NL_OS === "Darwin") return this.isICloudStorage();
    const defaultPath = await this.getDefaultStoragePath();
    const usingDefault =
      this.basePath.toLowerCase() === String(defaultPath).toLowerCase();
    if (usingDefault) return false;
    return this.isOneDriveStorage();
  }
  isOneDriveStorage() {
    return window.NL_OS === "Windows" && isOneDrivePath(this.basePath);
  }
  isStorageInExecutableDirectory() {
    return (
      normalizeComparablePath(this.weekboxPath) ===
      normalizeComparablePath(window.NL_PATH)
    );
  }
  isICloudStorage() {
    return window.NL_OS === "Darwin" && isICloudPath(this.basePath);
  }
  async cleanupHiddenModLinks(installedEngines = null) {
    return this.maintenance.cleanupHiddenModLinks(installedEngines);
  }
  async importPsychOnlineEngineMods(installedEngines = null) {
    return this.maintenance.importPsychOnlineEngineMods(installedEngines);
  }
  async cleanupIncompleteDownloads() {
    return this.maintenance.cleanupIncompleteDownloads();
  }
  async clearInstalledLibrary(target) {
    this.assertStorageUnlocked();
    if (!this.isInitialized) throw new Error("WeekBox storage is not ready");
    if (target !== "mods" && target !== "engines")
      throw new Error("Unknown library cleanup target");
    if (!(await this.processes.closeAll()))
      throw new Error("Close running engines before deleting library files.");

    if (target === "mods") {
      const mods = await this.mods.getAll();
      const engines = await this.getInstalledEngines();
      const unlinkResults = await Promise.allSettled(
        mods.map((mod) =>
          this.injection.unlinkFromInstalledEngines(mod, engines),
        ),
      );
      const unlinkFailure = unlinkResults.find(
        (result) => result.status === "rejected",
      );
      if (unlinkFailure) throw unlinkFailure.reason;
      await this.api.remove(this.modsPath);
      await this.api.ensureDir(this.modsPath);
      await this.api.remove(this.covers.coversPath);
      await this.mods.saveAll([]);
    } else {
      await this.api.remove(this.enginesPath);
      await this.api.ensureDir(this.enginesPath);
      while (this.customEngines.getAll().length)
        await this.customEngines.remove(this.customEngines.getAll()[0].id);
    }
    this.activeEngineMods.clear();
    return true;
  }
  async hasModFiles(mod) {
    return this.maintenance.hasModFiles(mod);
  }
  async cleanupInvalidInstalledMods() {
    return this.maintenance.cleanupInvalidInstalledMods();
  }
  async cleanupInvalidEngineInstallations() {
    return this.maintenance.cleanupInvalidEngineInstallations();
  }
  async cleanupEmptyCustomEngineFamilies() {
    const installedVersions = new Set(
      (await this.getInstalledEngines())
        .filter((engine) => engine.custom)
        .map((engine) => `${engine.id}/${engine.version}`),
    );
    for (const engine of [...this.customEngines.getAll()]) {
      const versions = Array.isArray(engine.versions) ? engine.versions : [];
      const validVersions = versions.filter((version) =>
        installedVersions.has(`${engine.id}/${version.version}`),
      );
      if (!validVersions.length) {
        await this.removeCustomEngine(engine.id);
      } else if (validVersions.length !== versions.length) {
        engine.versions = validVersions;
        await this.customEngines.upsert(engine);
      }
    }
  }
  async isEngineInstalled(engineId, version) {
    if (!this.isInitialized) return false;
    const install = this.getEngineInstall(engineId, version);
    if (!install) return false;
    const path = install.path;
    if (!(await this.api.exists(path))) return false;
    return (
      !(await this.api.exists(`${path}/.downloading`)) &&
      Boolean(await this.findExecutable(path))
    );
  }
  async findExecutable(directory) {
    return this.executables.find(directory);
  }
  async findExecutables(directory) {
    return this.executables.findAll(directory);
  }
  getExecutableSearchError() {
    return this.executables.getLastError();
  }
  isCustomEngine(engineId) {
    return Boolean(this.customEngines.get(engineId));
  }
  getCustomEngines() {
    return this.customEngines.getAll();
  }
  getEngineDetails(engineId) {
    const custom = this.customEngines.get(engineId);
    return (
      ENGINE_DETAILS[engineId] ||
      (custom
        ? { ...custom, icon: custom.icon || "exe.png", custom: true }
        : null)
    );
  }
  getAllEngineDetails() {
    const customDetails = Object.fromEntries(
      this.customEngines.getAll().map((engine) => [
        engine.id,
        {
          ...ENGINE_DETAILS[engine.id],
          name: ENGINE_DETAILS[engine.id]?.name || engine.name,
          icon: ENGINE_DETAILS[engine.id]?.icon || engine.icon || "exe.png",
          custom: true,
        },
      ]),
    );
    return {
      ...ENGINE_DETAILS,
      ...customDetails,
    };
  }
  getEngineInstall(engineId, version) {
    const custom = this.customEngines.get(engineId);
    if (custom) {
      const record = custom.versions.find(
        (candidate) => candidate.version === version,
      );
      if (record)
        return {
          ...record,
          id: engineId,
          version: record.version,
          path: `${this.enginesPath}/${engineId}/${record.installId}`,
        };
    }
    if (
      !Object.prototype.hasOwnProperty.call(ENGINE_DETAILS, engineId) ||
      !isValidEngineVersion(version)
    )
      return null;
    return {
      id: engineId,
      version,
      installId: version,
      path: `${this.enginesPath}/${engineId}/${version}`,
    };
  }
  getEnginePath(engineId, version) {
    return this.getEngineInstall(engineId, version)?.path || "";
  }
  getEngineIconSource(engineId) {
    const icon = this.getEngineDetails(engineId)?.icon || "exe.png";
    return /^(?:data|blob|https?):/i.test(icon) ? icon : `assets/icons/${icon}`;
  }
  async inspectCustomEngine(sourcePath) {
    const normalizedSource = trimPath(sourcePath);
    if (!normalizedSource) throw new Error("Choose an engine folder first");
    const stats = await Neutralino.filesystem.getStats(normalizedSource);
    if (!stats?.isDirectory)
      throw new Error("The selected path is not a folder");
    const executables = await this.findExecutables(normalizedSource);
    const executable = executables[0];
    if (!executable) {
      const detail = this.getExecutableSearchError();
      throw new Error(
        detail
          ? `WeekBox could not search the engine folder: ${detail}`
          : "No runnable executable was found in this folder.",
      );
    }
    const sourcePrefix = `${normalizedSource}/`;
    const executableRelative = executable.startsWith(sourcePrefix)
      ? executable.slice(sourcePrefix.length)
      : executable;
    const entries = getRealEntries(
      await Neutralino.filesystem.readDirectory(normalizedSource),
    );
    const excludedContentFolders = new Set(["manifest", "assets", "plugins"]);
    const contentFolders = entries
      .filter(
        (entry) =>
          entry.type === "DIRECTORY" &&
          !excludedContentFolders.has(entry.entry.toLocaleLowerCase()),
      )
      .map((entry) => {
        const name = entry.entry.toLocaleLowerCase();
        return {
          path: entry.entry,
          type: name === "addons" ? "addon" : "mod",
          enabled: name === "mods" || name === "addons",
        };
      });
    return {
      name: normalizedSource.split("/").at(-1) || "Custom Engine",
      version: "Local",
      executable: executableRelative,
      executables: executables.map((path) =>
        path.startsWith(sourcePrefix) ? path.slice(sourcePrefix.length) : path,
      ),
      contentFolders,
    };
  }
  async importCustomEngine({
    sourcePath,
    engineId = null,
    name,
    version = "Local",
    executable,
    contentFolders = [],
    allowLibrarySource = false,
  }) {
    this.assertStorageUnlocked();
    if (!this.isInitialized) throw new Error("WeekBox storage is not ready");
    const source = trimPath(sourcePath);
    if (!source) throw new Error("Choose an engine folder first");
    const isLibraryModSource =
      pathsOverlap(source, this.modsPath) &&
      normalizeComparablePath(source) !==
        normalizeComparablePath(this.modsPath);
    if (
      pathsOverlap(source, this.basePath) &&
      (!allowLibrarySource || !isLibraryModSource)
    )
      throw new Error("Choose an engine folder outside your WeekBox library.");
    const details = await this.inspectCustomEngine(source);
    const normalizedName = String(name || details.name).trim();
    const normalizedVersion = sanitizePathSegment(version) || "Local";
    const resolvedId = engineId || `custom-${crypto.randomUUID()}`;
    const existingEngine = this.customEngines.get(resolvedId);
    const executablePath = `${source}/${String(
      executable || details.executable || "",
    )
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")}`;
    const detectedIcon =
      !existingEngine ||
      !existingEngine.icon ||
      existingEngine.icon === "exe.png"
        ? await this.executables.getIconDataUrl(executablePath)
        : "";
    const engine = existingEngine || {
      id: resolvedId,
      name: normalizedName,
      icon: detectedIcon || "exe.png",
      createdAt: new Date().toISOString(),
      versions: [],
    };
    if (!existingEngine) engine.name = normalizedName || engine.name;
    if (existingEngine && detectedIcon) engine.icon = detectedIcon;
    let existing = engine.versions.find(
      (candidate) => candidate.version === normalizedVersion,
    );
    if (
      existing &&
      !(await this.api.exists(
        `${this.enginesPath}/${resolvedId}/${existing.installId}`,
      ))
    ) {
      engine.versions = engine.versions.filter(
        (candidate) => candidate !== existing,
      );
      await this.customEngines.upsert(engine);
      existing = null;
    }
    if (existing)
      throw new Error(`Version ${normalizedVersion} is already imported.`);
    const install = await copyCustomEngineInstall(this, {
      source,
      resolvedId,
      version: normalizedVersion,
      executable,
      details: { ...details, contentFolders },
    });
    engine.versions.push({ version: normalizedVersion, ...install });
    await this.customEngines.upsert(engine);
    return { id: resolvedId, version: normalizedVersion };
  }
  async updateCustomEngine(engineId, { name, icon } = {}) {
    this.assertStorageUnlocked();
    const engine = this.customEngines.get(engineId);
    if (!engine || ENGINE_DETAILS[engineId])
      throw new Error("Only custom engine families can be edited.");
    const normalizedName = String(name || "").trim();
    if (!normalizedName) throw new Error("Enter an engine family name.");
    engine.name = normalizedName.slice(0, 80);
    if (icon !== undefined) engine.icon = icon || "exe.png";
    await this.customEngines.upsert(engine);
    return engine;
  }
  async removeCustomEngine(engineId) {
    this.assertStorageUnlocked();
    const engine = this.customEngines.get(engineId);
    if (!engine || ENGINE_DETAILS[engineId])
      throw new Error("Only custom engine families can be deleted.");
    if (
      engine.versions.some((version) =>
        this.isEngineRunning(engineId, version.version),
      )
    ) {
      throw new Error("Close the custom engine before deleting its family.");
    }
    const familyPath = `${this.enginesPath}/${engineId}`;
    if (await this.api.exists(familyPath)) await this.api.remove(familyPath);
    await this.customEngines.remove(engineId);
    return true;
  }
  async importCustomEngineMods(engineId, version) {
    this.assertStorageUnlocked();
    if (!this.isInitialized) throw new Error("WeekBox storage is not ready");
    const customEngine = this.customEngines.get(engineId);
    const install = this.getEngineInstall(engineId, version);
    if (!customEngine || !install) throw new Error("Custom engine not found");
    return importCustomEngineContent(this, install, engineId, version);
  }
  async runEngine(engineId, version, onStateChange, args = [], modId = null) {
    const install = this.getEngineInstall(engineId, version);
    if (!install) {
      onStateChange?.("not_found");
      return false;
    }
    const executable = install.executable
      ? `${install.path}/${install.executable}`
      : await this.findExecutable(install.path);
    if (!executable) {
      onStateChange?.("not_found");
      return false;
    }
    const key = `${engineId}:${version}`;
    const launched = await this.processes.launch(
      key,
      executable,
      (state) => {
        if (state === "completed" || state === "error") {
          this.activeEngineMods.delete(key);
          this.importPsychOnlineEngineMods()
            .then(() => this.injectModsIntoEngine(engineId, version))
            .catch(() => {});
        }
        onStateChange?.(state);
      },
      args,
      { modId },
    );
    if (launched) this.activeEngineMods.set(key, modId);
    return launched;
  }
  async closeEngine(engineId, version, onStateChange) {
    return this.processes.close(`${engineId}:${version}`, onStateChange);
  }
  async closeEngineAndWait(engineId, version, onStateChange) {
    const key = `${engineId}:${version}`;
    const closed = await this.processes.closeAndWait(key, onStateChange);
    if (closed) this.activeEngineMods.delete(key);
    return closed;
  }
  isEngineRunning(engineId, version) {
    return this.processes.isRunning(`${engineId}:${version}`);
  }
  async getWineInstallations() {
    return this.processes.getWineInstallations();
  }
  getEngineUpdateKey(engineId, version) {
    return `${engineId}:${version}`;
  }
  isEngineUpdateInProgress(engineId, version) {
    return this.engineUpdates.has(this.getEngineUpdateKey(engineId, version));
  }
  setEngineUpdateInProgress(engineId, version, inProgress) {
    const key = this.getEngineUpdateKey(engineId, version);
    if (inProgress) this.engineUpdates.add(key);
    else this.engineUpdates.delete(key);
    document.dispatchEvent(
      new CustomEvent("weekbox-engine-update-change", {
        detail: { engineId, version, inProgress },
      }),
    );
  }
  getRunningEngineMod(engineId, version) {
    return this.activeEngineMods.get(`${engineId}:${version}`) ?? null;
  }
  getModLaunchState(mod, engine, isStandalone) {
    if (isStandalone) {
      return this.isStandaloneModRunning(mod.id) ? "running" : "launch";
    }
    if (mod?.kind === "dependency" || mod?.kind === "addon") {
      const runningGlobally =
        mod.engineId &&
        [...this.activeEngineMods.entries()].some(([key, runningModId]) => {
          const [engineId, version] = String(key).split(":");
          return (
            runningModId !== null &&
            runningModId !== void 0 &&
            engineId === mod.engineId &&
            (!mod.engineVersion || mod.engineVersion === version)
          );
        });
      return runningGlobally ? "global-running" : "unavailable";
    }
    if (!engine) return "unavailable";
    if (this.isEngineUpdateInProgress(engine.id, engine.version))
      return "updating";
    if (!this.isEngineRunning(engine.id, engine.version)) return "launch";
    const behavior = getEngineLaunchBehavior(engine.id);
    if (behavior.scope !== "exclusive-mod") return "running";
    const runningModId = this.getRunningEngineMod(engine.id, engine.version);
    if (runningModId === null) return "switch";
    return String(runningModId) === String(mod.id) ? "running" : "switch";
  }
  async toggleModLaunch(mod, engine, isStandalone, onStateChange) {
    const state = this.getModLaunchState(mod, engine, isStandalone);
    if (
      !isStandalone &&
      (mod?.kind === "dependency" || mod?.kind === "addon")
    ) {
      throw new Error("Dependencies and addons cannot be launched");
    }
    if (state === "unavailable" && !isStandalone)
      throw new Error("Assigned engine is not installed");
    if (state === "updating" && !isStandalone)
      throw new Error(
        "This engine is updating. Wait for the update to finish before launching a mod.",
      );
    if (isStandalone) {
      return state === "running"
        ? this.closeStandaloneMod(mod.id, onStateChange)
        : this.runStandaloneMod(mod.id, onStateChange);
    }
    const behavior = getEngineLaunchBehavior(engine.id);
    const launch = async () => {
      await this.injectModIntoEngine(mod.id, engine.id, engine.version);
      const args = getEngineModLaunchArgs(
        engine.id,
        getEngineModFolderName(mod),
      );
      return this.runEngine(
        engine.id,
        engine.version,
        onStateChange,
        args,
        behavior.scope === "exclusive-mod" ? mod.id : null,
      );
    };
    if (state === "launch") return launch();
    if (state === "running")
      return this.closeEngine(engine.id, engine.version, onStateChange);
    if (await this.closeEngineAndWait(engine.id, engine.version))
      return launch();
    return false;
  }
  async inspectLocalMod(sourcePath) {
    const normalizedSource = String(sourcePath || "")
      .replace(/\\/g, "/")
      .replace(/\/+$/, "");
    if (!normalizedSource) return {};

    const sourceParts = normalizedSource.split("/");
    const parentFolder = sourceParts.at(-2)?.toLocaleLowerCase();
    const metadata = {
      name: sourceParts.at(-1) || "Local Mod",
      kind: parentFolder === "addons" ? "addon" : "mod",
      engineId: null,
      engineVersion: "",
      coverDataUrl: null,
    };

    for (const relativePath of LOCAL_MOD_COVER_FILES) {
      const coverPath = `${normalizedSource}/${relativePath}`;
      if (!(await this.api.exists(coverPath))) continue;
      try {
        const binary = await this.api.read(coverPath, true);
        if (binary) {
          const value = String(binary);
          metadata.coverDataUrl = value.startsWith("data:")
            ? value
            : `data:${getDataUrlMimeType(coverPath)};base64,${value}`;
        }
      } catch {}
      break;
    }
    return metadata;
  }
  async getInstalledEngines() {
    if (!this.isInitialized) return [];
    try {
      const customInstallIds = new Set(
        this.customEngines
          .getAll()
          .flatMap((engine) =>
            engine.versions.map(
              (version) => `${engine.id}/${version.installId}`,
            ),
          ),
      );
      const entries = await Neutralino.filesystem.readDirectory(
        this.enginesPath,
      );
      const engines = await Promise.all(
        entries
          .filter(
            (entry) =>
              entry.type === "DIRECTORY" &&
              Object.prototype.hasOwnProperty.call(ENGINE_DETAILS, entry.entry),
          )
          .map(async (engine) => {
            const versions = await Neutralino.filesystem.readDirectory(
              `${this.enginesPath}/${engine.entry}`,
            );
            const installedVersions = await Promise.all(
              versions
                .filter(
                  (version) =>
                    version.type === "DIRECTORY" &&
                    isValidEngineVersion(version.entry) &&
                    (engine.entry !== "psychonline" ||
                      version.entry === "Latest") &&
                    !customInstallIds.has(`${engine.entry}/${version.entry}`),
                )
                .map(async (version) => {
                  const versionPath = `${this.enginesPath}/${engine.entry}/${version.entry}`;
                  if (await this.api.exists(`${versionPath}/.downloading`)) {
                    return null;
                  }
                  if (!(await this.findExecutable(versionPath))) return null;
                  return { id: engine.entry, version: version.entry };
                }),
            );
            return installedVersions.filter(Boolean);
          }),
      );
      const installed = engines.flat();
      const customInstalled = [];
      for (const engine of this.customEngines.getAll()) {
        for (const version of engine.versions) {
          const path = `${this.enginesPath}/${engine.id}/${version.installId}`;
          if (await this.api.exists(`${path}/.downloading`)) continue;
          const executable = version.executable
            ? `${path}/${version.executable}`
            : await this.findExecutable(path);
          if (!executable || !(await this.api.exists(executable))) continue;
          customInstalled.push({
            id: engine.id,
            version: version.version,
            installId: version.installId,
            custom: true,
            path,
            originalVersion: version.version,
          });
        }
      }
      return [...installed, ...customInstalled];
    } catch (error) {
      return [];
    }
  }
  async refreshCustomEngineIcons(installedEngines = []) {
    let changed = false;
    for (const engine of this.customEngines.getAll()) {
      if (engine.icon && engine.icon !== "exe.png") continue;
      const install = installedEngines.find(
        (item) => item.custom && item.id === engine.id,
      );
      const version = engine.versions.find(
        (item) => item.version === install?.version,
      );
      const executable = version?.executable
        ? `${install?.path}/${version.executable}`
        : install?.path
          ? await this.findExecutable(install.path)
          : "";
      if (!executable) continue;
      const icon = await this.executables.getIconDataUrl(executable);
      if (!icon) continue;
      engine.icon = icon;
      changed = true;
    }
    if (changed) await this.customEngines.save();
  }
  async injectModIntoEngine(modId, engineId, version) {
    return this.injection.injectOne(modId, engineId, version);
  }
  async injectModsIntoEngine(engineId, version) {
    return this.injection.injectForEngine(engineId, version);
  }
  async injectModIntoInstalledEngines(modId) {
    const engines = (await this.getInstalledEngines()).filter(
      (engine) => !this.isEngineRunning(engine.id, engine.version),
    );
    return this.injection.injectIntoInstalledEngines(modId, engines);
  }
  async cleanupEngineMods(engineId, version) {
    return this.injection.cleanup(engineId, version);
  }
  async getInstalledMods() {
    if (!this.isInitialized) return [];
    const mods = await this.mods.getAll();
    let migrated = false;
    for (const mod of mods) {
      if (mod.kind === "dependency") {
        delete mod.kind;
        delete mod.consumers;
        migrated = true;
      }
      if (Array.isArray(mod.dependencies)) {
        delete mod.dependencies;
        migrated = true;
      }
    }
    if (migrated) await this.mods.saveAll(mods);
    let validFolders = /* @__PURE__ */ new Set();
    try {
      const entries = await Neutralino.filesystem.readDirectory(this.modsPath);
      for (const e of entries) {
        if (e.type === "DIRECTORY") validFolders.add(e.entry);
      }
    } catch (error) {}
    const available = mods.filter((mod) => {
      const folderName = getModFolderName(mod);
      return folderName && validFolders.has(folderName);
    });
    return available;
  }
  async getStandaloneMods() {
    if (!this.isInitialized) return [];
    const standaloneMods = [];
    for (const mod of await this.mods.getAll()) {
      const folderName = getModFolderName(mod);
      if (!folderName) continue;
      const executable = await this.findExecutable(
        `${this.modsPath}/${folderName}`,
      );
      if (!executable) continue;
      standaloneMods.push({
        ...mod,
        engineId: "executable",
        engineVersion: null,
        engineLocked: false,
        kind: "mod",
        exePath: executable,
        icoPath: await this.executables.getIconDataUrl(executable),
      });
    }
    return standaloneMods;
  }
  async runStandaloneMod(modId, onStateChange) {
    const mod = (await this.getStandaloneMods()).find((item) =>
      sameId(item.id, modId),
    );
    if (!mod) {
      onStateChange?.("error");
      return false;
    }
    return this.processes.launch(
      `standalone:${mod.id}`,
      mod.exePath,
      onStateChange,
      [],
      { modId: mod.id },
    );
  }
  async closeStandaloneMod(modId, onStateChange) {
    return this.processes.close(`standalone:${modId}`, onStateChange);
  }
  isStandaloneModRunning(modId) {
    return this.processes.isRunning(`standalone:${modId}`);
  }
  isModRunning(modId) {
    if (this.isStandaloneModRunning(modId)) return true;
    return [...this.activeEngineMods.values()].some(
      (runningModId) =>
        runningModId !== null && String(runningModId) === String(modId),
    );
  }
  isModLockedForChanges(mod, allMods = []) {
    if (!mod) return false;
    if (this.isModRunning(mod.id)) return true;
    const isUsingModEngine = (item) => {
      if (!item?.engineId) return false;
      return this.isModRunning(item.id);
    };
    if (mod.kind === "addon") {
      return (
        [...this.activeEngineMods.entries()].some(([key, runningModId]) => {
          const [engineId, version] = String(key).split(":");
          return (
            runningModId !== null &&
            runningModId !== void 0 &&
            engineId === mod.engineId &&
            (!mod.engineVersion || mod.engineVersion === version)
          );
        }) ||
        allMods.some((item) => {
          if (
            !item ||
            item.kind === "addon" ||
            item.kind === "dependency" ||
            item.engineId !== mod.engineId
          )
            return false;
          if (
            mod.engineVersion &&
            item.engineVersion &&
            mod.engineVersion !== item.engineVersion
          )
            return false;
          return isUsingModEngine(item);
        })
      );
    }
    if (mod.kind !== "dependency") return false;
    const engineProcessUsesDependency = [
      ...this.activeEngineMods.entries(),
    ].some(([key, runningModId]) => {
      const [engineId, version] = String(key).split(":");
      return (
        runningModId !== null &&
        runningModId !== void 0 &&
        engineId === mod.engineId &&
        (!mod.engineVersion || mod.engineVersion === version)
      );
    });
    if (engineProcessUsesDependency) return true;
    return allMods.some((item) => {
      if (!item || item.kind === "dependency" || item.kind === "addon")
        return false;
      const sameEngine =
        item.engineId &&
        mod.engineId === item.engineId &&
        (!mod.engineVersion ||
          !item.engineVersion ||
          mod.engineVersion === item.engineVersion);
      const consumes =
        Array.isArray(item.dependencies) &&
        item.dependencies.some((dependencyId) => sameId(dependencyId, mod.id));
      return (consumes || sameEngine) && isUsingModEngine(item);
    });
  }
  async assertModChangeAllowed(modId) {
    const allMods = await this.mods.getAll();
    const mod = allMods.find((item) => sameId(item.id, modId));
    if (this.isModLockedForChanges(mod, allMods)) {
      throw new Error(
        `Close the engine before changing ${mod?.name || "this mod"}`,
      );
    }
    return mod;
  }
  async saveInstalledMod(modId, modName, metadata = {}) {
    if (!this.isInitialized) return;
    await this.mods.add(modId, modName, metadata);
  }
  async getAvailableLocalModFolderName(name, existingFolderName = "") {
    const displayName = sanitizePathSegment(name) || "Local Mod";
    const baseName = displayName;
    let folderName = baseName;
    let copyNumber = 2;
    while (
      folderName !== existingFolderName &&
      (await this.api.exists(`${this.modsPath}/${folderName}`))
    ) {
      folderName = `${baseName} (${copyNumber++})`;
    }
    return folderName;
  }
  async importLocalMod({
    sourcePath,
    name,
    engineId,
    engineVersion,
    kind = "mod",
    tags = [],
    coverDataUrl,
    coverUrl,
  }) {
    this.assertStorageUnlocked();
    const prepared = await prepareLocalModImport(this, {
      sourcePath,
      name,
      engineId,
      kind,
    });
    const {
      modId,
      modName,
      normalizedSource,
      requestedKind,
      folderName,
      destinationPath,
      engineFolderName,
      engineId: resolvedEngineId,
    } = prepared;
    try {
      await Neutralino.filesystem.copy(normalizedSource, destinationPath, {
        recursive: true,
        overwrite: false,
        skip: false,
      });
      await this.saveInstalledMod(modId, modName, {
        folderName,
        engineFolderName,
        engineId: resolvedEngineId || null,
        engineVersion:
          resolvedEngineId && resolvedEngineId !== "executable"
            ? engineVersion || null
            : null,
        source: "local",
      });
      if (requestedKind !== "mod") {
        await this.setModType(modId, requestedKind);
      }
      await this.setModTags(modId, tags);
      if (coverDataUrl || coverUrl) {
        await this.updateModAppearance(modId, { coverDataUrl, coverUrl });
      }
      const importedMod = (await this.mods.getAll()).find((mod) =>
        sameId(mod.id, modId),
      );
      if (importedMod?.engineId && !importedMod.hidden) {
        await this.injection.injectIntoInstalledEngines(
          importedMod.id,
          await this.getInstalledEngines(),
        );
      }
      return importedMod;
    } catch (error) {
      await this.api.remove(destinationPath).catch(() => {});
      await this.mods.remove(modId).catch(() => {});
      await this.covers.remove(modId).catch(() => {});
      throw error;
    }
  }
  async setModHidden(modId, hidden) {
    if (!this.isInitialized) return null;
    await this.assertModChangeAllowed(modId);
    const mod = await this.mods.setHidden(modId, hidden);
    if (!mod) return null;
    const engines = await this.getInstalledEngines();
    if (mod.hidden) {
      await this.injection.unlinkFromInstalledEngines(mod, engines);
    } else {
      await this.injection.injectIntoInstalledEngines(modId, engines);
    }
    return mod;
  }
  async setModEngineVersion(modId, engineVersion) {
    await this.assertModChangeAllowed(modId);
    const mod = await this.mods.setEngineVersion(modId, engineVersion);
    if (!mod) return null;
    const engines = await this.getInstalledEngines();
    await this.injection.unlinkFromInstalledEngines(mod, engines);
    if (mod.kind !== "dependency" && !mod.hidden && mod.engineId) {
      await this.injection.injectIntoInstalledEngines(modId, engines);
    }
    return mod;
  }
  async setModEngineCompatibility(modId, engineId, engineVersion) {
    if (!this.isInitialized) return null;
    await this.assertModChangeAllowed(modId);
    const currentMod = (await this.mods.getAll()).find((item) =>
      sameId(item.id, modId),
    );
    if (!currentMod) return null;
    if (currentMod.engineLocked && engineId !== "psychonline") {
      throw new Error("This mod is locked to Psych Online");
    }
    const engines = await this.getInstalledEngines();
    await this.injection.unlinkFromInstalledEngines(currentMod, engines);
    const mod = await this.mods.setEngineCompatibility(
      modId,
      engineId,
      engineVersion,
    );
    if (mod?.kind !== "dependency" && mod?.engineId && !mod.hidden) {
      await this.injection.injectIntoInstalledEngines(modId, engines);
    }
    return mod;
  }
  async updateModAppearance(modId, appearance) {
    if (!this.isInitialized) return null;
    const { coverDataUrl, coverUrl, ...metadata } = appearance;
    let coverPath;
    if (coverDataUrl !== void 0) {
      coverPath = coverDataUrl
        ? await this.covers.saveDataUrl(modId, coverDataUrl)
        : null;
    } else if (coverUrl !== void 0) {
      coverPath = coverUrl ? await this.covers.saveUrl(modId, coverUrl) : null;
    }
    return this.mods.updateAppearance(modId, { ...metadata, coverPath });
  }
  async getModCover(modId) {
    if (!this.isInitialized) return null;
    try {
      return await this.covers.read(modId);
    } catch {
      return null;
    }
  }
  async ensureModCover(modId, getDefaultCoverUrl) {
    const localCover = await this.getModCover(modId);
    if (localCover) return localCover;
    const coverUrl = await getDefaultCoverUrl();
    const coverPath = coverUrl
      ? await this.covers.saveUrl(modId, coverUrl)
      : await this.covers.saveNoImagePlaceholder(modId);
    const updatedMod = await this.mods.updateAppearance(modId, { coverPath });
    return updatedMod ? this.getModCover(modId) : null;
  }
  async migrateLegacyModCovers() {
    const mods = await this.mods.getAll();
    let changed = false;
    for (const mod of mods) {
      if (!mod.imageBase64 && !mod.image) continue;
      try {
        if (mod.imageBase64) {
          mod.coverPath = await this.covers.saveDataUrl(
            mod.id,
            mod.imageBase64,
          );
        }
        delete mod.imageBase64;
        delete mod.image;
        changed = true;
      } catch (error) {
        console.warn("Could not migrate a local mod cover", error);
      }
    }
    if (changed) await this.mods.saveAll(mods);
  }
  async addDependencyConsumer(dependencyId, consumerId) {
    if (!this.isInitialized) return null;
    return this.mods.addDependencyConsumer(dependencyId, consumerId);
  }
  async removeDependencyConsumer(dependencyId, consumerId) {
    if (!this.isInitialized) return null;
    return this.mods.removeDependencyConsumer(dependencyId, consumerId);
  }
  async setModTags(modId, tags) {
    if (!this.isInitialized) return null;
    return this.mods.setTags(modId, tags);
  }
  async setModType(modId, type) {
    this.assertStorageUnlocked();
    if (!this.isInitialized) return null;
    await this.assertModChangeAllowed(modId);
    const mods = await this.mods.getAll();
    const mod = mods.find((item) => sameId(item.id, modId));
    if (!mod) return null;
    if (
      type === "addon" &&
      mod.engineId !== "codename" &&
      !this.isCustomEngine(mod.engineId)
    ) {
      throw new Error("Addons are only available for Codename Engine mods");
    }
    if (type === "dependency") return this.moveModToDependencies(modId);
    const engines = await this.getInstalledEngines();
    if (mod.kind === "dependency") {
      const consumers = mods.filter(
        (item) =>
          item.kind !== "dependency" &&
          Array.isArray(item.dependencies) &&
          item.dependencies.some((dependencyId) => sameId(dependencyId, modId)),
      );
      if (consumers.length)
        throw new Error(
          `Remove ${consumers.map((item) => item.name).join(", ")} before changing ${mod.name}`,
        );
    }

    if ((mod.kind || "mod") !== type)
      await this.injection.unlinkFromInstalledEngines(mod, engines);
    const updated = await this.mods.setType(modId, type);
    if (updated?.engineId && !updated.hidden)
      await this.injection.injectIntoInstalledEngines(modId, engines);
    return updated;
  }
  async moveModToDependencies(modId) {
    this.assertStorageUnlocked();
    if (!this.isInitialized) return null;
    await this.assertModChangeAllowed(modId);
    const mod = (await this.mods.getAll()).find((item) =>
      sameId(item.id, modId),
    );
    if (!mod || mod.kind === "dependency") return mod || null;
    const engines = await this.getInstalledEngines();
    await this.injection.unlinkFromInstalledEngines(mod, engines);
    const dependency = await this.mods.moveToDependencies(modId);
    if (dependency?.engineId && !dependency.hidden) {
      await this.injection.injectIntoInstalledEngines(modId, engines);
    }
    return dependency;
  }
  async moveDependencyToMods(modId) {
    this.assertStorageUnlocked();
    if (!this.isInitialized) return null;
    await this.assertModChangeAllowed(modId);
    const mods = await this.mods.getAll();
    const dependency = mods.find((item) => sameId(item.id, modId));
    if (!dependency || dependency.kind !== "dependency")
      return dependency || null;
    const consumers = mods.filter(
      (item) =>
        item.kind !== "dependency" &&
        Array.isArray(item.dependencies) &&
        item.dependencies.some((dependencyId) => sameId(dependencyId, modId)),
    );
    if (consumers.length) {
      throw new Error(
        `Remove ${consumers.map((item) => item.name).join(", ")} before moving ${dependency.name}`,
      );
    }
    const mod = await this.mods.moveToMods(modId);
    if (mod?.engineId && !mod.hidden) {
      await this.injection.injectIntoInstalledEngines(
        modId,
        await this.getInstalledEngines(),
      );
    }
    return mod;
  }
  async removeInstalledMod(modId) {
    this.assertStorageUnlocked();
    if (!this.isInitialized) return false;
    const storedMods = await this.mods.getAll();
    const allMods = Array.isArray(storedMods) ? storedMods : [];
    const mod = allMods.find((item) => sameId(item.id, modId));
    if (!mod) return false;
    if (this.isModLockedForChanges(mod, allMods)) {
      throw new Error(`Close the engine before deleting ${mod.name}`);
    }
    const unlinkResults = await this.injection.unlinkFromInstalledEngines(
      mod,
      await this.getInstalledEngines(),
    );
    const unlinkFailure = unlinkResults.find(
      (result) => result.status === "rejected",
    );
    if (unlinkFailure) throw unlinkFailure.reason;
    await removeModFiles(this, mod, getModFolderName(mod));
    await this.mods.remove(modId);
    await this.covers.remove(modId).catch(() => {});
    if (Array.isArray(mod.dependencies)) {
      await Promise.all(
        mod.dependencies.map((dependencyId) =>
          this.removeDependencyConsumer(dependencyId, modId),
        ),
      );
    }
    return true;
  }
  async isModInstalled(modId) {
    return (await this.getInstalledModCount(modId)) > 0;
  }
  async getInstalledModCount(modId) {
    if (!this.isInitialized) return 0;
    const sourceId = String(modId);
    const mods = (await this.mods.getAll()).filter((item) => {
      const id = String(item.id);
      return id === sourceId || id.startsWith(`${sourceId}--`);
    });
    const installed = await Promise.all(
      mods.map(async (mod) => ((await this.hasModFiles(mod)) ? 1 : 0)),
    );
    return installed.reduce((count, value) => count + value, 0);
  }
  /**
   * @fix 2026-08-05T03:31:10.964Z - Fix NE_FS_MOVEERR during mod folder flattening
   */
  async flattenModFolder(targetDir) {
    if (!this.isInitialized) return;
    try {
      const entries = getRealEntries(
        await Neutralino.filesystem.readDirectory(targetDir),
      );
      if (entries.length !== 1 || entries[0].type !== "DIRECTORY") return;
      const sourceDir = `${targetDir}/${entries[0].entry}`;
      const nestedEntries = getRealEntries(
        await Neutralino.filesystem.readDirectory(sourceDir),
      );
      for (const entry of nestedEntries) {
        await this.api.move(
          `${sourceDir}/${entry.entry}`,
          `${targetDir}/${entry.entry}`,
        );
      }
      await this.api.remove(sourceDir);
    } catch (error) {}
  }
};

var FileSystemService = _FileSystemService;
var FS = new FileSystemService();

export { FS };
