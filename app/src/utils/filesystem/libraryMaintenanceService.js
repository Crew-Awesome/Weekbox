import {
  getModFolderName,
  getRealEntries,
  sanitizePathSegment,
} from "./pathUtils.js";
import { ENGINE_DETAILS } from "../../config/engines.js";
import { isValidEngineVersion } from "./engineVersion.js";

function sameId(left, right) {
  return String(left) === String(right);
}

function getStableUrlId(url) {
  let hash = 5381;
  for (const char of String(url)) hash = (hash * 33) ^ char.charCodeAt(0);
  return (hash >>> 0).toString(36);
}

function getImportedPsychOnlineMetadata(folderName, downloadUrl) {
  const parsed = new URL(downloadUrl);
  const isSniro = parsed.hostname.toLowerCase() === "funkin.sniro.boo";
  const sourceId = isSniro
    ? parsed.pathname.match(/^\/mod\/([^/]+)\/dl\//)?.[1]
    : null;
  return {
    id: sourceId
      ? `sniro:${sourceId}`
      : `psychonline:${getStableUrlId(downloadUrl)}`,
    name: folderName,
    engineId: "psychonline",
    engineLocked: true,
    source: isSniro ? "sniro" : "gamebanana",
    sourceUrl: isSniro ? "https://funkin.sniro.boo/mods" : downloadUrl,
    downloadUrl,
    folderName,
  };
}

export class LibraryMaintenanceService {
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
    const hiddenMods = (await this.mods.getAll()).filter((mod) => mod.hidden);
    if (!hiddenMods.length) return;
    const engines = installedEngines || (await this.getInstalledEngines());
    await Promise.all(
      hiddenMods.map((mod) =>
        this.injection.unlinkFromInstalledEngines(mod, engines),
      ),
    );
  }

  async importPsychOnlineEngineMods(installedEngines = null) {
    const engines = installedEngines || (await this.getInstalledEngines());
    const installedMods = await this.mods.getAll();
    for (const engine of engines.filter((item) => item.id === "psychonline")) {
      if (this.isEngineRunning(engine.id, engine.version)) continue;
      const engineModsPath = await this.getEngineModsPath(
        engine.id,
        engine.version,
      );
      let entries;
      try {
        entries = getRealEntries(
          await Neutralino.filesystem.readDirectory(engineModsPath),
        );
      } catch {
        continue;
      }
      for (const entry of entries.filter((item) => item.type === "DIRECTORY")) {
        const folderName = sanitizePathSegment(entry.entry);
        if (!folderName) continue;
        const existing = installedMods.find(
          (mod) => getModFolderName(mod) === folderName,
        );
        if (existing) {
          if (!existing.hidden)
            await this.injection.link(existing, engine.id, engine.version);
          continue;
        }
        const sourcePath = `${engineModsPath}/${entry.entry}`;
        const urlPath = `${sourcePath}/mod_url.txt`;
        if (!(await this.api.exists(urlPath))) continue;
        const downloadUrl = (await this.api.read(urlPath)).trim();
        if (!/^https?:\/\//i.test(downloadUrl)) continue;
        const destinationPath = `${this.getModsPath()}/${folderName}`;
        if (await this.api.exists(destinationPath)) continue;
        let metadata;
        try {
          metadata = getImportedPsychOnlineMetadata(folderName, downloadUrl);
        } catch {
          continue;
        }
        if (installedMods.some((mod) => sameId(mod.id, metadata.id))) continue;
        await Neutralino.filesystem.move(sourcePath, destinationPath);
        await this.mods.add(metadata.id, metadata.name, metadata);
        installedMods.push({ ...metadata, hidden: false });
        await this.injection.link(metadata, engine.id, engine.version);
      }
    }
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
                /^temp_.+\.(?:zip|dmg)(?:\.part-\d+)?$/i.test(entry.entry),
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
          .filter((entry) => entry.type === "DIRECTORY")
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
}
