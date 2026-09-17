import type {
  IStorageService,
  StorageInspectionResult,
  StorageMigrationProgress,
} from "@contracts";
import { platform } from "@platform";

/**
 * Domain service managing storage paths, directory selection, and migrations (SRP / OCP).
 */
export class StorageService implements IStorageService {
  private readonly provider: IStorageService;

  constructor(provider?: IStorageService) {
    this.provider = provider || platform.storage;
  }

  async showFolderDialog(title: string, defaultPath?: string): Promise<string | null> {
    return this.provider.showFolderDialog(title, defaultPath);
  }

  async getModsPath(): Promise<string> {
    return this.provider.getModsPath();
  }

  async getEnginesPath(): Promise<string> {
    return this.provider.getEnginesPath();
  }

  async getDefaultPaths(): Promise<{ basePath: string; defaultModsPath: string; defaultEnginesPath: string }> {
    return this.provider.getDefaultPaths();
  }

  async validateStorageFolder(
    targetPath: string,
    type: "mods" | "engines"
  ): Promise<{ valid: boolean; reason?: string }> {
    return this.provider.validateStorageFolder(targetPath, type);
  }

  async inspectStorage(folderPath: string): Promise<StorageInspectionResult> {
    return this.provider.inspectStorage(folderPath);
  }

  async migrateStorage(
    sourcePath: string,
    targetPath: string,
    type: "mods" | "engines",
    onProgress?: (progress: StorageMigrationProgress) => void,
    selectedItemNames?: string[]
  ): Promise<{ ok: boolean; count: number }> {
    return this.provider.migrateStorage(sourcePath, targetPath, type, onProgress, selectedItemNames);
  }

  isMigrationInProgress(): boolean {
    return this.provider.isMigrationInProgress();
  }

  setMigrationInProgress(inProgress: boolean): void {
    this.provider.setMigrationInProgress(inProgress);
  }
}

export const storageService = new StorageService();
