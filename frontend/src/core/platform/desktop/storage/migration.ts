import type { StorageMigrationProgress, ISettingsService } from "@contracts";
import type { DesktopTransport } from "../transport";

/**
 * Executes storage migration, dispatches progress, updates user settings,
 * and emits a 'storage:migrated' event on completion without coupling to Mod services.
 */
export async function migrateStorage(
  transport: DesktopTransport,
  settings: ISettingsService,
  setMigrating: (inProgress: boolean) => void,
  sourcePath: string,
  targetPath: string,
  type: "mods" | "engines",
  onProgress?: (progress: StorageMigrationProgress) => void,
  selectedItemNames?: string[]
): Promise<{ ok: boolean; count: number }> {
  setMigrating(true);
  let unsubscribe: (() => void) | undefined;
  if (onProgress) {
    unsubscribe = transport.onEvent("download:progress", (data: any) => {
      if (data && data.currentItem !== undefined) {
        onProgress(data);
      }
    });
  }

  try {
    const res = await transport.call(
      "storage.migrate" as any,
      { sourcePath, targetPath, selectedItemNames },
      undefined,
      0
    );

    const s = await settings.getSettings();
    if (type === "mods") {
      s.modsPath = targetPath;
    } else {
      s.enginesPath = targetPath;
    }
    await settings.saveSettings(s);

    transport.emitLocalEvent("storage:migrated", { type, targetPath, selectedItemNames });
    return res as any;
  } finally {
    setMigrating(false);
    if (unsubscribe) unsubscribe();
  }
}
