import { ENGINE_DETAILS } from '../../config/engines.config.js';
import { isValidEngineVersion } from './engine-version.service.js';
import { ModRepository } from './mod-repository.service.js';
import { getRealEntries, getModFolderName, getEngineModFolderName, sanitizePathSegment, normalizeFolderName } from './path.util.js';

function sameId(left, right) {
  return String(left) === String(right);
}

function getStableUrlId(url) {
  let hash = 5381;
  for (const char of String(url)) hash = hash * 33 ^ char.charCodeAt(0);
  return (hash >>> 0).toString(36);
}

function getImportedPsychOnlineMetadata(folderName, downloadUrl = null) {
  const hasDownloadUrl = /^https?:\/\//i.test(String(downloadUrl || ""));
  const parsed = hasDownloadUrl ? new URL(downloadUrl) : null;
  const isPeo = parsed?.hostname.toLowerCase() === "funkin.sniro.boo";
  const sourceId = isPeo ? parsed.pathname.match(/^\/mod\/([^/]+)\/dl\//)?.[1] : null;
  return {
    id: sourceId ? `peo:${sourceId}` : `psychonline:${getStableUrlId(downloadUrl || folderName)}`,
    name: folderName,
    engineId: "psychonline",
    engineLocked: true,
    source: isPeo ? "peo" : hasDownloadUrl ? "gamebanana" : "local",
    sourceUrl: isPeo ? "https://funkin.sniro.boo/mods" : hasDownloadUrl ? downloadUrl : null,
    downloadUrl: hasDownloadUrl ? downloadUrl : null,
    coverFallback: hasDownloadUrl ? null : "psychonline",
    folderName
  };
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
    findExecutable
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
      findExecutable
    });
  }
  async cleanupHiddenModLinks(installedEngines = null) {
    const storedMods = await this.mods.getAll();
    const hiddenMods = (Array.isArray(storedMods) ? storedMods : []).filter((mod) => mod.hidden);
    if (!hiddenMods.length) return;
    const engines = installedEngines || await this.getInstalledEngines();
    await Promise.all(
      hiddenMods.map(
        (mod) => this.injection.unlinkFromInstalledEngines(mod, engines)
      )
    );
  }
  async moveImportedPsychOnlineMod(sourcePath, destinationPath) {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (!await this.api.exists(sourcePath)) return await this.api.exists(destinationPath);
      if (await this.api.exists(destinationPath)) return false;
      try {
        await Neutralino.filesystem.move(sourcePath, destinationPath);
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
        skip: false
      });
      await this.api.remove(sourcePath);
      return true;
    } catch (error) {
      console.warn("Could not import Psych Online mod:", error?.message || lastError?.message || error);
      return false;
    }
  }
  async importPsychOnlineEngineMods(installedEngines = null) {
    const engines = installedEngines || await this.getInstalledEngines();
    const storedMods = await this.mods.getAll();
    const installedMods = Array.isArray(storedMods) ? storedMods : [];
    let updatedLocalCovers = false;
    for (const mod of installedMods) {
      if (mod.engineId === "psychonline" && mod.source === "local" && mod.coverFallback !== "psychonline") {
        mod.coverFallback = "psychonline";
        updatedLocalCovers = true;
      }
    }
    if (updatedLocalCovers) await this.mods.saveAll(installedMods);
    for (const engine of engines.filter((item) => item.id === "psychonline")) {
      if (this.isEngineRunning(engine.id, engine.version)) continue;
      const engineModsPath = await this.getEngineModsPath(
        engine.id,
        engine.version
      );
      let entries;
      try {
        entries = getRealEntries(
          await Neutralino.filesystem.readDirectory(engineModsPath)
        );
      } catch {
        continue;
      }
      for (const entry of entries.filter((item) => item.type === "DIRECTORY")) {
        const folderName = sanitizePathSegment(entry.entry);
        if (!folderName) continue;
        // An installed mod can keep its library folder under one name while
        // using a different folder name inside Psych Online.  Treat either
        // name as the same existing entry; otherwise re-importing its link
        // turns into an engine-folder conflict during startup.
        const existing = installedMods.find(
          (mod) => normalizeFolderName(getModFolderName(mod)) === normalizeFolderName(folderName) || normalizeFolderName(getEngineModFolderName(mod)) === normalizeFolderName(folderName)
        );
        if (existing) {
          // The folder is already present in the Psych Online installation.
          // It may belong to a different installed mod that uses the same
          // engine folder name, so attempting to link it again can turn a
          // recoverable duplicate into a startup-blocking conflict.
          continue;
        }
        const sourcePath = `${engineModsPath}/${entry.entry}`;
        const urlPath = `${sourcePath}/mod_url.txt`;
        const downloadUrl = await this.api.exists(urlPath)
          ? (await this.api.read(urlPath)).trim()
          : null;
        if (downloadUrl && !/^https?:\/\//i.test(downloadUrl)) continue;
        const destinationPath = `${this.getModsPath()}/${folderName}`;
        if (await this.api.exists(destinationPath)) continue;
        let metadata;
        try {
          metadata = getImportedPsychOnlineMetadata(folderName, downloadUrl);
        } catch {
          continue;
        }
        if (installedMods.some((mod) => sameId(mod.id, metadata.id))) continue;
        if (!await this.api.exists(sourcePath) || await this.api.exists(destinationPath)) continue;
        const moved = await this.moveImportedPsychOnlineMod(sourcePath, destinationPath);
        if (!moved) continue;
        try {
          await this.injection.link(metadata, engine.id, engine.version);
        } catch (error) {
          if (!String(error?.message || error).includes("Engine folder conflict")) throw error;
          // A locally discovered optional Psych Online mod must not prevent
          // WeekBox from starting. Keep it in the library, hidden, so the
          // user can resolve the conflict later without losing its files.
          metadata.hidden = true;
        }
        await this.mods.add(metadata.id, metadata.name, metadata);
        installedMods.push({ ...metadata, hidden: Boolean(metadata.hidden) });
      }
    }
  }
  async cleanupIncompleteDownloads() {
    try {
      const cleanupTemporaryArchives = async (path) => {
        const entries = getRealEntries(
          await Neutralino.filesystem.readDirectory(path)
        );
        await Promise.all(
          entries.filter(
            (entry) => entry.type === "FILE" && /^temp_.+\.(?:zip|dmg)(?:\.part(?:-\d+)?)?$/i.test(entry.entry)
          ).map(
            (entry) => this.api.remove(`${path}/${entry.entry}`).catch(() => {
            })
          )
        );
      };
      const enginesPath = this.getEnginesPath();
      const modsPath = this.getModsPath();
      await cleanupTemporaryArchives(modsPath);
      const modFolders = getRealEntries(
        await Neutralino.filesystem.readDirectory(modsPath)
      );
      await Promise.all(
        modFolders.filter((entry) => entry.type === "DIRECTORY" && !entry.entry.startsWith(".extract_")).map(async (entry) => {
          const modPath = `${modsPath}/${entry.entry}`;
          if (await this.api.exists(`${modPath}/.downloading`)) {
            await this.api.remove(modPath);
          }
        })
      );
      await cleanupTemporaryArchives(enginesPath);
      const engines = await Neutralino.filesystem.readDirectory(enginesPath);
      for (const engine of getRealEntries(engines)) {
        if (engine.type !== "DIRECTORY") continue;
        const versions = await Neutralino.filesystem.readDirectory(
          `${enginesPath}/${engine.entry}`
        );
        for (const version of getRealEntries(versions)) {
          if (version.type !== "DIRECTORY") continue;
          const versionPath = `${enginesPath}/${engine.entry}/${version.entry}`;
          if (!await this.api.exists(`${versionPath}/.downloading`)) continue;
          const command = window.NL_OS === "Windows" ? `rmdir /S /Q "${versionPath.replace(/\//g, "\\")}"` : `rm -rf "${versionPath}"`;
          await Neutralino.os.execCommand(command, { background: true }).catch(() => {
          });
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
        await Neutralino.filesystem.readDirectory(enginesPath)
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
          await Neutralino.filesystem.readDirectory(rootPath)
        );
        for (const version of versions) {
          if (version.type !== "DIRECTORY") continue;
          const versionPath = `${rootPath}/${version.entry}`;
          const isInstalled = isValidEngineVersion(version.entry) && (engineRoot.entry !== "psychonline" || version.entry === "Latest") && !await this.api.exists(`${versionPath}/.downloading`) && Boolean(await this.findExecutable(versionPath));
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
        await Neutralino.filesystem.readDirectory(path)
      );
      for (const entry of entries) {
        if (entry.entry === ".downloading") continue;
        if (entry.type === "FILE") return true;
        if (entry.type === "DIRECTORY" && await hasFilesIn(`${path}/${entry.entry}`))
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
        await this.api.remove(`${this.getModsPath()}/${folderName}`).catch(() => {
        });
      }
      await this.mods.remove(mod.id);
    }
  }
};

var LibraryMaintenanceService = _LibraryMaintenanceService;

export { LibraryMaintenanceService };
