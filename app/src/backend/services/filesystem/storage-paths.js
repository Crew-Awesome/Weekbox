const STORAGE_LAYOUT_VERSION = 2;
const STORAGE_MOVE_MARKER_FILE = ".weekbox-moving.json";
const LEGACY_STORAGE_MOVE_MARKER_FILE = "weekbox-moving.json";

function trimStoragePath(path) {
  return String(path || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");
}

function childPath(root, name) {
  return root ? `${root}/${name}` : name;
}

function getStoragePaths(root) {
  const basePath = trimStoragePath(root);
  const configPath = childPath(basePath, "config");
  const dataPath = childPath(basePath, "data");
  const statePath = childPath(basePath, "state");
  const runtimePath = childPath(basePath, "runtime");

  return {
    basePath,
    configPath,
    dataPath,
    statePath,
    runtimePath,
    enginesPath: childPath(basePath, "engines"),
    modsPath: childPath(basePath, "mods"),
    settingsFile: childPath(configPath, "settings.json"),
    storageManifestFile: childPath(basePath, "storage-manifest.json"),
    storageMoveMarkerFile: childPath(basePath, STORAGE_MOVE_MARKER_FILE),
    legacyStorageMoveMarkerFile: childPath(
      basePath,
      LEGACY_STORAGE_MOVE_MARKER_FILE,
    ),
    bookmarksFile: childPath(dataPath, "bookmarks.json"),
    customEnginesFile: childPath(dataPath, "custom-engines.json"),
    installedModsFile: childPath(dataPath, "installed-mods.json"),
    legacyInstalledModsFile: childPath(dataPath, "installedmods.json"),
    modCoversPath: childPath(dataPath, "mod-covers"),
    engineUpdatesFile: childPath(statePath, "engine-updates.json"),
    legacyEngineUpdatesFile: childPath(dataPath, "engineupdatestate.json"),
    deeplinkFile: childPath(runtimePath, "deeplink.json"),
    legacyDeeplinkFile: childPath(dataPath, "weekbox-deeplink.json"),
    legacySettingsFile: childPath(basePath, "settings.json"),
    legacyDataSettingsFile: childPath(dataPath, "settings.json"),
  };
}

function getStorageRootFromSettingsPath(path) {
  const normalizedPath = trimStoragePath(path);
  return /\/(?:config|data)$/i.test(normalizedPath)
    ? normalizedPath.slice(0, normalizedPath.lastIndexOf("/"))
    : normalizedPath;
}

export {
  STORAGE_LAYOUT_VERSION,
  STORAGE_MOVE_MARKER_FILE,
  LEGACY_STORAGE_MOVE_MARKER_FILE,
  getStoragePaths,
  getStorageRootFromSettingsPath,
  trimStoragePath,
};
