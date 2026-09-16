import React from "react";
import { InstancesTopbar } from "./components/instances-topbar";
import { InstancesVersionAside } from "./components/instances-version-aside";
import { InstancesMarkdownViewer } from "./components/instances-markdown-viewer";
import { InstancesExecutableView } from "./components/instances-executable-view";
import { InstancesFooter } from "./components/instances-footer";
import { ConfirmationModal } from "@components";
import { useInstances } from "./hooks/use-instances";
import { useSettingsStore } from "../../store";

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

  return (
    <div className="flex flex-col flex-1 w-full md:w-[calc(100%+4rem)] h-full md:h-[calc(100%+4rem)] overflow-hidden bg-[var(--wb-bg)] text-[var(--wb-text-main)] m-0 md:-m-8 pb-20 md:pb-0">
      {/** Topbar */}
      <InstancesTopbar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        sortOption={sortOption}
        onSortChange={setSortOption}
        onlyInstalled={onlyInstalled}
        onOnlyInstalledChange={setOnlyInstalled}
        isExecutable={isExecutable}
      />

      {/** Main split area */}
      <div className="flex flex-col md:flex-row flex-1 w-full min-h-0 overflow-hidden relative">
        {/** Left Aside */}
        <InstancesVersionAside
          isExecutable={isExecutable}
          releases={releases}
          selectedVersion={selectedVersion}
          onSelectVersion={setSelectedVersion}
          isLoadingReleases={isLoadingReleases}
          installedMods={installedMods}
          selectedModId={selectedModId}
          onSelectMod={(mod) => setSelectedModId(String(mod.id))}
          isLoadingMods={isLoadingMods}
          engineIcon={currentEngineMeta.icon}
          sortOption={sortOption}
          onlyInstalled={onlyInstalled}
          installedVersions={installedVersionsForCategory}
        />

        {/** Right Content View with docked footer */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[var(--wb-surface)]/20 relative">
          <div className="flex-1 min-h-0 overflow-y-auto">
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
        <ConfirmationModal
          isOpen={isUninstallConfirmOpen}
          onClose={() => setIsUninstallConfirmOpen(false)}
          onConfirm={async (dontAskAgain: boolean) => {
            if (dontAskAgain) {
              await useSettingsStore.getState().dismissWarning("delete-engine");
            }
            setIsUninstallConfirmOpen(false);
            await executeUninstallEngine();
          }}
          title="Uninstall Engine Version"
          description={
            <span>
              Are you sure you want to uninstall{" "}
              <strong>
                {currentEngineMeta.name} v{currentRelease.version}
              </strong>
              ? This engine version and all its local files will be permanently deleted from disk.
            </span>
          }
          cancelLabel="Nevermind!"
          confirmLabel="Uninstall"
          isDestructive={true}
          showDontAskAgain={true}
        />
      )}
    </div>
  );
};

export default Instances;
