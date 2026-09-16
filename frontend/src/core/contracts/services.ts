/**
 * Progress details for file transfer operations.
 */
export interface DownloadProgressDetails {
  downloaded?: number;
  total?: number;
  currentFile?: string;
}

export const DownloadStatus = {
  STARTING: "Starting download...",
  DOWNLOADING: "Downloading...",
  EXTRACTING: "Extracting archive...",
  FLATTENING: "Flattening folder structure...",
  FINALIZING: "Registering mod...",
  COMPLETED: "Completed",
  CANCELING: "Canceling...",
} as const;

export type DownloadStatusType = typeof DownloadStatus[keyof typeof DownloadStatus] | string;

export type DownloadProgressCallback = (
  progress: number,
  statusText?: string,
  details?: DownloadProgressDetails
) => void;

/**
 * Contract for Mod installation, removal, query, and registry management (ISP).
 */
export interface IModService {
  /** Downloads and extracts a mod archive into the mods directory. */
  downloadMod(
    url: string,
    modId?: string,
    modName?: string,
    onProgress?: DownloadProgressCallback,
    signal?: AbortSignal
  ): Promise<void>;

  /** Registers a mod entry in the installed mods registry. */
  registerInstalledMod(modData: any): Promise<void>;

  /** Checks if a mod is registered as installed. */
  isModInstalled(modId: string): Promise<boolean>;

  /** Retrieves metadata for an installed mod by ID. */
  getInstalledMod(modId: string): Promise<any | null>;

  /** Retrieves the full list of installed mods. */
  getInstalledMods(): Promise<any[]>;

  /** Uninstalls a mod and purges its directory. */
  uninstallMod(modId: string): Promise<void>;

  /** Opens the mod folder in the native file manager (if supported). */
  openModFolder(modId: string, modName?: string): Promise<void>;

  /** Marks a mod as favorite in the registry. */
  setModFavorite(modId: string, isFavorite: boolean): Promise<void>;

  /** Updates mod metadata entries in the registry. */
  updateInstalledMod(modId: string, updates: Record<string, any>): Promise<any | null>;

  /** Remaps installation paths for mods following a storage relocation. */
  remapInstalledModPaths(targetPath: string, selectedItemNames?: string[]): Promise<void>;
}

/**
 * Contract for Engine downloads, installations, and version management (ISP).
 */
export interface IEngineService {
  /** Downloads and extracts an engine version archive. */
  downloadEngine(
    url: string,
    engineId: string,
    version: string,
    onProgress?: DownloadProgressCallback,
    signal?: AbortSignal
  ): Promise<void>;

  /** Checks if an engine version is already installed on disk. */
  isEngineInstalled(engineId: string, version: string): Promise<boolean>;

  /** Opens the engine folder in the native file manager. */
  openEngineFolder(engineId: string, version: string): Promise<void>;

  /** Retrieves the registry of all installed engines and their versions. */
  getInstalledEngines(): Promise<Record<string, Record<string, any>>>;

  /** Registers an installed engine release in the registry. */
  registerInstalledEngine(
    engineId: string,
    version: string,
    metadata?: Record<string, any>
  ): Promise<void>;

  /** Uninstalls an engine version and purges its directory. */
  uninstallEngine(engineId: string, version: string): Promise<void>;

  /** Cleans up temporary or partial files after a cancelled or failed engine download. */
  cleanupTempDownload(engineId: string, version: string): Promise<void>;
}

/** Options for launching a game executable process */
export interface LaunchExecutableOptions {
  executableName?: string;
  instanceId?: string;
  args?: string[];
  env?: Record<string, string>;
  modFolderPath?: string;
  modFolderPaths?: string[];
}

/** Result of launching an executable process */
export interface ProcessLaunchResult {
  ok: boolean;
  pid?: number;
  executablePath?: string;
  instanceId?: string;
  error?: string;
}

/**
 * Contract for process lifecycle management (ISP).
 */
export interface IProcessLauncher {
  /** Launches an executable instance. */
  launchExecutable(
    folderPath: string,
    options?: LaunchExecutableOptions
  ): Promise<ProcessLaunchResult>;

  /** Terminates an active process by instance ID. */
  killProcess(instanceId: string): Promise<{ ok: boolean; error?: string }>;

  /** Checks whether any game processes are currently active. */
  isAnyProcessRunning(): Promise<boolean>;

  /** Checks whether a specific instance is running. */
  isInstanceRunning(instanceId: string): Promise<boolean>;
}

/** Result of storage inspection */
export interface StorageInspectionResult {
  count: number;
  totalBytes: number;
  formattedSize: string;
  estimatedTime: string;
  items?: Array<{ name: string; bytes: number; formattedSize: string }>;
}

/** Storage migration progress event */
export interface StorageMigrationProgress {
  currentItem: string;
  currentIndex: number;
  totalItems: number;
  percent: number;
  remainingItems: number;
}

/**
 * Contract for storage path management, folder picking, and migrations (ISP).
 */
export interface IStorageService {
  /** Opens native folder picker dialog. */
  showFolderDialog(title: string, defaultPath?: string): Promise<string | null>;

  /** Resolves the configured mods directory path. */
  getModsPath(): Promise<string>;

  /** Resolves the configured engines directory path. */
  getEnginesPath(): Promise<string>;

  /** Resolves standard default paths. */
  getDefaultPaths(): Promise<{ basePath: string; defaultModsPath: string; defaultEnginesPath: string }>;

  /** Validates whether a target directory is safe for storage. */
  validateStorageFolder(
    targetPath: string,
    type: "mods" | "engines"
  ): Promise<{ valid: boolean; reason?: string }>;

  /** Calculates total size and item counts for a folder. */
  inspectStorage(folderPath: string): Promise<StorageInspectionResult>;

  /** Migrates folder items to a new target path. */
  migrateStorage(
    sourcePath: string,
    targetPath: string,
    type: "mods" | "engines",
    onProgress?: (progress: StorageMigrationProgress) => void,
    selectedItemNames?: string[]
  ): Promise<{ ok: boolean; count: number }>;

  /** Checks if a storage migration is actively taking place (DIP: no store dependency). */
  isMigrationInProgress(): boolean;

  /** Updates the active migration state lock. */
  setMigrationInProgress(inProgress: boolean): void;
}

/**
 * Contract for user preferences and settings persistence (ISP).
 */
export interface ISettingsService {
  /** Retrieves stored user settings. */
  getSettings(): Promise<Record<string, any>>;

  /** Persists user settings. */
  saveSettings(settings: Record<string, any>): Promise<void>;
}

/**
 * Contract for application window management (ISP).
 */
export interface IWindowService {
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  unmaximize(): Promise<void>;
  unminimize(): Promise<void>;
  setAlwaysOnTop(onTop: boolean): Promise<void>;
  bringToFront(): Promise<void>;
  setFullScreen(): Promise<void>;
  exitFullScreen(): Promise<void>;
  show(): Promise<void>;
  hide(): Promise<void>;
  focus(): Promise<void>;
  move(x: number, y: number): Promise<void>;
  setSize(width: number, height: number): Promise<void>;
  getSize(): Promise<{ width: number; height: number }>;
  getPosition(): Promise<{ x: number; y: number }>;
  getDisplays(): Promise<any[]>;
  close(): Promise<void>;
  center(): Promise<void>;
}

/**
 * Options for OS-level notifications.
 */
export interface SystemNotificationOptions {
  title: string;
  content: string;
  icon?: "INFO" | "WARNING" | "ERROR";
}

/**
 * Result of dispatching a system notification.
 */
export interface NotificationResult {
  ok: boolean;
  method?: string;
  error?: string;
}

/**
 * Contract for system notification dispatching (ISP).
 */
export interface INotificationService {
  showNotification(options: SystemNotificationOptions): Promise<NotificationResult>;
}

/**
 * Contract for tracking active tasks (downloads, games, migrations) across layers (DIP).
 */
export interface ITaskMonitor {
  registerActiveTaskChecker(checker: () => boolean): () => void;
  hasActiveTasks(): boolean;
}
