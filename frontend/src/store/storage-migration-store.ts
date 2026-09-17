import { create } from "zustand";
import type { IStorageService } from "@contracts";
import { container } from "../core/container";
import Utils from "@utils";
import { useSettingsStore } from "./settings-store";

export interface MigrationProgress {
  currentItem: string;
  currentIndex: number;
  totalItems: number;
  percent: number;
  remainingItems: number;
}

export interface StorageMigrationStoreDependencies {
  storage: IStorageService;
}

export interface StorageMigrationStoreState {
  isMigrating: boolean;
  migrationType: "mods" | "engines" | null;
  progress: MigrationProgress | null;
  startMigration: (
    type: "mods" | "engines",
    sourcePath: string,
    targetPath: string,
    selectedItemNames?: string[]
  ) => Promise<boolean>;
}

/**
 * Creates an instance of the Storage Migration Store with injected dependencies (DIP / ISP).
 */
export function createStorageMigrationStore(customDeps?: Partial<StorageMigrationStoreDependencies>) {
  const deps: StorageMigrationStoreDependencies = {
    storage: customDeps?.storage || container.storage,
  };

  return create<StorageMigrationStoreState>((set) => ({
    isMigrating: false,
    migrationType: null,
    progress: null,

    startMigration: async (type, sourcePath, targetPath, selectedItemNames) => {
      set({
        isMigrating: true,
        migrationType: type,
        progress: {
          currentItem: "Initializing transfer...",
          currentIndex: 0,
          totalItems: 0,
          percent: 0,
          remainingItems: 0,
        },
      });

      const typeLabel = type === "mods" ? "Mods" : "Engines";

      const toastId = Utils.toast.info(`Preparing to move ${typeLabel}...`, {
        title: `Moving ${typeLabel} Folder`,
        duration: 999999,
      });

      try {
        if (!deps.storage.migrateStorage) {
          throw new Error("Storage migration is not supported on this platform.");
        }

        await deps.storage.migrateStorage(
          sourcePath,
          targetPath,
          type,
          (prog) => {
            set({ progress: prog });
            Utils.toast.update(toastId, {
              title: `Moving ${typeLabel} (${prog.percent}%)`,
              message: `Moving "${prog.currentItem}" (${prog.currentIndex}/${prog.totalItems}) - ${prog.remainingItems} remaining`,
              progress: prog.percent,
            });
          },
          selectedItemNames
        );

        /* Update settings store */
        if (type === "mods") {
          await useSettingsStore.getState().updateSetting("modsPath", targetPath);
        } else {
          await useSettingsStore.getState().updateSetting("enginesPath", targetPath);
        }

        Utils.toast.dismiss(toastId);
        Utils.toast.success(`Successfully moved ${typeLabel} to new location!`, {
          title: "Storage Relocated",
          duration: 4000,
        });

        set({
          isMigrating: false,
          migrationType: null,
          progress: null,
        });

        return true;
      } catch (err: any) {
        Utils.toast.dismiss(toastId);
        Utils.toast.error(err?.message || "Failed to move storage directory.", {
          title: "Migration Error",
          duration: 5000,
        });

        set({
          isMigrating: false,
          migrationType: null,
          progress: null,
        });

        return false;
      }
    },
  }));
}

/**
 * Global default storage migration store.
 */
export const useStorageMigrationStore = createStorageMigrationStore();
