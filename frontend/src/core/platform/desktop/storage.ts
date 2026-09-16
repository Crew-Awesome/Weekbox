import type {
  IStorageService,
  StorageInspectionResult,
  StorageMigrationProgress,
} from "@contracts";
import type { DesktopTransport } from "./transport";
import { type DesktopSettings, getDesktopBasePath } from "./settings";

/**
 * Storage and path management for Desktop environment.
 */
export class DesktopStorage implements IStorageService {
  private _isMigrating: boolean = false;

  private transport: DesktopTransport;
  private settings: DesktopSettings;
  private mods?: { remapInstalledModPaths: (targetPath: string, selectedItemNames?: string[]) => Promise<void> };

  constructor(
    transport: DesktopTransport,
    settings: DesktopSettings
  ) {
    this.transport = transport;
    this.settings = settings;
  }

  setMods(mods: { remapInstalledModPaths: (targetPath: string, selectedItemNames?: string[]) => Promise<void> }) {
    this.mods = mods;
  }

  isMigrationInProgress(): boolean {
    return this._isMigrating;
  }

  setMigrationInProgress(inProgress: boolean): void {
    this._isMigrating = inProgress;
  }

  async getDefaultPaths(): Promise<{ basePath: string; defaultModsPath: string; defaultEnginesPath: string }> {
    const base = await getDesktopBasePath();
    return {
      basePath: base,
      defaultModsPath: `${base}/mods`,
      defaultEnginesPath: `${base}/engines`,
    };
  }

  async getModsPath(): Promise<string> {
    const s = await this.settings.getSettings();
    if (s.modsPath && typeof s.modsPath === "string") {
      return s.modsPath.replace(/\\/g, "/");
    }
    const base = await getDesktopBasePath();
    return `${base}/mods`;
  }

  async getEnginesPath(): Promise<string> {
    const s = await this.settings.getSettings();
    if (s.enginesPath && typeof s.enginesPath === "string") {
      return s.enginesPath.replace(/\\/g, "/");
    }
    const base = await getDesktopBasePath();
    return `${base}/engines`;
  }

  async showFolderDialog(title: string, defaultPath?: string): Promise<string | null> {
    const os = window.Neutralino?.os as any;
    if (os?.showFolderDialog) {
      try {
        const folder = await os.showFolderDialog(title, {
          defaultPath: defaultPath || "",
        });
        return folder || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  async validateStorageFolder(
    targetPath: string,
    type: "mods" | "engines"
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const res = await this.transport.call("storage.validateFolder" as any, { targetPath, type });
      return res as any;
    } catch (e: any) {
      return { valid: false, reason: e?.message || "Failed to validate destination folder." };
    }
  }

  async inspectStorage(folderPath: string): Promise<StorageInspectionResult> {
    try {
      const res = await this.transport.call("storage.inspect" as any, { folderPath });
      return res as any;
    } catch {
      return { count: 0, totalBytes: 0, formattedSize: "0 B", estimatedTime: "< 1s", items: [] };
    }
  }

  async migrateStorage(
    sourcePath: string,
    targetPath: string,
    type: "mods" | "engines",
    onProgress?: (progress: StorageMigrationProgress) => void,
    selectedItemNames?: string[]
  ): Promise<{ ok: boolean; count: number }> {
    this._isMigrating = true;
    let unsubscribe: (() => void) | undefined;
    if (onProgress) {
      unsubscribe = this.transport.onEvent("download:progress", (data: any) => {
        if (data && data.currentItem !== undefined) {
          onProgress(data);
        }
      });
    }

    try {
      const res = await this.transport.call(
        "storage.migrate" as any,
        { sourcePath, targetPath, selectedItemNames },
        undefined,
        0
      );

      const s = await this.settings.getSettings();
      if (type === "mods") {
        s.modsPath = targetPath;
      } else {
        s.enginesPath = targetPath;
      }
      await this.settings.saveSettings(s);

      if (type === "mods" && this.mods) {
        await this.mods.remapInstalledModPaths(targetPath, selectedItemNames).catch(() => {});
      }

      this.transport.emitLocalEvent("storage:migrated", { type, targetPath });
      return res as any;
    } finally {
      this._isMigrating = false;
      if (unsubscribe) unsubscribe();
    }
  }
}
