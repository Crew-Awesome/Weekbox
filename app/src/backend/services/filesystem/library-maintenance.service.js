import { ENGINE_DETAILS } from "../../config/engines.config.js";
import { isValidEngineVersion } from "./engine-version.service.js";
import { ModRepository } from "./mod-repository.service.js";
import {
  getRealEntries,
  getModFolderName,
  getEngineModFolderName,
  sanitizePathSegment,
  normalizeFolderName,
} from "./path.util.js";

function sameId(left, right) {
  return String(left) === String(right);
}

function getStableUrlId(url) {
  let hash = 5381;
  for (const char of String(url)) hash = (hash * 33) ^ char.charCodeAt(0);
  return (hash >>> 0).toString(36);
}

function getImportedPsychOnlineMetadata(folderName, downloadUrl = null) {
  const hasDownloadUrl = /^https?:\/\//i.test(String(downloadUrl || ""));
  const parsed = hasDownloadUrl ? new URL(downloadUrl) : null;
  const isPeo = parsed?.hostname.toLowerCase() === "funkin.sniro.boo";
  const sourceId = isPeo
    ? parsed.pathname.match(/^\/mod\/([^/]+)\/dl\//)?.[1]
    : null;
  return {
    id: sourceId
      ? `peo:${sourceId}`
      : `psychonline:${getStableUrlId(downloadUrl || folderName)}`,
    name: folderName,
    engineId: "psychonline",
    engineLocked: true,
    source: isPeo ? "peo" : hasDownloadUrl ? "gamebanana" : "local",
    sourceUrl: isPeo
      ? "https://funkin.sniro.boo/mods"
      : hasDownloadUrl
        ? downloadUrl
        : null,
    downloadUrl: hasDownloadUrl ? downloadUrl : null,
    coverFallback: hasDownloadUrl ? null : "psychonline",
    folderName,
  };
}

function updateLocalPsychOnlineCovers(installedMods) {
  let changed = false;
  for (const mod of installedMods) {
    if (
      mod.engineId === "psychonline" &&
      mod.source === "local" &&
      mod.coverFallback !== "psychonline"
    ) {
      mod.coverFallback = "psychonline";
      changed = true;
    }
  }
  return changed;
}

function isExistingPsychOnlineMod(installedMods, folderName) {
  return installedMods.some(
    (mod) =>
      normalizeFolderName(getModFolderName(mod)) ===
        normalizeFolderName(folderName) ||
      normalizeFolderName(getEngineModFolderName(mod)) ===
        normalizeFolderName(folderName),
  );
}

async function importPsychOnlineEntry(
  service,
  engine,
  engineModsPath,
  entry,
  installedMods,
) {
  const folderName = sanitizePathSegment(entry.entry);
  if (!folderName || isExistingPsychOnlineMod(installedMods, folderName))
    return;
  const sourcePath = `${engineModsPath}/${entry.entry}`;
  const urlPath = `${sourcePath}/mod_url.txt`;
  const downloadUrl = (await service.api.exists(urlPath))
    ? (await service.api.read(urlPath)).trim()
    : null;
  if (downloadUrl && !/^https?:\/\//i.test(downloadUrl)) return;
  const destinationPath = `${service.getModsPath()}/${folderName}`;
  if (await service.api.exists(destinationPath)) return;
  let metadata;
  try {
    metadata = getImportedPsychOnlineMetadata(folderName, downloadUrl);
  } catch {
    return;
  }
  if (installedMods.some((mod) => sameId(mod.id, metadata.id))) return;
  if (
    !(await service.api.exists(sourcePath)) ||
    (await service.api.exists(destinationPath))
  )
    return;
  if (!(await service.moveImportedPsychOnlineMod(sourcePath, destinationPath)))
    return;
  try {
    await service.injection.link(metadata, engine.id, engine.version);
  } catch (error) {
    if (!String(error?.message || error).includes("Engine folder conflict"))
      throw error;
    metadata.hidden = true;
  }
  await service.mods.add(metadata.id, metadata.name, metadata);
  installedMods.push({ ...metadata, hidden: Boolean(metadata.hidden) });
}

async function importPsychOnlineEngine(service, engine, installedMods) {
  if (service.isEngineRunning(engine.id, engine.version)) return;
  const engineModsPath = await service.getEngineModsPath(
    engine.id,
    engine.version,
  );
  let entries;
  try {
    entries = getRealEntries(
      await Neutralino.filesystem.readDirectory(engineModsPath),
    );
  } catch {
    return;
  }
  for (const entry of entries.filter((item) => item.type === "DIRECTORY")) {
    await importPsychOnlineEntry(
      service,
      engine,
      engineModsPath,
      entry,
      installedMods,
    );
  }
}

var _LibraryMaintenanceService = class _LibraryMaintenanceService {
  constructor({
    api,
    mods,
    injection,
    getEnginesPath,
    getEngineModsPath,
    getModsPath,
    getInstalledEngines,
    isEngineRunning,
    findExecutable,
  }) {
    Object.assign(this, {
      api,
      mods,
      injection,
      getEnginesPath,
      getEngineModsPath,
      getModsPath,
      getInstalledEngines,
      isEngineRunning,
      findExecutable,
    });
  }
  async cleanupHiddenModLinks(installedEngines = null) {
    const storedMods = await this.mods.getAll();
    const hiddenMods = (Array.isArray(storedMods) ? storedMods : []).filter(
      (mod) => mod.hidden,
    );
    if (!hiddenMods.length) return;
    const engines = installedEngines || (await this.getInstalledEngines());
    await Promise.all(
      hiddenMods.map((mod) =>
        this.injection.unlinkFromInstalledEngines(mod, engines),
      ),
    );
  }
  async migrateExecutableMods() {
    const storedMods = await this.mods.getAll();
    const mods = Array.isArray(storedMods) ? storedMods : [];
    const engines = await this.getInstalledEngines();
    let changed = false;
    for (const mod of mods) {
      const folderName = getModFolderName(mod);
      if (!folderName) continue;
      const executable = await this.findExecutable(
        `${this.getModsPath()}/${folderName}`,
      );
      if (!executable) continue;
      const needsMigration =
        mod.engineId !== "executable" ||
        mod.engineVersion ||
        mod.engineLocked ||
        mod.kind === "dependency" ||
        mod.kind === "addon";
      if (!needsMigration) continue;
      if (mod.engineId && mod.engineId !== "executable") {
        const unlinkResults = await this.injection.unlinkFromInstalledEngines(
          mod,
          engines,
        );
        if (unlinkResults.some((result) => result.status === "rejected"))
          continue;
      }
      mod.engineId = "executable";
      mod.engineVersion = null;
      mod.engineLocked = false;
      if (mod.kind === "dependency" || mod.kind === "addon") mod.kind = "mod";
      changed = true;
    }
    if (changed) await this.mods.saveAll(mods);
  }
  async moveImportedPsychOnlineMod(sourcePath, destinationPath) {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (!(await this.api.exists(sourcePath)))
        return await this.api.exists(destinationPath);
      if (await this.api.exists(destinationPath)) return false;
      try {
        await this.api.move(sourcePath, destinationPath);
        return true;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 250));
      }
    }
    try {
      if (await this.api.exists(destinationPath)) return false;
      await Neutralino.filesystem.copy(sourcePath, destinationPath, {
        recursive: true,
        overwrite: false,
        skip: false,
      });
      await this.api.remove(sourcePath);
      return true;
    } catch (error) {
      console.warn(
        "Could not import Psych Online mod:",
        error?.message || lastError?.message || error,
      );
      return false;
    }
  }
  async importPsychOnlineEngineMods(installedEngines = null) {
    const engines = installedEngines || (await this.getInstalledEngines());
    const storedMods = await this.mods.getAll();
    const installedMods = Array.isArray(storedMods) ? storedMods : [];
    if (updateLocalPsychOnlineCovers(installedMods))
      await this.mods.saveAll(installedMods);
    for (const engine of engines.filter((item) => item.id === "psychonline"))
      await importPsychOnlineEngine(this, engine, installedMods);
  }
  async cleanupIncompleteDownloads() {
    try {
      const cleanupTemporaryArchives = async (path) => {
        const entries = getRealEntries(
          await Neutralino.filesystem.readDirectory(path),
        );
        await Promise.all(
          entries
            .filter(
              (entry) =>
                entry.type === "FILE" &&
                /^temp_.+\.(?:zip|dmg)(?:\.part(?:-\d+)?)?$/i.test(entry.entry),
            )
            .map((entry) =>
              this.api.remove(`${path}/${entry.entry}`).catch(() => {}),
            ),
        );
      };
      const enginesPath = this.getEnginesPath();
      const modsPath = this.getModsPath();
      await cleanupTemporaryArchives(modsPath);
      const modFolders = getRealEntries(
        await Neutralino.filesystem.readDirectory(modsPath),
      );
      await Promise.all(
        modFolders
          .filter(
            (entry) =>
              entry.type === "DIRECTORY" &&
              !entry.entry.startsWith(".extract_"),
          )
          .map(async (entry) => {
            const modPath = `${modsPath}/${entry.entry}`;
            if (await this.api.exists(`${modPath}/.downloading`)) {
              await this.api.remove(modPath);
            }
          }),
      );
      await cleanupTemporaryArchives(enginesPath);
      const engines = await Neutralino.filesystem.readDirectory(enginesPath);
      for (const engine of getRealEntries(engines)) {
        if (engine.type !== "DIRECTORY") continue;
        const versions = await Neutralino.filesystem.readDirectory(
          `${enginesPath}/${engine.entry}`,
        );
        for (const version of getRealEntries(versions)) {
          if (version.type !== "DIRECTORY") continue;
          const versionPath = `${enginesPath}/${engine.entry}/${version.entry}`;
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
  async cleanupInvalidEngineInstallations() {
    try {
      const enginesPath = this.getEnginesPath();
      const engineRoots = getRealEntries(
        await Neutralino.filesystem.readDirectory(enginesPath),
      );
      for (const engineRoot of engineRoots) {
        if (engineRoot.type !== "DIRECTORY") continue;
        const rootPath = `${enginesPath}/${engineRoot.entry}`;
        if (!ENGINE_DETAILS[engineRoot.entry]) {
          await this.api.remove(rootPath);
          continue;
        }
        let hasValidInstallation = false;
        const versions = getRealEntries(
          await Neutralino.filesystem.readDirectory(rootPath),
        );
        for (const version of versions) {
          if (version.type !== "DIRECTORY") continue;
          const versionPath = `${rootPath}/${version.entry}`;
          const isInstalled =
            isValidEngineVersion(version.entry) &&
            (engineRoot.entry !== "psychonline" ||
              version.entry === "Latest") &&
            !(await this.api.exists(`${versionPath}/.downloading`)) &&
            Boolean(await this.findExecutable(versionPath));
          if (isInstalled) {
            hasValidInstallation = true;
            continue;
          }
          await this.api.remove(versionPath);
        }
        if (!hasValidInstallation) await this.api.remove(rootPath);
      }
    } catch (error) {
      console.warn("Could not clean up invalid engine installations", error);
    }
  }
  async hasModFiles(mod) {
    const folderName = getModFolderName(mod);
    if (!folderName || /[\\/]/.test(folderName)) return false;
    const hasFilesIn = async (path) => {
      const entries = getRealEntries(
        await Neutralino.filesystem.readDirectory(path),
      );
      for (const entry of entries) {
        if (entry.entry === ".downloading") continue;
        if (entry.type === "FILE") return true;
        if (
          entry.type === "DIRECTORY" &&
          (await hasFilesIn(`${path}/${entry.entry}`))
        )
          return true;
      }
      return false;
    };
    try {
      return await hasFilesIn(`${this.getModsPath()}/${folderName}`);
    } catch {
      return false;
    }
  }
  async cleanupInvalidInstalledMods() {
    for (const mod of await this.mods.getAll()) {
      if (await this.hasModFiles(mod)) continue;
      const folderName = getModFolderName(mod);
      if (folderName && !/[\\/]/.test(folderName)) {
        await this.api
          .remove(`${this.getModsPath()}/${folderName}`)
          .catch(() => {});
      }
      await this.mods.remove(mod.id);
    }
  }
};

var LibraryMaintenanceService = _LibraryMaintenanceService;

export { LibraryMaintenanceService };
