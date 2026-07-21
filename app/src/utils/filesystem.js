import { APIneuFileSystem } from "./filesystem/APIneuFileSystem.js";
import {
  getEngineLaunchBehavior,
  getEngineModLaunchArgs,
  ENGINE_DETAILS,
} from "../config/engines.js";
import { ExecutableService } from "./filesystem/executableService.js";
import { ModInjectionService } from "./filesystem/modInjectionService.js";
import { LibraryMaintenanceService } from "./filesystem/libraryMaintenanceService.js";
import { ModRepository } from "./filesystem/modRepository.js";
import { ModCoverService } from "./filesystem/modCoverService.js";
import { isValidEngineVersion } from "./filesystem/engineVersion.js";
import {
  getParentPath,
  getModFolderName,
  getRealEntries,
  sanitizePathSegment,
} from "./filesystem/pathUtils.js";
import { ProcessService } from "./filesystem/processService.js";
import { appSettings } from "../core/settings.js";

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

class FileSystemService {
  constructor() {
    this.basePath = "";
    this.weekboxPath = "";
    this.enginesPath = "";
    this.modsPath = "";
    this.dataPath = "";
    this.isInitialized = false;
    this.startupMaintenancePromise = null;
    this.isStorageMoveInProgress = false;
    this.activeDownload = null;
    this.abortController = null;
    this.isPaused = false;
    this.api = APIneuFileSystem;
    this.executables = new ExecutableService();
    this.processes = new ProcessService(this.executables);
    this.activeEngineProcesses = this.processes.activeProcesses;
    this.activeEngineMods = new Map();
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

  async init({ deferMaintenance = false } = {}) {
    if (this.isInitialized) {
      if (!deferMaintenance) await this.runStartupMaintenance();
      return;
    }

    if (typeof Neutralino !== "undefined") {
      const defaultStoragePath = await this.getDefaultStorageParentPath();
      const savedPath = appSettings.get("storageParentPath");
      let storagePath = savedPath || defaultStoragePath;

      // Keep the old default exactly where it is. Existing libraries only move
      // when the user explicitly chooses a new location in Settings.
      if (!savedPath) {
        try {
          const legacyBasePath = await Neutralino.os.getPath("documents");
          if (await this.api.exists(`${legacyBasePath}/WeekBox`)) {
            storagePath = legacyBasePath;
          }
        } catch (error) {
          console.warn("Could not inspect the legacy WeekBox folder", error);
        }
      }

      this.setStoragePaths(storagePath);
      try {
        await this.ensureStorageDirectories();
      } catch (error) {
        if (!savedPath) throw error;
        console.warn("Could not access saved WeekBox storage location", error);
        appSettings.set("storageParentPath", null);
        this.setStoragePaths(defaultStoragePath);
        await this.ensureStorageDirectories();
      }
    }
    this.isInitialized = true;
    if (!deferMaintenance) await this.runStartupMaintenance();
  }

  async runStartupMaintenance({ onProgress } = {}) {
    if (this.startupMaintenancePromise) return this.startupMaintenancePromise;

    const runPhase = async (label, progress, task) => {
      onProgress?.(label, progress);
      const startedAt = performance.now();
      await task();
      console.info(
        `[WeekBox] Startup maintenance: ${label} finished in ${Math.round(performance.now() - startedAt)}ms`,
      );
    };

    this.startupMaintenancePromise = (async () => {
      await runPhase("Cleaning incomplete downloads", 90, () =>
        this.cleanupIncompleteDownloads(),
      );
      await runPhase("Validating engine installs", 92, () =>
        this.cleanupInvalidEngineInstallations(),
      );
      await runPhase("Validating installed mods", 94, () =>
        this.cleanupInvalidInstalledMods(),
      );
      await runPhase("Migrating library data", 96, () =>
        this.migrateLegacyModCovers(),
      );
      let installedEngines = [];
      await runPhase("Finding installed engines", 97, async () => {
        installedEngines = await this.getInstalledEngines();
      });
      await runPhase("Migrating engine mods", 98, async () => {
        await this.injection.migrateLegacyEngineModsFor(installedEngines);
      });
      await runPhase("Importing Psych Online mods", 99, () =>
        this.importPsychOnlineEngineMods(installedEngines),
      );
      await runPhase("Cleaning hidden mod links", 99, () =>
        this.cleanupHiddenModLinks(installedEngines),
      );
    })();

    return this.startupMaintenancePromise;
  }

  async startBackgroundMaintenance(options) {
    return this.runStartupMaintenance(options);
  }

  async getDefaultStorageParentPath() {
    if (window.NL_OS === "Windows") {
      const localAppDataPath = await Neutralino.os.getEnv("LOCALAPPDATA");
      if (localAppDataPath) return localAppDataPath;
    }
    const documentsPath = await Neutralino.os.getPath("documents");
    if (window.NL_OS === "Darwin" && isICloudPath(documentsPath)) {
      const homePath = await Neutralino.os.getEnv("HOME");
      if (homePath) return homePath;
    }
    return documentsPath;
  }

  setStoragePaths(basePath) {
    this.basePath = String(basePath).replace(/[\\/]+$/, "");
    this.weekboxPath = `${this.basePath}/WeekBox`;
    this.enginesPath = `${this.weekboxPath}/engines`;
    this.modsPath = `${this.weekboxPath}/mods`;
    this.dataPath = `${this.weekboxPath}/data`;
  }

  async ensureStorageDirectories() {
    await this.api.ensureDir(this.basePath);
    if (!(await this.api.exists(this.basePath))) {
      throw new Error("Selected storage folder is unavailable");
    }
    await this.api.ensureDir(this.weekboxPath);
    await this.api.ensureDir(this.enginesPath);
    await this.api.ensureDir(this.modsPath);
    await this.api.ensureDir(this.dataPath);
  }

  hasRunningProcesses() {
    return this.activeEngineProcesses.size > 0;
  }

  async getNestedStorageRepairTarget() {
    // An older picker flow allowed users to choose `D:/WeekBox` as the
    // parent. That produced `D:/WeekBox/WeekBox`. Only repair this exact,
    // otherwise-empty outer-folder layout so unrelated files are never merged.
    if (!isWeekBoxFolder(this.basePath)) return null;
    const parentPath = getParentPath(this.basePath);
    if (!parentPath) return null;
    try {
      const entries = getRealEntries(
        await Neutralino.filesystem.readDirectory(this.basePath),
      );
      const hasOnlyNestedWeekBox =
        entries.length === 1 &&
        entries[0].type === "DIRECTORY" &&
        entries[0].entry.toLowerCase() === "weekbox";
      return hasOnlyNestedWeekBox ? parentPath : null;
    } catch {
      return null;
    }
  }

  assertStorageUnlocked() {
    if (this.isStorageMoveInProgress) {
      throw new Error("Wait for WeekBox files to finish moving first");
    }
  }

  async findExistingStorage(basePath) {
    const selectedPath = String(basePath || "").replace(/[\\/]+$/, "");
    if (!selectedPath) return null;
    const weekboxPath = isWeekBoxFolder(selectedPath)
      ? selectedPath
      : `${selectedPath}/WeekBox`;
    const storageBasePath = isWeekBoxFolder(selectedPath)
      ? getParentPath(selectedPath)
      : selectedPath;
    const requiredPaths = ["data", "engines", "mods"].map(
      (directory) => `${weekboxPath}/${directory}`,
    );
    const hasRequiredFolders = await Promise.all(
      requiredPaths.map((path) => this.api.exists(path)),
    );
    return hasRequiredFolders.every(Boolean)
      ? { basePath: storageBasePath, weekboxPath }
      : null;
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
    this.setStoragePaths(storage.basePath);
    await appSettings.setDataPath(this.dataPath);
    appSettings.set("storageParentPath", storage.basePath);
    return storage.weekboxPath;
  }

  async moveStorageTo(basePath, onProgress = () => {}, options = {}) {
    this.assertStorageUnlocked();
    const destinationBasePath = String(basePath || "").replace(/[\\/]+$/, "");
    if (!destinationBasePath) throw new Error("Choose a storage folder first");
    if (isWeekBoxFolder(destinationBasePath)) {
      throw new Error(
        "Choose the folder that will contain WeekBox, not the WeekBox folder itself. For example, choose C:\\Users\\you\\AppData\\Local instead of C:\\Users\\you\\AppData\\Local\\WeekBox.",
      );
    }
    if (destinationBasePath.toLowerCase() === this.basePath.toLowerCase()) {
      return this.weekboxPath;
    }
    if (this.hasRunningProcesses()) {
      throw new Error("Close running engines before moving WeekBox files");
    }
    if (!(await this.api.exists(destinationBasePath))) {
      throw new Error("Selected storage folder is unavailable");
    }
    const destinationWeekboxPath = `${destinationBasePath}/WeekBox`;
    let replacedStorageBackupPath = null;
    const repairingNestedStorage =
      destinationWeekboxPath.toLowerCase() === this.basePath.toLowerCase();
    if (await this.api.exists(destinationWeekboxPath)) {
      const entries = getRealEntries(
        await Neutralino.filesystem.readDirectory(destinationWeekboxPath),
      );
      const canRepairNestedStorage =
        repairingNestedStorage &&
        entries.length === 1 &&
        entries[0].type === "DIRECTORY" &&
        entries[0].entry.toLowerCase() === "weekbox";
      if (entries.length > 0 && !canRepairNestedStorage) {
        if (!options.replaceExisting) {
          throw new Error(
            "The selected parent already contains a non-empty WeekBox folder. Choose a different parent folder so WeekBox does not merge two libraries.",
          );
        }
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .replace("T", "_")
          .replace("Z", "");
        replacedStorageBackupPath = `${destinationBasePath}/WeekBox-backup-${timestamp}`;
        await Neutralino.filesystem.move(
          destinationWeekboxPath,
          replacedStorageBackupPath,
        );
      }
      if (!canRepairNestedStorage && !replacedStorageBackupPath) {
        await Neutralino.filesystem.remove(destinationWeekboxPath);
      }
    }
    this.isStorageMoveInProgress = true;
    try {
      const mods = await this.mods.getAll();
      const engines = await this.getInstalledEngines();
      await Promise.all(
        mods.map((mod) =>
          this.injection.unlinkFromInstalledEngines(mod, engines),
        ),
      );
      try {
        await this.copyDirectoryWithProgress(
          this.weekboxPath,
          destinationWeekboxPath,
          onProgress,
        );
        await Neutralino.filesystem.remove(this.weekboxPath);
      } catch (error) {
        if (
          replacedStorageBackupPath &&
          !(await this.api.exists(destinationWeekboxPath))
        ) {
          await Neutralino.filesystem
            .move(replacedStorageBackupPath, destinationWeekboxPath)
            .catch(() => {});
        }
        await Promise.all(
          mods.map((mod) =>
            this.injection.injectIntoInstalledEngines(mod.id, engines),
          ),
        ).catch(() => {});
        throw new Error(
          "Could not move WeekBox files. The original location was kept.",
        );
      }
      this.setStoragePaths(destinationBasePath);
      await appSettings.setDataPath(this.dataPath);
      appSettings.set("storageParentPath", destinationBasePath);
      const [movedMods, movedEngines] = await Promise.all([
        this.mods.getAll(),
        this.getInstalledEngines(),
      ]);
      await Promise.all(
        movedMods.map((mod) =>
          this.injection.injectIntoInstalledEngines(mod.id, movedEngines),
        ),
      );
      return this.weekboxPath;
    } finally {
      this.isStorageMoveInProgress = false;
    }
  }

  async copyDirectoryWithProgress(sourcePath, destinationPath, onProgress) {
    const files = [];
    const directories = [];
    const collectFiles = async (directoryPath) => {
      directories.push(directoryPath);
      const entries = getRealEntries(
        await Neutralino.filesystem.readDirectory(directoryPath),
      );
      for (const entry of entries) {
        const entryPath = `${directoryPath}/${entry.entry}`;
        if (entry.type === "DIRECTORY") {
          await collectFiles(entryPath);
        } else if (entry.type === "FILE") {
          const stats = await Neutralino.filesystem.getStats(entryPath);
          files.push({ path: entryPath, size: Number(stats.size) || 0 });
        }
      }
    };
    await collectFiles(sourcePath);

    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    const fileSizes = new Map(files.map((file) => [file.path, file.size]));
    let copiedBytes = 0;
    let copiedFiles = 0;
    const reportProgress = () => {
      const progress = totalBytes
        ? (copiedBytes / totalBytes) * 100
        : files.length
          ? (copiedFiles / files.length) * 100
          : 100;
      onProgress({ progress, copiedFiles, totalFiles: files.length });
    };

    reportProgress();
    for (const sourceDirectory of directories) {
      const relativePath = sourceDirectory.slice(sourcePath.length);
      await this.api.ensureDir(`${destinationPath}${relativePath}`);
    }

    const concurrency = appSettings.get("multithreadStorageMoves") ? 4 : 1;
    let nextFileIndex = 0;
    const copyNextFile = async () => {
      while (nextFileIndex < files.length) {
        const file = files[nextFileIndex++];
        const relativePath = file.path.slice(sourcePath.length);
        await Neutralino.filesystem.copy(
          file.path,
          `${destinationPath}${relativePath}`,
          { recursive: false, overwrite: false, skip: false },
        );
        copiedBytes += fileSizes.get(file.path) || 0;
        copiedFiles += 1;
        reportProgress();
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(concurrency, files.length) }, copyNextFile),
    );
  }

  async shouldRecommendDefaultStorage() {
    if (window.NL_OS !== "Windows" && window.NL_OS !== "Darwin") {
      return false;
    }
    if (appSettings.get("storageMoveRecommendationDismissed")) return false;
    if (window.NL_OS === "Darwin") return this.isICloudStorage();
    const defaultPath = await this.getDefaultStorageParentPath();
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

  getRunningEngineMod(engineId, version) {
    return this.activeEngineMods.get(`${engineId}:${version}`) || null;
  }

  getModLaunchState(mod, engine, isStandalone) {
    if (isStandalone) {
      return this.isStandaloneModRunning(mod.id) ? "running" : "launch";
    }
    if (!engine) return "unavailable";
    if (!this.isEngineRunning(engine.id, engine.version)) return "launch";
    const behavior = getEngineLaunchBehavior(engine.id);
    if (behavior.scope !== "exclusive-mod") return "running";
    const runningModId = this.getRunningEngineMod(engine.id, engine.version);
    if (runningModId === null) return "switch";
    return String(runningModId) === String(mod.id) ? "running" : "switch";
  }

  async toggleModLaunch(mod, engine, isStandalone, onStateChange) {
    const state = this.getModLaunchState(mod, engine, isStandalone);
    if (state === "unavailable" && !isStandalone)
      throw new Error("Assigned engine is not installed");
    if (isStandalone) {
      return state === "running"
        ? this.closeStandaloneMod(mod.id)
        : this.runStandaloneMod(mod.id, onStateChange);
    }
    const behavior = getEngineLaunchBehavior(engine.id);
    const launch = async () => {
      await this.injectModIntoEngine(mod.id, engine.id, engine.version);
      const args = getEngineModLaunchArgs(engine.id, getModFolderName(mod));
      return this.runEngine(
        engine.id,
        engine.version,
        onStateChange,
        args,
        behavior.scope === "exclusive-mod" ? mod.id : null,
      );
    };
    if (state === "launch") return launch();
    if (state === "running") return this.closeEngine(engine.id, engine.version);
    if (await this.closeEngineAndWait(engine.id, engine.version))
      return launch();
    return false;
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

    // OPTIMIZACIÓN: Leer el directorio entero en lugar de archivo por archivo (evita bloqueos/lentitud)
    let validFolders = new Set();
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
      if (mod.kind === "dependency") continue;

      // FIX: Siempre verificar si tiene un ejecutable. Si lo tiene, se vuelve independiente (executable).
      const executable = await this.findExecutable(
        `${this.modsPath}/${getModFolderName(mod)}`,
      );
      if (!executable) continue;

      // AUTO-CORRECCIÓN: Si el mod tiene ejecutable pero se le asignó un engine por error,
      // limpiamos su motor en la base de datos automáticamente.
      if (mod.engineId) {
        this.setModEngineCompatibility(mod.id, null, null).catch(() => {});
        mod.engineId = null;
        mod.engineVersion = null;
      }

      standaloneMods.push({
        ...mod,
        exePath: executable,
        icoPath: await this.executables.getIconDataUrl(executable),
      });
    }
    return standaloneMods;
  }

  async runStandaloneMod(modId, onExit) {
    const mod = (await this.getStandaloneMods()).find((item) =>
      sameId(item.id, modId),
    );
    if (!mod) {
      onExit?.();
      return false;
    }
    return this.processes.launch(
      `standalone:${mod.id}`,
      mod.exePath,
      (state) => {
        if (state === "completed" || state === "error") onExit?.();
      },
    );
  }

  async closeStandaloneMod(modId, onStateChange) {
    return this.processes.close(`standalone:${modId}`, onStateChange);
  }

  isStandaloneModRunning(modId) {
    return this.processes.isRunning(`standalone:${modId}`);
  }

  async saveInstalledMod(modId, modName, metadata = {}) {
    if (!this.isInitialized) return;

    // FIX: Antes de guardarlo por primera vez, escaneamos su carpeta.
    // Si tiene un '.exe', quitamos cualquier asignación de motor que venga de la metadata (Gamebanana)
    const tempMod = { name: modName, id: modId, ...metadata };
    const executable = await this.findExecutable(
      `${this.modsPath}/${getModFolderName(tempMod)}`,
    );
    if (executable) {
      metadata.engineId = null;
      metadata.engineVersion = null;
    }

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
        engineId: engineId || null,
        engineVersion: engineId ? engineVersion || null : null,
        source: "local",
      });
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
    if (coverDataUrl !== undefined) {
      coverPath = coverDataUrl
        ? await this.covers.saveDataUrl(modId, coverDataUrl)
        : null;
    } else if (coverUrl !== undefined) {
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

  async moveModToDependencies(modId) {
    this.assertStorageUnlocked();
    if (!this.isInitialized) return null;
    const mod = (await this.mods.getAll()).find((item) =>
      sameId(item.id, modId),
    );
    if (!mod || mod.kind === "dependency") return mod || null;

    const engines = await this.getInstalledEngines();
    await this.injection.unlinkFromInstalledEngines(mod, engines);
    return this.mods.moveToDependencies(modId);
  }

  async moveDependencyToMods(modId) {
    this.assertStorageUnlocked();
    if (!this.isInitialized) return null;
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
    const mod = (await this.mods.getAll()).find((item) =>
      sameId(item.id, modId),
    );
    if (!mod) return false;
    if (mod.kind === "dependency") {
      const consumers = (await this.mods.getAll()).filter(
        (item) =>
          Array.isArray(item.dependencies) && item.dependencies.includes(modId),
      );
      if (consumers.length) {
        throw new Error(
          `Remove ${consumers.map((item) => item.name).join(", ")} before removing ${mod.name}`,
        );
      }
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
      const result = await Neutralino.os.execCommand(command, {
        background: false,
      });
      if (result.exitCode !== 0) {
        throw new Error(
          result.stdErr || `Could not remove mod files for ${mod.name}`,
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
        await Neutralino.filesystem.move(
          `${sourceDir}/${entry.entry}`,
          `${targetDir}/${entry.entry}`,
        );
      }
      await Neutralino.filesystem.remove(sourceDir);
    } catch (error) {}
  }
}

export const FS = new FileSystemService();
