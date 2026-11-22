import { APIneuFileSystem } from "./api-neu-file-system.service.js";
import { ExecutableService } from "./executable.service.js";
import { LibraryMaintenanceService } from "./library-maintenance.service.js";
import { ModCoverService } from "./mod-cover.service.js";
import { ModKindService } from "./mod-kind.service.js";
import { ModInjectionService } from "./mod-injection.service.js";
import { ModRepository } from "./mod-repository.service.js";
import { StandaloneModCatalogService } from "./standalone-mod-catalog.service.js";
import { CustomEngineService } from "./custom-engine.service.js";
import { CustomEngineRepository } from "./custom-engine-repository.service.js";
import { ProcessService } from "../processes/process.service.js";
import { appSettings } from "../../core/system/settings.service.js";
import {
  getParentPath,
  trimPath,
  sanitizePathSegment,
  getRealEntries,
  getModFolderName,
  getEngineModFolderName,
  pathsOverlap,
  normalizeComparablePath,
} from "./path.util.js";
import { isValidEngineVersion } from "./engine-version.service.js";
import {
  getEngineLaunchBehavior,
  getEngineModLaunchArgs,
  ENGINE_DETAILS,
} from "../../config/engines.config.js";
import { getPreferredEngineVersion } from "../../config/engine-preferences.js";
import {
  allSettledWithConcurrency,
  mapWithConcurrency,
} from "../../utils/async-concurrency.util.mjs";
import { discoverInstalledEngines } from "./engine-discovery.util.mjs";
import { STORAGE_LAYOUT_VERSION, getStoragePaths } from "./storage-paths.js";
import {
  cleanupAtomicWriteTemps,
  hasStorageIdentity,
  isEmptyStorageScaffold,
  migrateStorageMetadata,
  moveStorageTo,
  readStorageMoveMarker,
} from "./storage-transfer.service.js";
import { sameId } from "./identity.util.js";

const STORAGE_FOLDER_NAME = "WeekBoxLibrary";
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

function getProviderPersistenceMetadata(metadata) {
  return {
    gameBananaId: metadata.gameBananaId || null,
    gameBananaType: metadata.gameBananaType || null,
    providerSource: metadata.providerSource || null,
    providerId: metadata.providerId || null,
    providerType: metadata.providerType || null,
    providerUrl: metadata.providerUrl || null,
    sourceUrl: metadata.sourceUrl || null,
    author: metadata.author || null,
  };
}

function isOneDrivePath(path) {
  return /(?:^|[\\/])OneDrive(?:[\\/]|$)/i.test(String(path));
}

function isICloudPath(path) {
  return /(?:^|\/)Library\/Mobile Documents\/com~apple~CloudDocs(?:\/|$)/i.test(
    String(path),
  );
}

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
  await service.api.remove(modPath);
  if (await service.api.exists(modPath))
    throw new Error(`Could not remove mod files for ${mod.name}.`);
}

var _FileSystemService = class _FileSystemService {
  constructor() {
    this.basePath = "";
    this.weekboxPath = "";
    this.paths = getStoragePaths("");
    this.configPath = "";
    this.statePath = "";
    this.runtimePath = "";
    this.enginesPath = "";
    this.modsPath = "";
    this.dataPath = "";
    this.isInitialized = false;
    this.initPromise = null;
    this.startupMaintenancePromise = null;
    this.isStorageMoveInProgress = false;
    this.pendingStorageMove = null;
    this.storageMoveCancelled = false;
    this.activeDownload = null;
    this.abortController = null;
    this.isPaused = false;
    this.api = APIneuFileSystem;
    this.executables = new ExecutableService();
    this.processes = new ProcessService(this.executables);
    this.customEngines = new CustomEngineRepository({
      api: this.api,
      getStoragePaths: () => this.paths,
    });
    this.activeEngineProcesses = this.processes.activeProcesses;
    this.activeEngineMods = new Map();
    this.engineUpdates = new Set();
    document.addEventListener("weekbox-process-exit", (event) => {
      this.activeEngineMods.delete(event.detail.key);
    });
    this.mods = new ModRepository({
      api: this.api,
      getStoragePaths: () => this.paths,
      readDirectory: (path) => Neutralino.filesystem.readDirectory(path),
    });
    this.standaloneMods = new StandaloneModCatalogService({
      mods: this.mods,
      getModsPath: () => this.modsPath,
      findExecutable: (path) => this.findExecutable(path),
      getModIcon: (modId) => this.getModIcon(modId),
      getIconDataUrl: (path) => this.executables.getIconDataUrl(path),
    });
    this.covers = new ModCoverService({
      api: this.api,
      getStoragePaths: () => this.paths,
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
    this.modKinds = new ModKindService({
      mods: this.mods,
      injection: this.injection,
      getIsInitialized: () => this.isInitialized,
      assertStorageUnlocked: () => this.assertStorageUnlocked(),
      assertModChangeAllowed: (modId) => this.assertModChangeAllowed(modId),
      isCustomEngine: (engineId) => this.isCustomEngine(engineId),
      getInstalledEngines: () => this.getInstalledEngines(),
    });
    this.customEngineService = new CustomEngineService({
      api: this.api,
      executables: this.executables,
      customEngines: this.customEngines,
      mods: this.mods,
      injection: this.injection,
      getBasePath: () => this.basePath,
      getEnginesPath: () => this.enginesPath,
      getModsPath: () => this.modsPath,
      isInitialized: () => this.isInitialized,
      assertStorageUnlocked: () => this.assertStorageUnlocked(),
      readDirectory: (path) => Neutralino.filesystem.readDirectory(path),
      findExecutable: (path) => this.findExecutable(path),
      getAvailableLocalModFolderName: (name) =>
        this.getAvailableLocalModFolderName(name),
      saveInstalledMod: (id, name, metadata) =>
        this.saveInstalledMod(id, name, metadata),
      getInstalledEngines: () => this.getInstalledEngines(),
      getEngineInstall: (id, version) => this.getEngineInstall(id, version),
      isEngineRunning: (id, version) => this.isEngineRunning(id, version),
      removeModFiles: (mod, folderName) =>
        removeModFiles(this, mod, folderName),
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
      this.pendingStorageMove = await readStorageMoveMarker(this);
      await this.ensureStorageDirectories();
      await cleanupAtomicWriteTemps(this);
      const metadataMigrationComplete = await this.migrateStorageMetadata();
      await this.ensureStorageManifest({
        allowUpgrade: metadataMigrationComplete,
      });
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
      (
        await Promise.all(requiredPaths.map((item) => this.api.exists(item)))
      ).every(Boolean) && (await hasStorageIdentity(this, root))
    );
  }
  getStorageDestinationPath(path) {
    const selectedPath = trimPath(path);
    if (!selectedPath) return "";
    if (/(?:^|[\\/])WeekBoxLibrary$/i.test(selectedPath)) {
      return selectedPath;
    }
    return `${selectedPath}/${STORAGE_FOLDER_NAME}`;
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
  async writeStorageManifest(
    root,
    { force = false, allowUpgrade = true } = {},
  ) {
    const manifestPath = getStoragePaths(root).storageManifestFile;
    let manifestVersion = null;
    if (await this.api.exists(manifestPath)) {
      try {
        const manifest = JSON.parse(await this.api.read(manifestPath));
        manifestVersion = Number(manifest?.version) || 0;
        if (!force && manifestVersion === STORAGE_LAYOUT_VERSION) return;
      } catch {}
    }
    if (!allowUpgrade && manifestVersion < STORAGE_LAYOUT_VERSION) return;
    await this.api.writeAtomic(
      manifestPath,
      `${JSON.stringify({ version: STORAGE_LAYOUT_VERSION }, null, 2)}\n`,
    );
  }

  async migrateStorageMetadata() {
    return migrateStorageMetadata(this);
  }

  async ensureStorageManifest() {
    await this.writeStorageManifest(this.basePath);
  }
  async selectSettingsPath(storagePath) {
    const root = trimPath(storagePath);
    const paths = getStoragePaths(root);
    let loaded = await appSettings.load(paths.configPath);
    if (!loaded) {
      for (const legacyPath of [paths.dataPath, root]) {
        if (await appSettings.load(legacyPath)) {
          loaded = true;
          break;
        }
      }
    }
    appSettings.set("storagePath", root, { persist: false });
    await appSettings.setDataPath(paths.configPath);
    await appSettings.write();
    await Promise.all(
      [paths.legacySettingsFile, paths.legacyDataSettingsFile]
        .filter(
          (path) =>
            normalizeComparablePath(path) !==
            normalizeComparablePath(paths.settingsFile),
        )
        .map((path) => this.api.remove(path)),
    );
  }
  async ensureStorageDirectoriesAt(root) {
    await this.api.ensureDir(root);
    await Promise.all(
      ["config", "data", "state", "runtime", "engines", "mods"].map(
        (directory) => this.api.ensureDir(`${root}/${directory}`),
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
    this.paths = getStoragePaths(this.basePath);
    this.configPath = this.paths.configPath;
    this.statePath = this.paths.statePath;
    this.runtimePath = this.paths.runtimePath;
    this.enginesPath = this.paths.enginesPath;
    this.modsPath = this.paths.modsPath;
    this.dataPath = this.paths.dataPath;
  }
  async ensureStorageDirectories() {
    await this.api.ensureDir(this.basePath);
    if (!(await this.api.exists(this.basePath))) {
      throw new Error("Selected storage folder is unavailable");
    }
    await this.ensureStorageDirectoriesAt(this.basePath);
  }
  hasRunningProcesses() {
    return this.activeEngineProcesses.size > 0;
  }
  assertStorageUnlocked({ allowPending = false } = {}) {
    if (
      this.isStorageMoveInProgress ||
      (this.pendingStorageMove && !allowPending)
    ) {
      throw new Error("Wait for WeekBox files to finish moving first");
    }
  }
  getPendingStorageMove() {
    return this.pendingStorageMove;
  }
  async cancelStorageMove() {
    if (!this.isStorageMoveInProgress) return false;
    this.storageMoveCancelled = true;
    return true;
  }
  async findExistingStorage(basePath) {
    const selectedPath = trimPath(basePath);
    if (!selectedPath) return null;
    const candidates = [
      selectedPath,
      this.getStorageDestinationPath(selectedPath),
      `${selectedPath}/WeekBox`,
    ].filter(
      (candidate, index, paths) =>
        paths.findIndex(
          (path) =>
            normalizeComparablePath(path) ===
            normalizeComparablePath(candidate),
        ) === index,
    );
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
    const destinationPath = this.getStorageDestinationPath(basePath);
    if (!destinationPath || !(await this.api.exists(destinationPath))) {
      return false;
    }
    let entries;
    try {
      entries = await Neutralino.filesystem.readDirectory(destinationPath);
    } catch (error) {
      throw new Error(
        `Could not inspect storage folder ${destinationPath}: ${error?.message || error}`,
        { cause: error },
      );
    }
    const realEntries = getRealEntries(entries);
    if (await this.isCompleteStorage(destinationPath)) return true;
    return !(await isEmptyStorageScaffold(destinationPath, realEntries));
  }

  async removeExistingStorage(basePath) {
    this.assertStorageUnlocked();
    if (this.hasRunningProcesses()) {
      throw new Error("Close running engines before replacing WeekBox storage");
    }
    const storage = await this.findExistingStorage(basePath);
    if (!storage) {
      throw new Error(
        "The selected folder does not contain a complete WeekBox library.",
      );
    }
    if (pathsOverlap(storage.basePath, this.basePath)) {
      throw new Error(
        "Choose a storage folder outside the current storage folder.",
      );
    }
    await this.assertStoragePathAllowed(storage.basePath);
    await this.api.remove(storage.basePath);
    if (await this.api.exists(storage.basePath)) {
      throw new Error("Could not remove the existing WeekBox library.");
    }
    return storage.basePath;
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
    await cleanupAtomicWriteTemps(this);
    const metadataMigrationComplete = await this.migrateStorageMetadata();
    await this.ensureStorageManifest({
      allowUpgrade: metadataMigrationComplete,
    });
    await this.selectSettingsPath(storage.basePath);
    await this.customEngines.load();
    return this.weekboxPath;
  }
  async moveStorageTo(
    basePath,
    onProgress = () => {},
    { destinationIsResolved = false } = {},
  ) {
    return moveStorageTo(this, basePath, onProgress, { destinationIsResolved });
  }
  async shouldRecommendDefaultStorage() {
    if (this.pendingStorageMove) return false;
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
    if (target !== "mods" && target !== "engines" && target !== "all")
      throw new Error("Unknown library cleanup target");
    if (!(await this.processes.closeAll()))
      throw new Error("Close running engines before deleting library files.");

    if (target === "mods" || target === "all") {
      const mods = await this.mods.getAll();
      const engines = await this.getInstalledEngines();
      const unlinkResults = await allSettledWithConcurrency(mods, 3, (mod) =>
        this.injection.unlinkFromInstalledEngines(mod, engines),
      );
      const unlinkFailure = unlinkResults.find(
        (result) => result.status === "rejected",
      );
      if (unlinkFailure) throw unlinkFailure.reason;
      await this.api.remove(this.modsPath);
      await this.api.ensureDir(this.modsPath);
      await this.api.remove(this.covers.coversPath);
      await this.mods.saveAll([]);
    }
    if (target === "engines" || target === "all") {
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
    for (const engine of this.customEngines.getAll()) {
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
    return this.customEngineService.inspect(sourcePath);
  }
  async importCustomEngine(options) {
    return this.customEngineService.import(options);
  }
  async updateCustomEngine(engineId, options) {
    return this.customEngineService.update(engineId, options);
  }
  async removeCustomEngine(engineId) {
    return this.customEngineService.remove(engineId);
  }
  async importCustomEngineMods(engineId, version) {
    return this.customEngineService.importMods(engineId, version);
  }
  async runEngine(
    engineId,
    version,
    onStateChange,
    args = [],
    modId = null,
    playedModId = null,
  ) {
    this.assertStorageUnlocked();
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
        if (state === "launched" && playedModId) {
          this.markModPlayed(playedModId);
        }
        if (state === "completed" || state === "error") {
          this.activeEngineMods.delete(key);
          this.importPsychOnlineEngineMods()
            .then(() => this.injectModsIntoEngine(engineId, version))
            .catch(() => {});
        }
        onStateChange?.(state);
      },
      args,
      { modId, recentlyPlayedModId: playedModId },
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
        mod.id,
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
    return discoverInstalledEngines({
      enginesPath: this.enginesPath,
      engineDetails: ENGINE_DETAILS,
      customEngines: this.customEngines.getAll(),
      readDirectory: (path) => Neutralino.filesystem.readDirectory(path),
      exists: (path) => this.api.exists(path),
      findExecutable: (path) => this.findExecutable(path),
      isValidEngineVersion,
    });
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
    return this.mods.getInstalled(this.modsPath);
  }
  async getStandaloneMods({ includeIcons = true, mods: installedMods } = {}) {
    if (!this.isInitialized) return [];
    return this.standaloneMods.getMods({
      includeIcons,
      mods: installedMods,
    });
  }
  async runStandaloneMod(modId, onStateChange) {
    this.assertStorageUnlocked();
    const mod = (await this.getStandaloneMods({ includeIcons: false })).find(
      (item) => sameId(item.id, modId),
    );
    if (!mod) {
      onStateChange?.("error");
      return false;
    }
    return this.processes.launch(
      `standalone:${mod.id}`,
      mod.exePath,
      (state) => {
        if (state === "launched") this.markModPlayed(mod.id);
        onStateChange?.(state);
      },
      [],
      { modId: mod.id },
    );
  }
  async markModPlayed(modId) {
    await this.mods.setLastPlayed(modId).catch(() => {});
    document.dispatchEvent(new CustomEvent("recently-played-mods-updated"));
  }
  async getRecentlyPlayedMods(limit = 8) {
    return (await this.getInstalledMods())
      .filter(
        (mod) =>
          !mod.hidden &&
          !["dependency", "addon"].includes(mod.kind) &&
          Number(mod.lastPlayedAt) > 0,
      )
      .sort(
        (left, right) => Number(right.lastPlayedAt) - Number(left.lastPlayedAt),
      )
      .slice(0, limit);
  }
  async launchRecentlyPlayedMod(modId, onStateChange) {
    const mod = (await this.getInstalledMods()).find((item) =>
      sameId(item.id, modId),
    );
    if (!mod) {
      onStateChange?.("not_found");
      return false;
    }
    if (mod.engineId === "executable") {
      return this.toggleModLaunch(mod, null, true, onStateChange);
    }
    const installedEngines = await this.getInstalledEngines();
    const versions = installedEngines
      .filter((engine) => engine.id === mod.engineId)
      .map((engine) => engine.version);
    const version =
      mod.engineVersion || getPreferredEngineVersion(mod.engineId, versions);
    const engine = installedEngines.find(
      (item) => item.id === mod.engineId && item.version === version,
    );
    if (!engine) {
      onStateChange?.("not_found");
      return false;
    }
    return this.toggleModLaunch(mod, engine, false, onStateChange);
  }
  async closeStandaloneMod(modId, onStateChange) {
    return this.processes.close(`standalone:${modId}`, onStateChange);
  }
  isStandaloneModRunning(modId) {
    return this.processes.isRunning(`standalone:${modId}`);
  }
  isModRunning(modId) {
    if (this.isStandaloneModRunning(modId)) return true;
    if (
      [...this.activeEngineProcesses.values()].some((process) =>
        sameId(process.metadata?.recentlyPlayedModId, modId),
      )
    ) {
      return true;
    }
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
    if (metadata.folderName) {
      this.executables.invalidate(`${this.modsPath}/${metadata.folderName}`);
    }
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
    gameBananaId,
    gameBananaType,
    providerSource,
    providerId,
    providerType,
    providerUrl,
    sourceUrl,
    author,
    iconUrl,
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
        ...getProviderPersistenceMetadata({
          gameBananaId,
          gameBananaType,
          providerSource,
          providerId,
          providerType,
          providerUrl,
          sourceUrl,
          author,
        }),
      });
      if (iconUrl) await this.cacheModIcon(modId, iconUrl).catch(() => null);
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
      await this.covers.removeIcon(modId).catch(() => {});
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
    const { coverDataUrl, coverUrl, iconDataUrl, iconUrl, ...metadata } =
      appearance;
    let coverPath;
    let iconPath;
    if (coverDataUrl !== void 0) {
      coverPath = coverDataUrl
        ? await this.covers.saveDataUrl(modId, coverDataUrl)
        : null;
    } else if (coverUrl !== void 0) {
      coverPath = coverUrl ? await this.covers.saveUrl(modId, coverUrl) : null;
    }
    if (iconDataUrl !== void 0) {
      if (iconDataUrl) {
        iconPath = await this.covers.saveIconDataUrl(modId, iconDataUrl);
      } else {
        await this.covers.removeIcon(modId);
        iconPath = null;
      }
    } else if (iconUrl) {
      iconPath = await this.covers
        .saveIconUrl(modId, iconUrl)
        .catch(() => null);
    }
    return this.mods.updateAppearance(modId, {
      ...metadata,
      coverPath,
      iconPath,
    });
  }
  async getModCover(modId) {
    if (!this.isInitialized) return null;
    try {
      return await this.covers.read(modId);
    } catch {
      return null;
    }
  }
  async getModIcon(modId) {
    if (!this.isInitialized) return null;
    try {
      return await this.covers.readIcon(modId);
    } catch {
      return null;
    }
  }
  async cacheModIcon(modId, iconUrl) {
    if (!this.isInitialized || !iconUrl) return null;
    const iconPath = await this.covers.saveIconUrl(modId, iconUrl);
    await this.mods.updateAppearance(modId, { iconPath });
    return this.getModIcon(modId);
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
    return this.modKinds.setModType(modId, type);
  }
  async moveModToDependencies(modId) {
    return this.modKinds.moveModToDependencies(modId);
  }
  async moveDependencyToMods(modId) {
    return this.modKinds.moveDependencyToMods(modId);
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
    this.executables.invalidate(`${this.modsPath}/${getModFolderName(mod)}`);
    await this.mods.remove(modId);
    await this.covers.remove(modId).catch(() => {});
    await this.covers.removeIcon(modId).catch(() => {});
    if (Array.isArray(mod.dependencies)) {
      await mapWithConcurrency(mod.dependencies, 4, (dependencyId) =>
        this.removeDependencyConsumer(dependencyId, modId),
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
    const installed = await mapWithConcurrency(mods, 4, async (mod) =>
      (await this.hasModFiles(mod)) ? 1 : 0,
    );
    return installed.reduce((count, value) => count + value, 0);
  }
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
    } catch {}
  }
};

var FileSystemService = _FileSystemService;
var FS = new FileSystemService();

export { FS };
