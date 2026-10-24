export interface WeekBoxLibraryPaths {
  /** Root directory of WeekBoxLibrary */
  root: string
  /** Root settings file (WeekBoxLibrary/settings.json) */
  settings: string
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
  /** Bookmarked mods file (WeekBoxLibrary/data/bookmarks.json) */
  bookmarks: string
  /** Engine update state file (WeekBoxLibrary/data/engineupdatestate.json) */
  engineUpdateState: string
  /** Installed mods manifest (WeekBoxLibrary/data/installedmods.json) */
  installedMods: string
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
