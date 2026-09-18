import React from "react";
import { InstancesTopbar } from "./components/instances-topbar";
import { InstancesVersionAside } from "./components/instances-version-aside";
import { InstancesMarkdownViewer } from "./components/instances-markdown-viewer";
import { InstancesExecutableView } from "./components/instances-executable-view";
import { InstancesFooter } from "./components/instances-footer";
import { InstancesUninstallModal } from "./components/instances-uninstall-modal";
import { useInstances } from "./hooks/use-instances";

/**
 * Organism / Feature: Instances View.
 * Displays engine version management, markdown changelogs, and executable mod launching.
 * Synchronizes route (/instances/:category/:version) and document title.
 */
export const Instances: React.FC = () => {
  const {
    selectedCategory,
    setSelectedCategory,
    sortOption,
    setSortOption,
    onlyInstalled,
    setOnlyInstalled,
    isExecutable,
    releases,
    selectedVersion,
    setSelectedVersion,
    currentRelease,
    isLoadingReleases,
    installedMods,
    selectedModId,
    setSelectedModId,
    selectedMod,
    isLoadingMods,
    currentEngineMeta,
    installedVersionsForCategory,
    isCurrentEngineInstalled,
    isNightly,
    isNightlyOutdated,
    isDownloadingCurrent,
    currentEngineTask,
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
    executeUninstallEngine,
    footerTitle,
    footerVersion,
    footerIcon,
    isBaseGameMobile,
    isBaseGameInstalled,
  } = useInstances();

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
  };

  const handleSelectVersion = (ver: any) => {
    setSelectedVersion(ver);
  };

  const handleSelectMod = (mod: any) => {
    setSelectedModId(String(mod.id));
  };

  return (
    <div className="flex flex-col flex-1 w-[calc(100%+4rem)] h-[calc(100%+9rem)] md:h-[calc(100%+4rem)] overflow-hidden bg-[var(--wb-bg)] text-[var(--wb-text-main)] -mx-8 -mt-8 -mb-28 md:-m-8">
      {/** Topbar: sticky fixed at the top */}
      <div className="sticky top-0 z-40 shrink-0 w-full">
        <InstancesTopbar
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
          sortOption={sortOption}
          onSortChange={setSortOption}
          onlyInstalled={onlyInstalled}
          onOnlyInstalledChange={setOnlyInstalled}
          isExecutable={isExecutable}
        />
      </div>

      {/** Main split area */}
      <div className="flex flex-col md:flex-row flex-1 w-full min-h-0 overflow-hidden relative z-10">
        {/** Left Aside: only on desktop/tablet, hidden on mobile */}
        <div className="hidden md:flex w-full md:w-auto h-full flex-col">
          <InstancesVersionAside
            isExecutable={isExecutable}
            releases={releases}
            selectedVersion={selectedVersion}
            onSelectVersion={handleSelectVersion}
            isLoadingReleases={isLoadingReleases}
            installedMods={installedMods}
            selectedModId={selectedModId}
            onSelectMod={handleSelectMod}
            isLoadingMods={isLoadingMods}
            engineIcon={currentEngineMeta.icon}
            sortOption={sortOption}
            onlyInstalled={onlyInstalled}
            installedVersions={installedVersionsForCategory}
          />
        </div>

        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[var(--wb-surface)]/20 relative">
          <div className="flex-1 min-h-0 overflow-y-auto -mt-[4.5rem] md:mt-0 pt-[4.5rem] md:pt-0">
            {isExecutable ? (
              <InstancesExecutableView mod={selectedMod} />
            ) : (
              <InstancesMarkdownViewer
                release={currentRelease}
                isLoading={isLoadingReleases}
              />
            )}
          </div>

          <InstancesFooter
            isExecutable={isExecutable}
            isBaseGameMobile={isBaseGameMobile}
            icon={footerIcon}
            title={footerTitle}
            version={footerVersion}
            downloadUrl={currentRelease?.downloadUrl}
            isInstalled={isExecutable ? true : isBaseGameMobile ? isBaseGameInstalled : isCurrentEngineInstalled}
            isNightly={isNightly}
            isNightlyOutdated={isNightlyOutdated}
            onDownload={handleDownloadRelease}
            onCancelDownload={cancelEngineDownload}
            onUpdate={handleDownloadRelease}
            onUninstall={handleUninstallEngine}
            onOpenFolder={handleOpenEngineFolder}
            onPlay={isExecutable ? handlePlayExecutable : handlePlayEngine}
            onStop={handleStopInstance}
            playStatus={playStatus}
            isStorageMigrating={isStorageMigrating}
            isDownloading={isDownloadingCurrent}
            downloadProgress={isDownloadingCurrent ? currentEngineTask?.progress ?? 0 : 0}
            downloadStatusText={isDownloadingCurrent ? currentEngineTask?.status ?? "" : ""}
            currentExtractingFile={isDownloadingCurrent ? currentEngineTask?.currentFile : undefined}
          />
        </main>
      </div>

      {currentRelease && (
        <InstancesUninstallModal
          isOpen={isUninstallConfirmOpen}
          onClose={() => setIsUninstallConfirmOpen(false)}
          onConfirm={executeUninstallEngine}
          engineName={currentEngineMeta.name}
          version={currentRelease.version}
        />
      )}
    </div>
  );
};

export default Instances;
