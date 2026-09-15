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

  constructor(
    transport: DesktopTransport,
    settings: DesktopSettings
  ) {
    this.transport = transport;
    this.settings = settings;
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

      if (type === "mods") {
        const basePath = await getDesktopBasePath();
        const registryPath = `${basePath}/data/mod-installed.json`;
        try {
          const existing = await this.transport.call("fs.readFile" as any, { path: registryPath });
          let registry = JSON.parse(existing as unknown as string);
          if (Array.isArray(registry)) {
            const hasSelection = Array.isArray(selectedItemNames) && selectedItemNames.length > 0;
            const selectedSet = hasSelection ? new Set(selectedItemNames) : null;

            registry = registry
              .filter((m) => {
                if (!selectedSet) return true;
                const safeName = (m.name || m.title || "unknown")
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/[^a-zA-Z0-9]/g, "")
                  .toLowerCase();
                const expectedFolder = `mod_${m.id}_${safeName}`;
                return (
                  selectedSet.has(expectedFolder) ||
                  Array.from(selectedSet).some((name) => name.startsWith(`mod_${m.id}_`))
                );
              })
              .map((m) => {
                const safeName = (m.name || m.title || "unknown")
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/[^a-zA-Z0-9]/g, "")
                  .toLowerCase();
                return {
                  ...m,
                  installPath: `${targetPath}/mod_${m.id}_${safeName}`,
                };
              });

            await this.transport.call("fs.writeFile" as any, {
              path: registryPath,
              content: JSON.stringify(registry, null, 2),
            });

            this.transport.emitLocalEvent("mods:changed", { action: "migrated" });
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("wb:mods-changed", { detail: { action: "migrated" } })
              );
            }
          }
        } catch {}
      }

      this.transport.emitLocalEvent("storage:migrated", { type, targetPath });
      return res as any;
    } finally {
      this._isMigrating = false;
      if (unsubscribe) unsubscribe();
    }
  }
}
