import type {
  IStorageService,
  StorageInspectionResult,
  StorageMigrationProgress,
} from "@contracts";

/**
 * Storage management and virtual paths for Web environment.
 */
export class WebStorage implements IStorageService {
  private _isMigrating: boolean = false;

  isMigrationInProgress(): boolean {
    return this._isMigrating;
  }

  setMigrationInProgress(inProgress: boolean): void {
    this._isMigrating = inProgress;
  }

  async getModsPath(): Promise<string> {
    return "/virtual/mods";
  }

  async getEnginesPath(): Promise<string> {
    return "/virtual/engines";
  }

  async getDefaultPaths(): Promise<{ basePath: string; defaultModsPath: string; defaultEnginesPath: string }> {
    return {
      basePath: "/virtual",
      defaultModsPath: "/virtual/mods",
      defaultEnginesPath: "/virtual/engines",
    };
  }

  async showFolderDialog(_title: string, _defaultPath?: string): Promise<string | null> {
    return null;
  }

  async validateStorageFolder(
    _targetPath: string,
    _type: "mods" | "engines"
  ): Promise<{ valid: boolean; reason?: string }> {
    return { valid: true };
  }

  async inspectStorage(_folderPath: string): Promise<StorageInspectionResult> {
    return { count: 0, totalBytes: 0, formattedSize: "0 B", estimatedTime: "< 1s", items: [] };
  }

  async migrateStorage(
    _sourcePath: string,
    _targetPath: string,
    _type: "mods" | "engines",
    _onProgress?: (progress: StorageMigrationProgress) => void,
    _selectedItemNames?: string[]
  ): Promise<{ ok: boolean; count: number }> {
    return { ok: true, count: 0 };
  }
}
