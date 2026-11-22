import {
  getRealEntries,
  sanitizePathSegment,
  pathsOverlap,
  normalizeComparablePath,
  trimPath,
} from "./path.util.js";
import { ENGINE_DETAILS } from "../../config/engines.config.js";

export class CustomEngineService {
  constructor(dependencies) {
    Object.assign(this, dependencies);
  }

  async inspect(sourcePath) {
    const normalizedSource = trimPath(sourcePath);
    if (!normalizedSource) throw new Error("Choose an engine folder first");
    const stats = await Neutralino.filesystem.getStats(normalizedSource);
    if (!stats?.isDirectory)
      throw new Error("The selected path is not a folder");
    const executables = await this.executables.findAll(normalizedSource);
    const executable = executables[0];
    if (!executable) {
      const detail = this.executables.getLastError();
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
    const entries = getRealEntries(await this.readDirectory(normalizedSource));
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

  async import({
    sourcePath,
    engineId = null,
    name,
    version = "Local",
    executable,
    contentFolders = [],
    allowLibrarySource = false,
  }) {
    this.assertStorageUnlocked();
    if (!this.isInitialized()) throw new Error("WeekBox storage is not ready");
    const source = trimPath(sourcePath);
    if (!source) throw new Error("Choose an engine folder first");
    this.assertSourceAllowed(source, allowLibrarySource);
    const details = await this.inspect(source);
    const normalizedVersion = sanitizePathSegment(version) || "Local";
    const resolvedId = engineId || `custom-${crypto.randomUUID()}`;
    const { engine, details: importDetails } = await this.prepareFamily({
      source,
      engineId: resolvedId,
      name,
      executable,
      details,
    });
    const existing = await this.removeMissingVersion(engine, normalizedVersion);
    if (existing)
      throw new Error(`Version ${normalizedVersion} is already imported.`);
    const install = await this.copyInstall({
      source,
      resolvedId,
      version: normalizedVersion,
      executable,
      details: { ...importDetails, contentFolders },
    });
    engine.versions.push({ version: normalizedVersion, ...install });
    await this.customEngines.upsert(engine);
    return { id: resolvedId, version: normalizedVersion };
  }

  async prepareFamily({ source, engineId, name, executable, details }) {
    const normalizedName = String(name || details.name).trim();
    const existingEngine = this.customEngines.get(engineId);
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
      id: engineId,
      name: normalizedName,
      icon: detectedIcon || "exe.png",
      createdAt: new Date().toISOString(),
      versions: [],
    };
    if (!existingEngine) engine.name = normalizedName || engine.name;
    if (existingEngine && detectedIcon) engine.icon = detectedIcon;
    return { engine, details };
  }

  assertSourceAllowed(source, allowLibrarySource) {
    const modsPath = this.getModsPath();
    const isLibraryModSource =
      pathsOverlap(source, modsPath) &&
      normalizeComparablePath(source) !== normalizeComparablePath(modsPath);
    if (
      pathsOverlap(source, this.getBasePath()) &&
      (!allowLibrarySource || !isLibraryModSource)
    )
      throw new Error("Choose an engine folder outside your WeekBox library.");
  }

  async copyInstall({ source, resolvedId, version, executable, details }) {
    const installId = `${version}-${crypto.randomUUID().slice(0, 8)}`;
    const enginesPath = this.getEnginesPath();
    const stagingPath = `${enginesPath}/.custom-install-${crypto.randomUUID()}`;
    const destinationPath = `${enginesPath}/${resolvedId}/${installId}`;
    try {
      await this.api.ensureDir(`${enginesPath}/${resolvedId}`);
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
        requestedExecutable && (await this.api.exists(requestedExecutablePath))
          ? requestedExecutablePath
          : await this.findExecutable(stagingPath);
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
      await this.api.write(
        `${stagingPath}/engine.json`,
        `${JSON.stringify(manifest, null, 2)}\n`,
      );
      await this.api.move(stagingPath, destinationPath);
      return {
        installId,
        executable: executableRelative,
        modDirectories: manifest.modDirectories,
        sourceName: manifest.sourceName,
      };
    } catch (error) {
      await this.api.remove(stagingPath).catch(() => {});
      await this.api.remove(destinationPath).catch(() => {});
      throw error;
    }
  }

  async removeMissingVersion(engine, version) {
    const existing = engine.versions.find(
      (candidate) => candidate.version === version,
    );
    if (!existing) return null;
    const installPath = `${this.getEnginesPath()}/${engine.id}/${existing.installId}`;
    if (await this.api.exists(installPath)) return existing;
    engine.versions = engine.versions.filter(
      (candidate) => candidate !== existing,
    );
    await this.customEngines.upsert(engine);
    return null;
  }

  async update(engineId, { name, icon } = {}) {
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

  async remove(engineId) {
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
    const familyPath = `${this.getEnginesPath()}/${engineId}`;
    if (await this.api.exists(familyPath)) await this.api.remove(familyPath);
    await this.customEngines.remove(engineId);
    return true;
  }

  async importMods(engineId, version) {
    this.assertStorageUnlocked();
    if (!this.isInitialized()) throw new Error("WeekBox storage is not ready");
    const customEngine = this.customEngines.get(engineId);
    const install = this.getEngineInstall(engineId, version);
    if (!customEngine || !install) throw new Error("Custom engine not found");
    const imported = [];
    const existingMods = await this.mods.getAll();
    for (const directory of install.modDirectories || []) {
      if (directory.enabled === false) continue;
      const sourceDirectory = `${install.path}/${directory.path}`;
      if (!(await this.api.exists(sourceDirectory))) continue;
      let sourceEntries;
      try {
        sourceEntries = await this.readDirectory(sourceDirectory);
      } catch (error) {
        throw new Error(
          `Could not read custom engine content at ${sourceDirectory}: ${error?.message || error}`,
          { cause: error },
        );
      }
      const entries = getRealEntries(sourceEntries);
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
            await this.removeModFiles(sourceMatch, sourceMatch.folderName);
            legacyMatch.engineVersion = version;
            legacyMatch.sourceEngineId = engineId;
            legacyMatch.sourceEngineVersion = version;
            legacyMatch.sourceEngineFolder = sourceEngineFolder;
            existingMods.splice(existingMods.indexOf(sourceMatch), 1);
            await this.mods.saveAll(existingMods);
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
          await this.mods.saveAll(existingMods);
          continue;
        }
        const folderName = await this.getAvailableLocalModFolderName(name);
        const modId = `local-${crypto.randomUUID()}`;
        const destinationPath = `${this.getModsPath()}/${folderName}`;
        try {
          await Neutralino.filesystem.copy(
            `${sourceDirectory}/${entry.entry}`,
            destinationPath,
            { recursive: true, overwrite: false, skip: false },
          );
          const kind = ["addon", "dependency"].includes(directory.type)
            ? directory.type
            : null;
          await this.saveInstalledMod(modId, name, {
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
          await this.api.remove(destinationPath).catch(() => {});
          throw error;
        }
      }
    }
    const engines = await this.getInstalledEngines();
    await Promise.all(
      imported.map((modId) =>
        this.injection.injectIntoInstalledEngines(modId, engines),
      ),
    );
    return imported;
  }
}
