import type {
  IStorageService,
  StorageInspectionResult,
  StorageMigrationProgress,
  ISettingsService,
} from "@contracts";
import type { DesktopTransport } from "../transport";
import { getDefaultPaths, getModsPath, getEnginesPath } from "./paths";
import { showFolderDialog } from "./dialog";
import { validateStorageFolder } from "./validation";
import { inspectStorage } from "./inspection";
import { migrateStorage } from "./migration";
import { StorageMigrationState } from "./state";

export * from "./paths";
export * from "./dialog";
export * from "./validation";
export * from "./inspection";
export * from "./migration";
export * from "./state";

/**
 * Storage and path management for Desktop environment.
 * Composes specialized single-responsibility modules and breaks circular dependency with DesktopMods.
 */
export class DesktopStorage implements IStorageService {
  private transport: DesktopTransport;
  private settings: ISettingsService;
  private migrationState: StorageMigrationState;

  constructor(transport: DesktopTransport, settings: ISettingsService) {
    this.transport = transport;
    this.settings = settings;
    this.migrationState = new StorageMigrationState();
  }

  isMigrationInProgress(): boolean {
    return this.migrationState.isMigrationInProgress();
  }

  setMigrationInProgress(inProgress: boolean): void {
    this.migrationState.setMigrationInProgress(inProgress);
  }

  getDefaultPaths(): Promise<{ basePath: string; defaultModsPath: string; defaultEnginesPath: string }> {
    return getDefaultPaths();
  }

  getModsPath(): Promise<string> {
    return getModsPath(this.settings);
  }

  getEnginesPath(): Promise<string> {
    return getEnginesPath(this.settings);
  }

  showFolderDialog(title: string, defaultPath?: string): Promise<string | null> {
    return showFolderDialog(title, defaultPath);
  }

  validateStorageFolder(
    targetPath: string,
    type: "mods" | "engines"
  ): Promise<{ valid: boolean; reason?: string }> {
    return validateStorageFolder(this.transport, targetPath, type);
  }

  inspectStorage(folderPath: string): Promise<StorageInspectionResult> {
    return inspectStorage(this.transport, folderPath);
  }

  migrateStorage(
    sourcePath: string,
    targetPath: string,
    type: "mods" | "engines",
    onProgress?: (progress: StorageMigrationProgress) => void,
    selectedItemNames?: string[]
  ): Promise<{ ok: boolean; count: number }> {
    return migrateStorage(
      this.transport,
      this.settings,
      (inProgress) => this.setMigrationInProgress(inProgress),
      sourcePath,
      targetPath,
      type,
      onProgress,
      selectedItemNames
    );
  }
}
