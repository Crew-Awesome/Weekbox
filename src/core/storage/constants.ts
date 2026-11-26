/**
 * Default folder name for the WeekBox storage library.
 */
export const WEEKBOX_LIBRARY_DIR_NAME = 'WeekBoxLibrary'

/**
 * LocalStorage key used to persist a user-selected custom library path.
 */
export const WEEKBOX_CUSTOM_PATH_STORAGE_KEY = 'wbr:custom_library_path'

/**
 * Structural definition of WeekBoxLibrary directories and relative file paths.
 * Provided as a utility variable for the rest of the application.
 */
export const WEEKBOX_LIBRARY_STRUCTURE = {
  root: '',
  settings: 'settings.json',
  config: 'config',
  configSettings: 'config/settings.json',
  state: 'state',
  runtime: 'runtime',
  storageManifest: 'storage-manifest.json',
  mods: 'mods',
  engines: 'engines',
  data: 'data',
  modCovers: 'data/mod-covers',
  modAvatars: 'data/mod-avatars',
  bookmarks: 'data/bookmarks.json',
  customEngines: 'data/custom-engines.json',
  engineUpdateState: 'data/engineupdatestate.json',
  v2EngineUpdateState: 'state/engine-updates.json',
  playtime: 'data/playtime.json',
  installedMods: 'data/installed-mods.json',
  legacyInstalledMods: 'data/installedmods.json',
  dataSettings: 'data/settings.json',
} as const

/**
 * Relative directories to create in hierarchical order.
 */
export const DEFAULT_LIBRARY_DIRECTORIES: readonly string[] = [
  '',
  'config',
  'state',
  'runtime',
  'mods',
  'engines',
  'data',
  'data/mod-covers',
  'data/mod-avatars',
] as const

/**
 * Default initial contents for all library JSON files.
 * These are only created if the files do not already exist.
 */
export const DEFAULT_LIBRARY_FILE_CONTENTS: Record<string, unknown> = {
  'settings.json': {
    version: '1.0.0',
    theme: 'system',
    language: 'en',
    uiScale: 100,
    uiStyle: 'default',
    setupCompleted: false,
    autoUpdate: true,
    registerProtocolLinks: true,
  },
  'storage-manifest.json': {
    version: 2,
    name: 'WeekBoxLibrary',
    createdAt: new Date().toISOString(),
    directories: ['config', 'state', 'runtime', 'mods', 'engines', 'data'],
  },
  'data/bookmarks.json': [],
  'data/engineupdatestate.json': {
    lastChecked: null,
    engines: {},
  },
  'data/playtime.json': {
    schemaVersion: 1,
    lastUpdated: Date.now(),
    totalSecondsAllEngines: 0,
    engines: {},
    days: {},
    sessions: [],
  },
  'data/settings.json': {
    version: '1.0.0',
    installedAt: new Date().toISOString(),
  },
}
