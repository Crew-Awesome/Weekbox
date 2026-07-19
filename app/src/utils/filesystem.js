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
import {
  getParentPath,
  getModFolderName,
  getRealEntries,
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
      getModsPath: () => this.modsPath,
      getInstalledEngines: () => this.getInstalledEngines(),
      isEngineRunning: (engineId, version) =>
        this.isEngineRunning(engineId, version),
    });
  }

  async init() {
    if (typeof Neutralino !== "undefined") {
      const defaultStoragePath = await this.getDefaultStorageParentPath();
      const savedPath = appSettings.get("storageParentPath");
      let storagePath = savedPath || defaultStoragePath;

      // Keep the old default exactly where it is. Existing libraries only move
      // when the user explicitly chooses a new location in Settings.
      if (!savedPath) {
        const legacyBasePath = await Neutralino.os.getPath("documents");
        if (await this.api.exists(`${legacyBasePath}/WeekBox`)) {
          storagePath = legacyBasePath;
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
      await this.cleanupIncompleteDownloads();
      await this.cleanupInvalidInstalledMods();
    }
    this.isInitialized = true;
    await this.importPsychOnlineEngineMods();
    await this.cleanupHiddenModLinks();
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

  async moveStorageTo(basePath, onProgress = () => {}) {
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
        throw new Error(
          "The selected parent already contains a non-empty WeekBox folder. Choose a different parent folder so WeekBox does not merge two libraries.",
        );
      }
      if (!canRepairNestedStorage) {
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

  async cleanupHiddenModLinks() {
    return this.maintenance.cleanupHiddenModLinks();
  }

  async importPsychOnlineEngineMods() {
    return this.maintenance.importPsychOnlineEngineMods();
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

  async isEngineInstalled(engineId, version) {
    if (!this.isInitialized) return false;
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
                .filter((version) => version.type === "DIRECTORY")
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
    if (!mod.hidden && mod.engineId) {
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
    if (mod?.engineId && !mod.hidden) {
      await this.injection.injectIntoInstalledEngines(modId, engines);
    }
    return mod;
  }

  async addDependencyConsumer(dependencyId, consumerId) {
    if (!this.isInitialized) return null;
    return this.mods.addDependencyConsumer(dependencyId, consumerId);
  }

  async removeDependencyConsumer(dependencyId, consumerId) {
    if (!this.isInitialized) return null;
    return this.mods.removeDependencyConsumer(dependencyId, consumerId);
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
