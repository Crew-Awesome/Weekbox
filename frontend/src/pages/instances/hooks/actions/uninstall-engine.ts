import Core, { CapacitorAppLauncher } from "@core";
import Utils from "@utils";

export interface UninstallEngineParams {
  currentRelease: any;
  selectedCategory: string;
  currentEngineMeta: { id: string; name: string; icon: string };
  isBaseGameMobile: boolean;
  isStorageMigrating: boolean;
  setInstalledEngineMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  loadInstalledEngines: () => Promise<void>;
}

/**
 * Handles uninstallation of an engine release:
 * - On mobile (Capacitor), requests native Android uninstallation dialog.
 * - On desktop, delegates to Core.platform.uninstallEngine and updates installation state.
 */
export async function executeUninstallEngine({
  currentRelease,
  selectedCategory,
  currentEngineMeta,
  isBaseGameMobile,
  isStorageMigrating,
  setInstalledEngineMap,
  loadInstalledEngines,
}: UninstallEngineParams): Promise<void> {
  if (!currentRelease) return;

  if (isBaseGameMobile) {
    const ok = await CapacitorAppLauncher.uninstallBaseGame();
    if (ok) {
      Utils.toast.info("Opening uninstallation dialog...", {
        title: "Base Game",
      });
    } else {
      Utils.toast.error("Could not open uninstallation dialog.", {
        title: "Uninstall Error",
      });
    }
    return;
  }

  if (isStorageMigrating) {
    Utils.toast.warning(
      "Cannot uninstall while storage migration is in progress. Please wait for the migration to complete.",
      { title: "Storage Relocation in Progress" }
    );
    return;
  }

  const ver = currentRelease.version;
  try {
    if (Core.platform.uninstallEngine) {
      await Core.platform.uninstallEngine(selectedCategory, ver);
      const key = `${selectedCategory}:${ver}`;
      setInstalledEngineMap((prev) => ({
        ...prev,
        [key]: false,
      }));
      await loadInstalledEngines();

      Utils.toast.success(`${currentEngineMeta.name} v${ver} uninstalled.`, {
        title: "Engine Uninstalled",
      });
    }
  } catch {
    Utils.toast.error(`Could not uninstall ${currentEngineMeta.name} v${ver}.`, {
      title: "Uninstall Error",
    });
  }
}
