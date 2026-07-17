import { getModFolderName } from "./pathUtils.js";

function sameId(left, right) {
  return String(left) === String(right);
}

function supportsEngineVersion(mod, version) {
  return !mod.engineVersion || mod.engineVersion === version;
}

export class ModInjectionService {
  constructor({
    api,
    executables,
    modRepository,
    getEnginesPath,
    getModsPath,
  }) {
    this.api = api;
    this.executables = executables;
    this.modRepository = modRepository;
    this.getEnginesPath = getEnginesPath;
    this.getModsPath = getModsPath;
  }

  async link(mod, engineId, version) {
    const folderName = getModFolderName(mod);
    const sourcePath = `${this.getModsPath()}/${folderName}`;
    const modsPath = `${this.getEnginesPath()}/${engineId}/${version}/mods`;
    const linkPath = `${modsPath}/${folderName}`;

    if (!(await this.api.exists(sourcePath))) {
      throw new Error(`Mod files not found for ${mod.name}`);
    }
    await this.api.ensureDir(modsPath);
    if (await this.api.exists(linkPath))
      return { linked: false, path: linkPath };

    const command =
      window.NL_OS === "Windows"
        ? `cmd /c mklink /J "${linkPath}" "${sourcePath}"`
        : `ln -s "${sourcePath}" "${linkPath}"`;

    const result = await Neutralino.os.execCommand(command, {
      background: false,
    });

    if (result.exitCode !== 0) {
      throw new Error(result.stdErr || `Could not inject ${mod.name}`);
    }
    return { linked: true, path: linkPath };
  }

  async injectOne(modId, engineId, version) {
    const mod = (await this.modRepository.getAll()).find((item) =>
      sameId(item.id, modId),
    );
    if (!mod || mod.hidden || !supportsEngineVersion(mod, version)) return;
    return this.link(mod, engineId, version);
  }

  async injectForEngine(engineId, version) {
    const mods = (await this.modRepository.getAll()).filter(
      (mod) =>
        mod.engineId === engineId &&
        !mod.hidden &&
        supportsEngineVersion(mod, version),
    );

    // OPTIMIZACIÓN: Se removió el pesado escaneo de archivos .exe aquí
    return Promise.allSettled(
      mods.map((mod) => this.link(mod, engineId, version)),
    );
  }

  async injectIntoInstalledEngines(modId, engines) {
    const mod = (await this.modRepository.getAll()).find((item) =>
      sameId(item.id, modId),
    );
    if (!mod?.engineId || mod.hidden) return [];

    // OPTIMIZACIÓN: Se removió el pesado escaneo de archivos .exe aquí (multiplicaba el tiempo de instalación)
    return Promise.allSettled(
      engines
        .filter(
          (engine) =>
            engine.id === mod.engineId &&
            supportsEngineVersion(mod, engine.version),
        )
        .map((engine) => this.link(mod, engine.id, engine.version)),
    );
  }

  async unlinkFromEngine(mod, engineId, version) {
    const linkPath = `${this.getEnginesPath()}/${engineId}/${version}/mods/${getModFolderName(mod)}`;
    if (!(await this.api.exists(linkPath))) return false;

    const command =
      window.NL_OS === "Windows"
        ? `cmd /c rmdir "${linkPath.replace(/\//g, "\\")}"`
        : `rm -f "${linkPath}"`;

    const result = await Neutralino.os.execCommand(command, {
      background: false,
    });

    if (result.exitCode !== 0) {
      throw new Error(
        result.stdErr || `Could not remove mod link for ${mod.name}`,
      );
    }
    return true;
  }

  async unlinkFromInstalledEngines(mod, engines) {
    return Promise.allSettled(
      engines.map((engine) =>
        this.unlinkFromEngine(mod, engine.id, engine.version),
      ),
    );
  }

  async cleanup(engineId, version) {
    const modsPath = `${this.getEnginesPath()}/${engineId}/${version}/mods`;
    if (!(await this.api.exists(modsPath))) return;
    try {
      const entries = await Neutralino.filesystem.readDirectory(modsPath);
      for (const entry of entries.filter(
        (item) => item.entry !== "." && item.entry !== "..",
      )) {
        const linkPath = `${modsPath}/${entry.entry}`;
        const command =
          window.NL_OS === "Windows"
            ? `cmd /c rmdir "${linkPath.replace(/\//g, "\\")}"`
            : `rm -rf "${linkPath}"`;
        await Neutralino.os
          .execCommand(command, { background: false })
          .catch(() => {});
      }
    } catch (error) {
      console.warn("Could not clean up mods shortcuts", error);
    }
  }
}
