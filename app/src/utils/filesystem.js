import { APIneuFileSystem } from "./filesystem/APIneuFileSystem.js";
import {
  getEngineLaunchBehavior,
  getEngineModLaunchArgs,
} from "../config/engines.js";
import { ExecutableService } from "./filesystem/executableService.js";
import { ModInjectionService } from "./filesystem/modInjectionService.js";
import { ModRepository } from "./filesystem/modRepository.js";
import { getModFolderName, getRealEntries } from "./filesystem/pathUtils.js";
import { ProcessService } from "./filesystem/processService.js";

class FileSystemService {
  constructor() {
    this.basePath = "";
    this.enginesPath = "";
    this.modsPath = "";
    this.dataPath = "";
    this.isInitialized = false;
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
  }

  async init() {
    if (typeof Neutralino !== "undefined") {
      this.basePath = await Neutralino.os.getPath("documents");
      const weekboxPath = `${this.basePath}/WeekBox`;
      this.enginesPath = `${weekboxPath}/engines`;
      this.modsPath = `${weekboxPath}/mods`;
      this.dataPath = `${weekboxPath}/data`;
      await this.api.ensureDir(weekboxPath);
      await this.api.ensureDir(this.enginesPath);
      await this.api.ensureDir(this.modsPath);
      await this.api.ensureDir(this.dataPath);
      await this.cleanupIncompleteDownloads();
    }
    this.isInitialized = true;
    await this.cleanupHiddenModLinks();
  }

  async cleanupHiddenModLinks() {
    const hiddenMods = (await this.mods.getAll()).filter((mod) => mod.hidden);
    if (hiddenMods.length === 0) return;
    const engines = await this.getInstalledEngines();
    await Promise.all(
      hiddenMods.map((mod) =>
        this.injection.unlinkFromInstalledEngines(mod, engines),
      ),
    );
  }

  async cleanupIncompleteDownloads() {
    try {
      const engines = await Neutralino.filesystem.readDirectory(
        this.enginesPath,
      );
      for (const engine of getRealEntries(engines)) {
        if (engine.type === "FILE" && /^temp_.*\.zip$/.test(engine.entry)) {
          await this.api
            .remove(`${this.enginesPath}/${engine.entry}`)
            .catch(() => {});
          continue;
        }
        if (engine.type !== "DIRECTORY") continue;
        const versions = await Neutralino.filesystem.readDirectory(
          `${this.enginesPath}/${engine.entry}`,
        );
        for (const version of getRealEntries(versions)) {
          if (version.type !== "DIRECTORY") continue;
          const versionPath = `${this.enginesPath}/${engine.entry}/${version.entry}`;
          if (!(await this.api.exists(`${versionPath}/.downloading`))) continue;
          const command =
            window.NL_OS === "Windows"
              ? `rmdir /S /Q "${versionPath.replace(/\//g, "\\")}"`
              : `rm -rf "${versionPath}"`;
          await Neutralino.os
            .execCommand(command, { background: true })
            .catch(() => {});
        }
      }
    } catch (error) {
      console.warn("Could not clean up incomplete downloads", error);
    }
  }

  async isEngineInstalled(engineId, version) {
    if (!this.isInitialized) return false;
    const path = `${this.enginesPath}/${engineId}/${version}`;
    return (
      !(await this.api.exists(`${path}/.downloading`)) &&
      Boolean(await this.findExecutable(path))
    );
  }

  async findExecutable(directory) {
    return this.executables.find(directory);
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
    if (state === "unavailable")
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
          .filter((entry) => entry.type === "DIRECTORY")
          .map(async (engine) => {
            const versions = await Neutralino.filesystem.readDirectory(
              `${this.enginesPath}/${engine.entry}`,
            );
            return versions
              .filter((version) => version.type === "DIRECTORY")
              .map((version) => ({ id: engine.entry, version: version.entry }));
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
    return this.injection.injectIntoInstalledEngines(
      modId,
      await this.getInstalledEngines(),
    );
  }

  async cleanupEngineMods(engineId, version) {
    return this.injection.cleanup(engineId, version);
  }

  async getInstalledMods() {
    return this.isInitialized ? this.mods.getAll() : [];
  }

  async getStandaloneMods() {
    if (!this.isInitialized) return [];
    const standaloneMods = [];
    for (const mod of await this.mods.getAll()) {
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

  async runStandaloneMod(modId, onExit) {
    const mod = (await this.getStandaloneMods()).find(
      (item) => item.id === modId,
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
    if (this.isInitialized) await this.mods.add(modId, modName, metadata);
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

  async removeInstalledMod(modId) {
    if (!this.isInitialized) return false;
    const mod = (await this.mods.getAll()).find((item) => item.id === modId);
    if (!mod) return false;
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
    return true;
  }

  async isModInstalled(modId) {
    return this.isInitialized ? this.mods.has(modId) : false;
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
