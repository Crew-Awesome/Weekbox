import { useState } from "react";
import {
  useEngineDownloadStore,
  useProcessStore,
  useSettingsStore,
  useStorageMigrationStore,
} from "../../../store";
import {
  downloadRelease,
  openEngineFolder,
  playEngine,
  playExecutable,
  stopInstance,
  executeUninstallEngine,
} from "./actions";

interface UseInstanceActionsProps {
  selectedCategory: string;
  currentRelease: any;
  currentEngineMeta: { id: string; name: string; icon: string };
  isBaseGameMobile: boolean;
  checkBaseGameStatus: () => Promise<void>;
  loadInstalledEngines: () => Promise<void>;
  isExecutable: boolean;
  selectedMod: any;
  selectedVersion: string;
  setInstalledEngineMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

/**
 * Hook coordinating user actions for instances (launching, stopping, downloading, uninstalling).
 * Refactored to delegate each action to dedicated functions in `./actions/`.
 */
export function useInstanceActions({
  selectedCategory,
  currentRelease,
  currentEngineMeta,
  isBaseGameMobile,
  checkBaseGameStatus,
  loadInstalledEngines,
  isExecutable,
  selectedMod,
  selectedVersion,
  setInstalledEngineMap,
}: UseInstanceActionsProps) {
  const [isUninstallConfirmOpen, setIsUninstallConfirmOpen] = useState<boolean>(false);

  const startEngineDownload = useEngineDownloadStore((s) => s.startEngineDownload);
  const cancelEngineDownload = useEngineDownloadStore((s) => s.cancelEngineDownload);
  const isStorageMigrating = useStorageMigrationStore((s) => s.isMigrating);

  const currentInstanceKey = isExecutable
    ? selectedMod
      ? `mod:${selectedMod.id}`
      : ""
    : currentRelease
    ? `engine:${selectedCategory}:${currentRelease.version}`
    : "";

  const playStatus = useProcessStore((s) =>
    currentInstanceKey ? s.getPlayState(currentInstanceKey) : "idle"
  );

  const handleDownloadRelease = async () => {
    await downloadRelease({
      isBaseGameMobile,
      currentRelease,
      selectedCategory,
      currentEngineMeta,
      checkBaseGameStatus,
      loadInstalledEngines,
      startEngineDownload,
    });
  };

  const handleOpenEngineFolder = async () => {
    await openEngineFolder(selectedCategory, currentRelease?.version);
  };

  const handlePlayEngine = async () => {
    await playEngine({
      currentRelease,
      selectedCategory,
      isBaseGameMobile,
      currentInstanceKey,
      isStorageMigrating,
    });
  };

  const handlePlayExecutable = async () => {
    await playExecutable({
      selectedMod,
      isStorageMigrating,
    });
  };

  const handleStopInstance = async () => {
    await stopInstance(currentInstanceKey);
  };

  const onExecuteUninstall = async () => {
    await executeUninstallEngine({
      currentRelease,
      selectedCategory,
      currentEngineMeta,
      isBaseGameMobile,
      isStorageMigrating,
      setInstalledEngineMap,
      loadInstalledEngines,
    });
  };

  const handleUninstallEngine = async () => {
    if (!currentRelease) return;
    if (isStorageMigrating) {
      return;
    }

    if (useSettingsStore.getState().isWarningDismissed("delete-engine")) {
      await onExecuteUninstall();
    } else {
      setIsUninstallConfirmOpen(true);
    }
  };

  const footerTitle = isExecutable
    ? selectedMod?.name || selectedMod?.title || "Executable Mod"
    : currentEngineMeta.id === "vslice"
    ? "Base Game"
    : currentEngineMeta.name;

  const footerVersion = isExecutable
    ? selectedMod?.author
      ? `by ${selectedMod.author}`
      : "Installed"
    : selectedVersion;

  const footerIcon = isExecutable
    ? selectedMod?.icon || "/assets/icons/categories/exe.png"
    : currentEngineMeta.icon;

  return {
    currentInstanceKey,
    playStatus,
    isStorageMigrating,
    handleDownloadRelease,
    handleOpenEngineFolder,
    handlePlayEngine,
    handlePlayExecutable,
    handleStopInstance,
    handleUninstallEngine,
    cancelEngineDownload,
    isUninstallConfirmOpen,
    setIsUninstallConfirmOpen,
    executeUninstallEngine: onExecuteUninstall,
    footerTitle,
    footerVersion,
    footerIcon,
  };
}
