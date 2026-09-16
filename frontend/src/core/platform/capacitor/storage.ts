import type {
  IStorageService,
  StorageInspectionResult,
  StorageMigrationProgress,
} from "@contracts";

/**
 * Storage management and app internal paths for Mobile / Capacitor environment.
 * Relocation and folder picking are disabled in accordance with mobile sandbox constraints.
 */
export class CapacitorStorage implements IStorageService {
  private _isMigrating: boolean = false;

  isMigrationInProgress(): boolean {
    return this._isMigrating;
  }

  setMigrationInProgress(inProgress: boolean): void {
    this._isMigrating = inProgress;
  }

  async getModsPath(): Promise<string> {
    return "WeekBox/mods";
  }

  async getEnginesPath(): Promise<string> {
    return "WeekBox/engines";
  }

  async getDefaultPaths(): Promise<{
    basePath: string;
    defaultModsPath: string;
    defaultEnginesPath: string;
  }> {
    return {
      basePath: "WeekBox",
      defaultModsPath: "WeekBox/mods",
      defaultEnginesPath: "WeekBox/engines",
    };
  }

  async showFolderDialog(_title: string, _defaultPath?: string): Promise<string | null> {
    // Disabled in mobile environment
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
    // Relocation of files is not supported on mobile scoped storage
    console.info("[CapacitorStorage] Storage relocation is disabled on mobile devices.");
    return { ok: false, count: 0 };
  }
}
