import { useState } from "react";
import Utils from "@utils";
import { useBaseGameMobile, VSLICE_PLAYSTORE_SCREENSHOTS } from "./use-base-game-mobile";
import { useInstanceSelection } from "./use-instance-selection";
import { useInstalledEngines } from "./use-installed-engines";
import { useExecutableMods } from "./use-executable-mods";
import { useInstanceReleases } from "./use-instance-releases";
import { useInstanceActions } from "./use-instance-actions";

export { VSLICE_PLAYSTORE_SCREENSHOTS };

/**
 * Facade hook for Instances view.
 * Refactored under S.O.L.I.D principles:
 * - Single Responsibility: Separated selection/persistence, mobile lifecycle, installed engines registry,
 *   standalone executable mods, engine releases aggregation, and process/launch actions into dedicated sub-hooks.
 * - Open/Closed: Domain-specific actions and releases can be modified or extended without rewriting the orchestrator.
 * - Dependency Inversion & Interface Segregation: Dependent modules receive clean interfaces.
 */
export function useInstances() {
  const { isOnline } = Utils.hooks.useNetwork();

  // 1. Temporary states for cross-sub-hook wiring
  const [selectedVersion, setSelectedVersion] = useState<string>("");

  // 2. Installed engines registry & events
  // Note: we instantiate selection first with a fallback, then wire category
  const [selectedCategory, setSelectedCategory] = useState<string>("vslice");

  const {
    installedEnginesRegistry,
    installedVersionsForCategory,
    installedEngineMap,
    setInstalledEngineMap,
    loadInstalledEngines,
  } = useInstalledEngines(selectedCategory);

  // 3. Executable mods management
  const {
    isExecutable,
    installedMods,
    selectedModId,
    setSelectedModId,
    selectedMod,
    isLoadingMods,
  } = useExecutableMods(selectedCategory);

  // 4. Category selection, sorting, and routing sync
  const selection = useInstanceSelection({
    selectedVersion,
    setSelectedVersion,
    selectedMod,
    selectedModId,
    setSelectedModId,
    isExecutable,
  });

  // Keep selection category synced
  if (selection.selectedCategory !== selectedCategory) {
    setSelectedCategory(selection.selectedCategory);
  }

  // 5. Base Game mobile lifecycle
  const {
    isCapacitor,
    isBaseGameMobile,
    isBaseGameInstalled,
    checkBaseGameStatus,
  } = useBaseGameMobile(selection.selectedCategory);

  // 6. Engine releases, version selection, and disk verification
  const {
    releases,
    selectedVersion: resolvedSelectedVersion,
    setSelectedVersion: updateSelectedVersion,
    currentRelease,
    isLoadingReleases,
    isCurrentEngineInstalled,
    isNightly,
    isNightlyOutdated,
    isDownloadingCurrent,
    currentEngineTask,
  } = useInstanceReleases({
    selectedCategory: selection.selectedCategory,
    setSelectedCategory: selection.setSelectedCategory,
    isBaseGameMobile,
    isBaseGameInstalled,
    isOnline,
    isExecutable,
    installedVersionsForCategory,
    currentEngineMeta: selection.currentEngineMeta,
    installedEngineMap,
    setInstalledEngineMap,
    installedEnginesRegistry,
    installedMods,
    isCapacitor,
  });

  // Sync resolved version to selection
  if (resolvedSelectedVersion !== selectedVersion) {
    setSelectedVersion(resolvedSelectedVersion);
  }

  // 7. Process lifecycle & actions
  const actions = useInstanceActions({
    selectedCategory: selection.selectedCategory,
    currentRelease,
    currentEngineMeta: selection.currentEngineMeta,
    isBaseGameMobile,
    checkBaseGameStatus,
    loadInstalledEngines,
    isExecutable,
    selectedMod,
    selectedVersion: resolvedSelectedVersion,
    setInstalledEngineMap,
  });

  return {
    selectedCategory: selection.selectedCategory,
    setSelectedCategory: selection.setSelectedCategory,
    sortOption: selection.sortOption,
    setSortOption: selection.setSortOption,
    onlyInstalled: selection.onlyInstalled,
    setOnlyInstalled: selection.setOnlyInstalled,
    isExecutable,
    releases,
    selectedVersion: resolvedSelectedVersion,
    setSelectedVersion: updateSelectedVersion,
    currentRelease,
    isLoadingReleases,
    installedMods,
    selectedModId,
    setSelectedModId,
    selectedMod,
    isLoadingMods,
    currentEngineMeta: selection.currentEngineMeta,
    installedVersionsForCategory,
    isCurrentEngineInstalled,
    isNightly,
    isNightlyOutdated,
    isDownloadingCurrent,
    currentEngineTask,
    playStatus: actions.playStatus,
    isStorageMigrating: actions.isStorageMigrating,
    handleDownloadRelease: actions.handleDownloadRelease,
    handleOpenEngineFolder: actions.handleOpenEngineFolder,
    handlePlayEngine: actions.handlePlayEngine,
    handlePlayExecutable: actions.handlePlayExecutable,
    handleStopInstance: actions.handleStopInstance,
    handleUninstallEngine: actions.handleUninstallEngine,
    cancelEngineDownload: actions.cancelEngineDownload,
    isUninstallConfirmOpen: actions.isUninstallConfirmOpen,
    setIsUninstallConfirmOpen: actions.setIsUninstallConfirmOpen,
    executeUninstallEngine: actions.executeUninstallEngine,
    footerTitle: actions.footerTitle,
    footerVersion: actions.footerVersion,
    footerIcon: actions.footerIcon,
    isBaseGameMobile,
    isBaseGameInstalled,
    checkBaseGameStatus,
  };
}
