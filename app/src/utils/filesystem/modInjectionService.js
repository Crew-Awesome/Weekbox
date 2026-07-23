import { getEngineModFolderName, getModFolderName } from "./pathUtils.js";

function sameId(left, right) {
  return String(left) === String(right);
}

function supportsEngineVersion(mod, version) {
  return !mod.engineVersion || mod.engineVersion === version;
}

function usesAddonsDirectory(mod, engineId) {
  return engineId === "codename" && mod.kind === "dependency";
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

  getLegacyModsPath(engineId, version) {
    return `${this.getEnginesPath()}/${engineId}/${version}/mods`;
  }

  getLegacyAddonsPath(engineId, version) {
    return `${this.getEnginesPath()}/${engineId}/${version}/addons`;
  }

  async getEngineContentPath(engineId, version, directoryName) {
    const legacyPath = `${this.getEnginesPath()}/${engineId}/${version}/${directoryName}`;
    if (window.NL_OS !== "Darwin") return legacyPath;

    const executablePath = await this.executables.find(
      `${this.getEnginesPath()}/${engineId}/${version}`,
    );
    const normalizedPath = String(executablePath || "").replace(/\\/g, "/");
    const bundleMatch = normalizedPath.match(/^(.+?\.app)(?:\/|$)/i);
    return bundleMatch
      ? `${bundleMatch[1]}/Contents/Resources/${directoryName}`
      : legacyPath;
  }

  async getEngineModsPath(engineId, version) {
    return this.getEngineContentPath(engineId, version, "mods");
  }

  async getEngineAddonsPath(engineId, version) {
    return this.getEngineContentPath(engineId, version, "addons");
  }

  async migrateLegacyEngineMods(engineId, version) {
    if (window.NL_OS !== "Darwin") return;
    const legacyModsPath = this.getLegacyModsPath(engineId, version);
    const bundleModsPath = await this.getEngineModsPath(engineId, version);
    if (
      bundleModsPath === legacyModsPath ||
      !(await this.api.exists(legacyModsPath))
    ) {
      return;
    }

    await this.api.ensureDir(bundleModsPath);
    const entries = await Neutralino.filesystem
      .readDirectory(legacyModsPath)
      .catch(() => []);
    for (const entry of entries.filter(
      (item) => item.entry !== "." && item.entry !== "..",
    )) {
      const sourcePath = `${legacyModsPath}/${entry.entry}`;
      const destinationPath = `${bundleModsPath}/${entry.entry}`;
      if (await this.api.exists(destinationPath)) continue;
      try {
        await Neutralino.filesystem.move(sourcePath, destinationPath);
      } catch (error) {
        console.warn("Could not migrate macOS engine mod:", sourcePath, error);
      }
    }
  }

  async migrateLegacyEngineModsFor(engines) {
    if (window.NL_OS !== "Darwin") return;
    await Promise.all(
      engines.map((engine) =>
        this.migrateLegacyEngineMods(engine.id, engine.version),
      ),
    );
  }

  async link(mod, engineId, version) {
    const folderName = getModFolderName(mod);
    const sourcePath = `${this.getModsPath()}/${folderName}`;
    await this.migrateLegacyEngineMods(engineId, version);
    const modsPath = usesAddonsDirectory(mod, engineId)
      ? await this.getEngineAddonsPath(engineId, version)
      : await this.getEngineModsPath(engineId, version);
    const engineFolderName = getEngineModFolderName(mod);
    const linkPath = `${modsPath}/${engineFolderName}`;

    if (!(await this.api.exists(sourcePath))) {
      throw new Error(`Mod files not found for ${mod.name}`);
    }
    await this.api.ensureDir(modsPath);
    if (await this.api.exists(linkPath)) {
      const conflicts = (await this.modRepository.getAll()).filter(
        (otherMod) =>
          !sameId(otherMod.id, mod.id) &&
          otherMod.engineId === engineId &&
          !otherMod.hidden &&
          usesAddonsDirectory(otherMod, engineId) ===
            usesAddonsDirectory(mod, engineId) &&
          getEngineModFolderName(otherMod) === engineFolderName,
      );
      if (conflicts.length) {
        throw new Error(
          `Engine folder conflict: ${engineFolderName} is already used by ${conflicts[0].name}. Remove or hide it before launching ${mod.name}.`,
        );
      }
      return { linked: false, path: linkPath };
    }

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
    const legacyModsPath = this.getLegacyModsPath(engineId, version);
    const bundleModsPath = await this.getEngineModsPath(engineId, version);
    const enginePaths = [bundleModsPath, legacyModsPath];
    if (engineId === "codename") {
      enginePaths.push(
        await this.getEngineAddonsPath(engineId, version),
        this.getLegacyAddonsPath(engineId, version),
      );
    }
    const paths = [...new Set(enginePaths)].map(
      (modsPath) => `${modsPath}/${getEngineModFolderName(mod)}`,
    );
    let removed = false;
    for (const linkPath of paths) {
      if (!(await this.api.exists(linkPath))) continue;
      const command =
        window.NL_OS === "Windows"
          ? `cmd /c rmdir "${linkPath.replace(/\//g, "\\")}"`
          : window.NL_OS === "Darwin"
            ? `rm -f "${linkPath}"`
            : `rm -rf "${linkPath}"`;
      const result = await Neutralino.os.execCommand(command, {
        background: false,
      });
      if (result.exitCode !== 0) {
        throw new Error(
          result.stdErr || `Could not remove mod link for ${mod.name}`,
        );
      }
      removed = true;
    }
    return removed;
  }

  async unlinkFromInstalledEngines(mod, engines) {
    return Promise.allSettled(
      engines.map((engine) =>
        this.unlinkFromEngine(mod, engine.id, engine.version),
      ),
    );
  }

  async cleanup(engineId, version) {
    const legacyModsPath = this.getLegacyModsPath(engineId, version);
    const bundleModsPath = await this.getEngineModsPath(engineId, version);
    const enginePaths = [bundleModsPath, legacyModsPath];
    if (engineId === "codename") {
      enginePaths.push(
        await this.getEngineAddonsPath(engineId, version),
        this.getLegacyAddonsPath(engineId, version),
      );
    }
    for (const modsPath of new Set(enginePaths)) {
      if (!(await this.api.exists(modsPath))) continue;
      try {
        const entries = await Neutralino.filesystem.readDirectory(modsPath);
        for (const entry of entries.filter(
          (item) => item.entry !== "." && item.entry !== "..",
        )) {
          const linkPath = `${modsPath}/${entry.entry}`;
          const command =
            window.NL_OS === "Windows"
              ? `cmd /c rmdir "${linkPath.replace(/\//g, "\\")}"`
              : window.NL_OS === "Darwin"
                ? `rm -f "${linkPath}"`
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
}
