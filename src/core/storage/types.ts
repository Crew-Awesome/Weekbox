export interface WeekBoxLibraryPaths {
  /** Root directory of WeekBoxLibrary */
  root: string
  /** Root settings file (WeekBoxLibrary/settings.json) */
  settings: string
  /** WeekBox v2 config directory (WeekBoxLibrary/config) */
  configDir: string
  /** WeekBox v2 settings file (WeekBoxLibrary/config/settings.json) */
  configSettings: string
  /** WeekBox v2 state directory (WeekBoxLibrary/state) */
  stateDir: string
  /** WeekBox v2 runtime directory (WeekBoxLibrary/runtime) */
  runtimeDir: string
  /** Root storage manifest (WeekBoxLibrary/storage-manifest.json) */
  storageManifest: string
  /** Directory for downloaded/installed mods (WeekBoxLibrary/mods) */
  modsDir: string
  /** Directory for game engines (Psych, V-Slice, etc.) (WeekBoxLibrary/engines) */
  enginesDir: string
  /** Core data directory (WeekBoxLibrary/data) */
  dataDir: string
  /** Directory for cached mod covers (WeekBoxLibrary/data/mod-covers) */
  modCoversDir: string
  /** Directory for cached submitter and credit avatars (WeekBoxLibrary/data/mod-avatars) */
  modAvatarsDir: string
  /** Bookmarked mods file (WeekBoxLibrary/data/bookmarks.json) */
  bookmarks: string
  /** Custom engines registry file (WeekBoxLibrary/data/custom-engines.json) */
  customEngines: string
  /** Engine update state file (WeekBoxLibrary/data/engineupdatestate.json) */
  engineUpdateState: string
  /** WeekBox v2 engine update state file (WeekBoxLibrary/state/engine-updates.json) */
  v2EngineUpdateState: string
  /** Playtime database file (WeekBoxLibrary/data/playtime.json) */
  playtimeDatabase: string
  /** Primary installed mods manifest (WeekBoxLibrary/data/installed-mods.json) */
  installedMods: string
  /** Legacy installed mods manifest mirror (WeekBoxLibrary/data/installedmods.json) */
  legacyInstalledMods: string
  /** Cached featured mods JSON from GameBanana (WeekBoxLibrary/data/featured-mods.json) */
  featuredCache: string
  /** Data settings file (WeekBoxLibrary/data/settings.json) */
  dataSettings: string
}

export interface LibraryInitializeResult {
  basePath: string
  paths: WeekBoxLibraryPaths
  createdDirectories: string[]
  existingDirectories: string[]
  createdFiles: string[]
  existingFiles: string[]
}

export interface UseWeekBoxLibraryResult {
  /** The current active base path for WeekBoxLibrary */
  libraryPath: string | null
  /** Map of all full paths inside the active library */
  paths: WeekBoxLibraryPaths | null
  /** Whether the library structure has been verified and initialized */
  isInitialized: boolean
  /** Whether the initialization or path update is currently running */
  isLoading: boolean
  /** Any error encountered during initialization */
  error: Error | null
  /** Update the library base path to a custom path or reset with null */
  setCustomLibraryPath: (newPath: string | null) => Promise<void>
  /** Force re-run verification and creation of missing files/folders */
  reinitialize: () => Promise<void>
}
