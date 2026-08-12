import { APIneuFileSystem } from "./filesystem/api-neu-file-system.service.js";
import { ExecutableService } from "./filesystem/executable.service.js";
import { LibraryMaintenanceService } from "./filesystem/library-maintenance.service.js";
import { ModCoverService } from "./filesystem/mod-cover.service.js";
import { ModInjectionService } from "./filesystem/mod-injection.service.js";
import { ModRepository } from "./filesystem/mod-repository.service.js";
import { ProcessService } from "./processes/process.service.js";
import { appSettings } from "../core/system/settings.service.js";
import {
  getParentPath,
  sanitizePathSegment,
  getRealEntries,
  getModFolderName,
  getEngineModFolderName,
  getDistinctStoragePath,
  STORAGE_DIRECTORY_NAME,
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

function isLibraryFolder(path) {
  const value = normalizeComparablePath(path);
  const name = STORAGE_DIRECTORY_NAME.toLocaleLowerCase();
  return value === name || value.endsWith(`/${name}`);
}

function trimPath(path) {
  return String(path || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
}

function storageBackupPath(path) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");
  return `${trimPath(path)}-backup-${timestamp}`;
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

var RETIRED_ENGINE_IDS = /* @__PURE__ */ new Set(["alepsych"]);
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
    this.storageMigrationFallback = null;
    this.activeDownload = null;
    this.abortController = null;
    this.isPaused = false;
    this.api = APIneuFileSystem;
    this.executables = new ExecutableService();
    this.processes = new ProcessService(this.executables);
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
      const legacyParentPath = appSettings.getLegacy("storageParentPath");
      const savedLegacyPath = savedPath && isWeekBoxFolder(savedPath)
        ? savedPath
        : null;
      let storagePath = savedPath && (await this.isCompleteStorage(savedPath))
        ? trimPath(savedPath)
        : null;

      if (!storagePath) {
        const legacyPath = await this.findLegacyStorage(
          savedLegacyPath || legacyParentPath,
          defaultStoragePath,
        );
        if (legacyPath) {
          try {
            storagePath = await this.migrateStorage(
              legacyPath,
              defaultStoragePath,
            );
          } catch (error) {
            if (!(await this.isCompleteStorage(legacyPath))) throw error;
            this.storageMigrationFallback = {
              sourcePath: legacyPath,
              targetPath: defaultStoragePath,
              reportPath: error.storageMigration?.reportPath || null,
              error: `WeekBox storage migration paused: ${error.message || String(error)}`,
            };
            console.warn(
              "WeekBox storage migration paused; keeping the original library:",
              error,
            );
            storagePath = trimPath(legacyPath);
          }
        }
      }

      storagePath ||= defaultStoragePath;
      this.setStoragePaths(storagePath);
      await this.ensureStorageDirectories();
      await this.ensureStorageManifest();
      await this.selectSettingsPath(storagePath);
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
      await runPhase(
        "Checking for retired engines\u2026",
        90,
        (reportProgress) => this.removeRetiredEngines(reportProgress),
      );
      await runPhase("Cleaning incomplete downloads\u2026", 91, () =>
        this.cleanupIncompleteDownloads(),
      );
      await runPhase("Checking installed engines\u2026", 92, () =>
        this.cleanupInvalidEngineInstallations(),
      );
      await runPhase("Checking installed mods\u2026", 94, () =>
        this.cleanupInvalidInstalledMods(),
      );
      await runPhase("Updating mod artwork\u2026", 96, () =>
        this.migrateLegacyModCovers(),
      );
      let installedEngines = [];
      await runPhase("Scanning engine versions\u2026", 97, async () => {
        installedEngines = await this.getInstalledEngines();
      });
      await runPhase("Updating engine mod folders\u2026", 98, async () => {
        await this.injection.migrateLegacyEngineModsFor(installedEngines);
      });
      await runPhase("Importing Psych Online mods\u2026", 99, () =>
        this.importPsychOnlineEngineMods(installedEngines),
      );
      await runPhase("Cleaning stale mod links\u2026", 99, () =>
        this.cleanupHiddenModLinks(installedEngines),
      );
    })();
    return this.startupMaintenancePromise;
  }
  async removeRetiredEngines(reportProgress) {
    const mods = await this.mods.getAll();
    const retiredEnginePath = `${this.enginesPath}/alepsych`;
    const hasRetiredEngine = await this.api.exists(retiredEnginePath);
    const hasAssignedMods = mods.some((mod) =>
      RETIRED_ENGINE_IDS.has(mod.engineId),
    );
    if (hasRetiredEngine || hasAssignedMods) {
      reportProgress?.(
        "Removing a retired engine and updating its mods\u2026",
        90,
      );
    }
    let changed = false;
    for (const mod of mods) {
      if (!RETIRED_ENGINE_IDS.has(mod.engineId)) continue;
      mod.engineId = null;
      mod.engineVersion = null;
      changed = true;
    }
    if (changed) await this.mods.saveAll(mods);
    await Promise.all(
      [...RETIRED_ENGINE_IDS].map((engineId) =>
        this.api.remove(`${this.enginesPath}/${engineId}`),
      ),
    );
  }
  async getDefaultStoragePath() {
    if (window.NL_OS === "Windows") {
      const localAppDataPath = await Neutralino.os
        .getEnv("LOCALAPPDATA")
        .catch(() => "");
      if (localAppDataPath) {
        return getDistinctStoragePath(localAppDataPath, window.NL_PATH);
      }
    }
    const documentsPath = await Neutralino.os
      .getPath("documents")
      .catch(() => "");
    if (window.NL_OS === "Darwin" && isICloudPath(documentsPath)) {
      const homePath = await Neutralino.os.getEnv("HOME").catch(() => "");
      if (homePath) {
        return getDistinctStoragePath(homePath, window.NL_PATH);
      }
    }
    if (documentsPath) {
      return getDistinctStoragePath(documentsPath, window.NL_PATH);
    }
    const fallbackKey = window.NL_OS === "Windows" ? "USERPROFILE" : "HOME";
    const fallbackPath = await Neutralino.os
      .getEnv(fallbackKey)
      .catch(() => "");
    if (fallbackPath) {
      return getDistinctStoragePath(fallbackPath, window.NL_PATH);
    }
    throw new Error("WeekBox could not find a writable storage location");
  }
  async getLegacyExecutableStorageBasePath() {
    if (!window.NL_PATH || !isWeekBoxFolder(window.NL_PATH)) return null;
    const requiredDirectories = ["data", "engines", "mods"];
    const complete = await Promise.all(
      requiredDirectories.map((directory) =>
        this.api.exists(`${window.NL_PATH}/${directory}`),
      ),
    );
    if (!complete.every(Boolean)) return null;
    return trimPath(window.NL_PATH);
  }
  async isCompleteStorage(path) {
    const root = trimPath(path);
    if (!root) return false;
    const requiredPaths = ["data", "engines", "mods"].map(
      (directory) => `${root}/${directory}`,
    );
    return (await Promise.all(requiredPaths.map((item) => this.api.exists(item)))).every(
      Boolean,
    );
  }
  async findLegacyStorage(preferredPath, defaultPath) {
    const candidates = [];
    const add = (path) => {
      const value = trimPath(path);
      if (value && !candidates.some((item) => normalizeComparablePath(item) === normalizeComparablePath(value))) {
        candidates.push(value);
      }
    };
    const preferred = trimPath(preferredPath);
    if (preferred) {
      add(isWeekBoxFolder(preferred) ? preferred : `${preferred}/WeekBox`);
    }
    add(defaultPath);
    const executableStorage = await this.getLegacyExecutableStorageBasePath();
    add(executableStorage);
    const documentsPath = await Neutralino.os.getPath("documents").catch(() => "");
    const localAppDataPath = window.NL_OS === "Windows"
      ? await Neutralino.os.getEnv("LOCALAPPDATA").catch(() => "")
      : "";
    for (const root of [localAppDataPath, documentsPath]) {
      if (!root) continue;
      add(`${root}/WeekBoxData/WeekBox`);
      add(`${root}/WeekBox`);
    }
    for (const candidate of candidates) {
      if (await this.isCompleteStorage(candidate)) return candidate;
    }
    return null;
  }
  getStorageDestinationPath(path) {
    const selectedPath = trimPath(path);
    if (!selectedPath) return "";
    if (isLibraryFolder(selectedPath)) return selectedPath;
    if (isWeekBoxFolder(selectedPath)) {
      throw new Error(
        "Choose a folder for the new WeekBoxLibrary, not the old WeekBox folder.",
      );
    }
    return `${selectedPath}/${STORAGE_DIRECTORY_NAME}`;
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
        const copiedStats = await Neutralino.filesystem.getStats(
          destinationPath,
        );
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
  async writeStorageManifest(root, legacySource = null, { force = false } = {}) {
    const manifestPath = `${root}/storage-manifest.json`;
    if (await this.api.exists(manifestPath)) {
      try {
        const manifest = JSON.parse(await this.api.read(manifestPath));
        if (!force && manifest?.version === 1 && manifest.root === STORAGE_DIRECTORY_NAME) return;
      } catch {}
    }
    await this.api.write(
      manifestPath,
      `${JSON.stringify({
        version: 1,
        root: STORAGE_DIRECTORY_NAME,
        migratedFrom: legacySource
          ? { path: legacySource, keptAsBackup: true, at: new Date().toISOString() }
          : null,
      }, null, 2)}\n`,
    );
  }
  async ensureStorageManifest() {
    await this.writeStorageManifest(this.basePath);
  }
  async selectSettingsPath(storagePath) {
    const root = trimPath(storagePath);
    const settingsPath = `${root}/settings.json`;
    if (normalizeComparablePath(appSettings.path) !== normalizeComparablePath(settingsPath)) {
      await appSettings.load(root);
    }
    appSettings.set("storagePath", root, { persist: false });
    delete appSettings.document.settings.storageParentPath;
    await appSettings.setDataPath(root);
    await appSettings.write();
  }
  async migrateStorage(sourcePath, targetPath) {
    const source = trimPath(sourcePath);
    const target = trimPath(targetPath);
    if (!source || !target) throw new Error("WeekBox storage path is missing");
    if (normalizeComparablePath(source) === normalizeComparablePath(target)) return target;
    if (await this.isCompleteStorage(target)) {
      let backupPath = source;
      const canMoveSource = normalizeComparablePath(source) !== normalizeComparablePath(window.NL_PATH);
      if (canMoveSource) {
        const candidate = storageBackupPath(source);
        await this.api.move(source, candidate).then(() => {
          backupPath = candidate;
        }).catch(() => {});
      }
      await this.writeStorageManifest(target, backupPath, { force: true });
      return target;
    }
    const stage = `${target}.migration`;
    const retryPaths = new Set();
    const reportPath = `${stage}/migration-report.json`;
    if (await this.api.exists(reportPath)) {
      try {
        const report = JSON.parse(await this.api.read(reportPath));
        for (const failure of report?.failedFiles || []) {
          if (failure?.path) retryPaths.add(String(failure.path));
        }
      } catch {}
    }
    const migration = await this.copyDirectoryWithProgress(
      source,
      stage,
      () => {},
      { continueOnError: true, forcePaths: retryPaths },
    );
    const failures = [...migration.failures];
    let failureCount = migration.failedFileCount;
    const sourceSettings = (await this.api.exists(`${source}/settings.json`))
      ? `${source}/settings.json`
      : `${source}/data/settings.json`;
    if (await this.api.exists(sourceSettings)) {
      try {
        await this.copyFileAndVerify(
          sourceSettings,
          `${stage}/settings.json`,
          { force: retryPaths.has("settings.json") },
        );
      } catch (error) {
        failureCount += 1;
        failures.push({
          path: "settings.json",
          reason: error.message || String(error),
        });
      }
    }
    if (failureCount) {
      await this.api
        .write(
          reportPath,
          `${JSON.stringify(
            {
              version: 1,
              status: "incomplete",
              source,
              target,
              failedFiles: failures,
              failedFileCount: failureCount,
              totalFiles: migration.totalFiles,
              copiedFiles: migration.copiedFiles,
              updatedAt: new Date().toISOString(),
            },
            null,
            2,
          )}\n`,
        )
        .catch(() => {});
      const error = new Error(
        `WeekBox storage migration paused after ${failureCount} file failure${failureCount === 1 ? "" : "s"}. The original library was kept; retry from WeekBox storage settings after resolving the reported paths.`,
      );
      error.storageMigration = {
        sourcePath: source,
        targetPath: target,
        stagePath: stage,
        reportPath,
        failedFiles: failures,
      };
      throw error;
    }
    await this.api.remove(`${stage}/data/settings.json`);
    await this.ensureStorageDirectoriesAt(stage);
    await this.api.remove(`${stage}/migration-report.json`).catch(() => {});
    await this.writeStorageManifest(stage, source);
    if (await this.isCompleteStorage(stage) && await this.api.exists(`${stage}/settings.json`)) {
      if (await this.api.exists(target)) await this.api.move(target, storageBackupPath(target));
      await this.api.move(stage, target);
      let sourceBackupPath = source;
      if (normalizeComparablePath(source) !== normalizeComparablePath(window.NL_PATH)) {
        const candidate = storageBackupPath(source);
        await this.api.move(source, candidate).then(() => {
          sourceBackupPath = candidate;
        }).catch(() => {});
      }
      await this.writeStorageManifest(target, sourceBackupPath, { force: true });
      return target;
    }
    throw new Error("WeekBox storage migration did not pass verification");
  }
  consumeStorageMigrationFallback() {
    const fallback = this.storageMigrationFallback;
    this.storageMigrationFallback = null;
    return fallback;
  }
  async ensureStorageDirectoriesAt(root) {
    await this.api.ensureDir(root);
    await Promise.all(["data", "engines", "mods"].map((directory) =>
      this.api.ensureDir(`${root}/${directory}`),
    ));
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
    const candidates = isLibraryFolder(selectedPath) || isWeekBoxFolder(selectedPath)
      ? [selectedPath]
      : [selectedPath, `${selectedPath}/${STORAGE_DIRECTORY_NAME}`, `${selectedPath}/WeekBox`];
    for (const candidate of candidates) {
      if (await this.isCompleteStorage(candidate)) {
        return {
          basePath: candidate,
          weekboxPath: candidate,
          legacy: !isLibraryFolder(candidate),
        };
      }
    }
    return null;
  }
  async hasStorageFolder(basePath) {
    const selectedPath = trimPath(basePath);
    if (!selectedPath) return false;
    if (isLibraryFolder(selectedPath) || isWeekBoxFolder(selectedPath)) {
      return this.api.exists(selectedPath);
    }
    return (
      (await this.api.exists(`${selectedPath}/${STORAGE_DIRECTORY_NAME}`)) ||
      (await this.api.exists(`${selectedPath}/WeekBox`))
    );
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
    const target = storage.legacy
      ? `${getParentPath(storage.basePath)}/${STORAGE_DIRECTORY_NAME}`
      : storage.basePath;
    const selected = storage.legacy
      ? await this.migrateStorage(storage.basePath, target)
      : storage.basePath;
    this.setStoragePaths(selected);
    await this.ensureStorageDirectories();
    await this.ensureStorageManifest();
    await this.selectSettingsPath(selected);
    return this.weekboxPath;
  }
  async moveStorageTo(basePath, onProgress = () => {}, options = {}) {
    this.assertStorageUnlocked();
    const destinationBasePath = this.getStorageDestinationPath(basePath);
    if (!destinationBasePath) throw new Error("Choose a storage folder first");
    if (normalizeComparablePath(destinationBasePath) === normalizeComparablePath(this.basePath)) {
      return this.weekboxPath;
    }
    if (this.hasRunningProcesses()) {
      throw new Error("Close running engines before moving WeekBox files");
    }
    await this.api.ensureDir(destinationBasePath);
    if (!(await this.api.exists(destinationBasePath))) {
      throw new Error("Selected storage folder is unavailable");
    }
    if (pathsOverlap(destinationBasePath, this.basePath)) {
      throw new Error(
        "Choose a storage folder outside the current WeekBoxLibrary folder.",
      );
    }
    const destinationStagePath = `${destinationBasePath}.moving`;
    if (pathsOverlap(destinationStagePath, this.basePath)) {
      throw new Error("Choose a storage folder outside the current library.");
    }
    const storageOnlyMove = this.isStorageInExecutableDirectory();
    let replacedStorageBackupPath = null;
    this.isStorageMoveInProgress = true;
    const previousBasePath = this.basePath;
    const previousSettingsPath = appSettings.path;
    const previousStoragePath = appSettings.get("storagePath");
    let mods = [];
    let engines = [];
    try {
      const storedMods = await this.mods.getAll();
      mods = Array.isArray(storedMods) ? storedMods : [];
      engines = await this.getInstalledEngines();
      await Promise.all(mods.map((mod) => this.injection.unlinkFromInstalledEngines(mod, engines)));
      if (storageOnlyMove) {
        await this.copyStorageDirectoriesWithProgress(
          this.weekboxPath,
          destinationStagePath,
          onProgress,
        );
      } else {
        await this.copyDirectoryWithProgress(
          this.weekboxPath,
          destinationStagePath,
          onProgress,
        );
      }
      const sourceSettings = (await this.api.exists(`${this.weekboxPath}/settings.json`))
        ? `${this.weekboxPath}/settings.json`
        : `${this.weekboxPath}/data/settings.json`;
      if (await this.api.exists(sourceSettings)) {
        await this.copyFileAndVerify(sourceSettings, `${destinationStagePath}/settings.json`);
      }
      await this.api.remove(`${destinationStagePath}/data/settings.json`);
      await this.ensureStorageDirectoriesAt(destinationStagePath);
      appSettings.set("storagePath", destinationBasePath, { persist: false });
      await appSettings.write(`${destinationStagePath}/settings.json`);
      await this.writeStorageManifest(destinationStagePath, this.weekboxPath);
      if (!(await this.isCompleteStorage(destinationStagePath)) || !(await this.api.exists(`${destinationStagePath}/settings.json`))) {
        throw new Error("WeekBox storage move did not pass verification");
      }

      if (await this.api.exists(destinationBasePath)) {
        const entries = getRealEntries(
          await Neutralino.filesystem.readDirectory(destinationBasePath),
        );
        if (entries.length) {
          if (!options.replaceExisting) {
            throw new Error(
              "The selected folder already contains files. Choose a different folder or replace it after making a backup.",
            );
          }
          replacedStorageBackupPath = storageBackupPath(destinationBasePath);
          await this.api.move(destinationBasePath, replacedStorageBackupPath);
        } else {
          await this.api.remove(destinationBasePath);
        }
      }
      await this.api.move(destinationStagePath, destinationBasePath);

      try {
        this.setStoragePaths(destinationBasePath);
        await appSettings.setDataPath(destinationBasePath);
        await appSettings.write();
      } catch (error) {
        this.setStoragePaths(previousBasePath);
        appSettings.path = previousSettingsPath;
        appSettings.set("storagePath", previousStoragePath, { persist: false });
        await appSettings.write(previousSettingsPath).catch(() => {});
        throw new Error(
          `Could not save the new WeekBox storage location. The original location was kept. ${error?.message || error}`,
        );
      }
      if (
        normalizeComparablePath(previousBasePath) !== normalizeComparablePath(window.NL_PATH) &&
        (await this.api.exists(previousBasePath))
      ) {
        await this.api.move(previousBasePath, storageBackupPath(previousBasePath)).catch((error) =>
          console.warn("Could not keep a dated WeekBox storage backup", error),
        );
      }
      const movedMods = (await this.mods.getAll()) || [];
      const movedEngines = await this.getInstalledEngines();
      await Promise.all(movedMods.map((mod) => this.injection.injectIntoInstalledEngines(mod.id, movedEngines)));
      return this.weekboxPath;
    } catch (error) {
      this.setStoragePaths(previousBasePath);
      appSettings.path = previousSettingsPath;
      appSettings.set("storagePath", previousStoragePath, { persist: false });
      await Promise.all(mods.map((mod) => this.injection.injectIntoInstalledEngines(mod.id, engines))).catch(() => {});
      throw new Error(
        `Could not move WeekBox files: ${error?.message || error}. The original location was kept and the staged copy can be resumed.`,
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
              force: forcePaths.has(
                relativePath.replace(/^[\\/]+/, ""),
              ),
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
    const documentsPath = await Neutralino.os.getPath("documents");
    return (
      this.basePath.toLowerCase() === documentsPath.toLowerCase() ||
      this.isOneDriveStorage()
    );
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
  async hasModFiles(mod) {
    return this.maintenance.hasModFiles(mod);
  }
  async cleanupInvalidInstalledMods() {
    return this.maintenance.cleanupInvalidInstalledMods();
  }
  async cleanupInvalidEngineInstallations() {
    return this.maintenance.cleanupInvalidEngineInstallations();
  }
  async isEngineInstalled(engineId, version) {
    if (!this.isInitialized) return false;
    if (!Object.prototype.hasOwnProperty.call(ENGINE_DETAILS, engineId)) {
      return false;
    }
    if (!isValidEngineVersion(version)) return false;
    const path = `${this.enginesPath}/${engineId}/${version}`;
    if (!(await this.api.exists(path))) return false;
    return (
      !(await this.api.exists(`${path}/.downloading`)) &&
      Boolean(await this.findExecutable(path))
    );
  }
  async findExecutable(directory) {
    return this.executables.find(directory);
  }
  getExecutableSearchError() {
    return this.executables.getLastError();
  }
  async runEngine(engineId, version, onStateChange, args = [], modId = null) {
    if (
      !Object.prototype.hasOwnProperty.call(ENGINE_DETAILS, engineId) ||
      !isValidEngineVersion(version)
    ) {
      onStateChange?.("not_found");
      return false;
    }
    const executable = await this.findExecutable(
      `${this.enginesPath}/${engineId}/${version}`,
    );
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
                      version.entry === "Latest"),
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
      return engines.flat();
    } catch (error) {
      return [];
    }
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
      if (
        mod.kind === "dependency" &&
        mod.engineId === "codename" &&
        !mod.consumers?.length
      ) {
        mod.kind = "addon";
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
      if (mod.kind === "dependency" || mod.kind === "addon") continue;
      const executable = await this.findExecutable(
        `${this.modsPath}/${getModFolderName(mod)}`,
      );
      if (!executable) continue;
      standaloneMods.push({
        ...mod,
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
    if (!this.isInitialized) throw new Error("WeekBox storage is not ready");
    const modName = String(name || "").trim();
    if (!modName) throw new Error("Give the mod a name");
    const normalizedSource = String(sourcePath || "")
      .replace(/\\/g, "/")
      .replace(/\/+$/, "");
    const normalizedModsPath = this.modsPath
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
    if (!sourceStats.isDirectory) {
      throw new Error("The selected path is not a folder");
    }
    const modId = `local-${crypto.randomUUID()}`;
    const requestedKind = ["mod", "addon", "dependency"].includes(kind)
      ? kind
      : "mod";
    if (requestedKind === "addon" && engineId !== "codename") {
      throw new Error("Addons are only available for Codename Engine mods");
    }
    const folderName = await this.getAvailableLocalModFolderName(modName);
    const destinationPath = `${this.modsPath}/${folderName}`;
    try {
      await Neutralino.filesystem.copy(normalizedSource, destinationPath, {
        recursive: true,
        overwrite: false,
        skip: false,
      });
      await this.saveInstalledMod(modId, modName, {
        folderName,
        engineFolderName: sanitizePathSegment(modName) || folderName,
        engineId: engineId || null,
        engineVersion: engineId ? engineVersion || null : null,
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
    if (type === "addon" && mod.engineId !== "codename") {
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
    // Remove the current link before changing its destination (mods vs Codename addons).
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
    const folderName = getModFolderName(mod);
    if (
      !folderName ||
      /[\\/]/.test(folderName) ||
      folderName === "." ||
      folderName === ".."
    ) {
      throw new Error(`Invalid mod folder for ${mod.name}`);
    }
    const modPath = `${this.modsPath}/${folderName}`;
    if (await this.api.exists(modPath)) {
      const command =
        window.NL_OS === "Windows"
          ? `cmd /c rmdir /S /Q "${modPath.replace(/\//g, "\\")}"`
          : `rm -rf "${modPath}"`;
      let result;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        result = await Neutralino.os.execCommand(command, {
          background: false,
        });
        if (result.exitCode === 0 || !(await this.api.exists(modPath))) break;
        if (attempt < 3)
          await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      }
      if (result?.exitCode !== 0 && (await this.api.exists(modPath))) {
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
    if (!this.isInitialized) return false;
    const mod = (await this.mods.getAll()).find((item) =>
      sameId(item.id, modId),
    );
    return Boolean(mod && (await this.hasModFiles(mod)));
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
