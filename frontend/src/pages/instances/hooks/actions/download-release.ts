import { CapacitorAppLauncher } from "@core";
import Utils from "@utils";

export interface DownloadReleaseParams {
  isBaseGameMobile: boolean;
  currentRelease: any;
  selectedCategory: string;
  currentEngineMeta: { id: string; name: string; icon: string };
  checkBaseGameStatus: () => Promise<void>;
  loadInstalledEngines: () => Promise<void>;
  startEngineDownload: (task: {
    engineId: string;
    version: string;
    engineName: string;
    downloadUrl: string;
  }) => Promise<void>;
}

/**
 * Handles downloading an engine release, either through the Android Play Store
 * launcher on mobile, or via the background engine download store on desktop.
 */
export async function downloadRelease({
  isBaseGameMobile,
  currentRelease,
  selectedCategory,
  currentEngineMeta,
  checkBaseGameStatus,
  loadInstalledEngines,
  startEngineDownload,
}: DownloadReleaseParams): Promise<void> {
  if (isBaseGameMobile) {
    await CapacitorAppLauncher.openBaseGameStore();
    setTimeout(() => {
      checkBaseGameStatus();
    }, 2500);
    return;
  }

  if (!currentRelease?.downloadUrl) {
    Utils.toast.error("No download link available for this release on your platform.", {
      title: "Engine Download",
    });
    return;
  }

  await startEngineDownload({
    engineId: selectedCategory,
    version: currentRelease.version,
    engineName: currentEngineMeta.name,
    downloadUrl: currentRelease.downloadUrl,
  });

  await loadInstalledEngines();
}
