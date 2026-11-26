import React, { useMemo } from 'react'
import { Topbar } from '@/ui/topbar/Topbar'
import { useEngineProcessState, type InstalledEngineVersion } from '@/core/engines'
import { useEngineManagement } from './hooks/use-engine-management'
import { useExecutableInstances } from './hooks/use-executable-instances'
import { useBannerProgress } from './hooks/use-banner-progress'
import { useInstancesViewState } from './hooks/use-instances-view-state'
import { useSmoothProgress } from './hooks/use-smooth-progress'
import {
  InstancesTopbarUnderlay,
  InstancesEngineBanner,
  InstancesEngineMenu,
  InstancesEngineIdentity,
  InstancesDocumentation,
  InstancesActionFooter,
  InstancesReleasesError,
  InstancesVersionSelector,
  InstancesActionButtons,
} from './components'

export const InstancesView: React.FC = () => {
  const {
    selectedEngineId,
    currentEngine,
    supportedEngines,
    allInstalledCounts,
    platform,
    isLoadingReleases,
    releasesError,
    installedVersions,
    activeVersion,
    tasksByVersion,
    selectedVersion,
    selectedRelease,
    selectedInstalledVersion,
    selectedTask,
    versionOptions,
    selectEngine,
    selectVersion,
    refreshReleases,
    openFolder,
    cancelDownload,
    openGitHub,
    setDefaultVersion,
    deleteVersion,
    launchVersion,
    installSelectedVersion,
    uninstallSelectedVersion,
    isUninstalling,
    launchSelectedVersion,
    setSelectedAsDefault,
  } = useEngineManagement('psych')

  const {
    executableMods,
    isExecutableSelected,
    selectedExecutableMod,
    selectedExecutableId,
    selectedExecutableDisplay,
    selectedExecutableExeName,
    isExecutableUninstalling,
    selectExecutable,
    clearExecutableSelection,
    launchExecutable,
    openExecutableFolder,
    openExecutableSource,
    uninstallExecutable,
  } = useExecutableInstances()

  const displayEngine =
    isExecutableSelected && selectedExecutableDisplay
      ? selectedExecutableDisplay
      : currentEngine

  const effectiveSelectedVersion = isExecutableSelected
    ? selectedExecutableExeName || selectedExecutableDisplay?.name || 'Executable'
    : selectedVersion

  const syntheticExecutableVersion = useMemo<InstalledEngineVersion | undefined>(() => {
    if (!isExecutableSelected || !selectedExecutableMod) return undefined
    const verLabel =
      selectedExecutableExeName ||
      selectedExecutableMod.title ||
      selectedExecutableMod.name ||
      'Executable'
    return {
      version: verLabel,
      tag: verLabel,
      name: verLabel,
      assetSize: selectedExecutableMod.fileSize,
      installPath: selectedExecutableMod.installPath || '',
      installedAt: selectedExecutableMod.installedAt || 0,
      isDefault: true,
    }
  }, [isExecutableSelected, selectedExecutableMod, selectedExecutableExeName])

  const effectiveInstalledVersion = isExecutableSelected
    ? syntheticExecutableVersion
    : selectedInstalledVersion

  const effectiveActiveVersion = isExecutableSelected
    ? effectiveSelectedVersion
    : activeVersion

  const effectiveTask = isExecutableSelected ? undefined : selectedTask
  const effectiveIsUninstalling = isExecutableSelected
    ? isExecutableUninstalling
    : isUninstalling

  const { progress: bannerProgress, rootRef: instancesRootRef, bannerRef: bannerSectionRef } =
    useBannerProgress()

  const {
    descriptionTab,
    setDescriptionTab,
    isTranslationActive,
    setIsTranslationActive,
    isInstallStarting,
    recommendedAsset,
    descriptionHtml,
    descriptionTitle,
    handleMarkdownClick,
    triggerInstallRequest,
    busyPhase,
    busyLabel,
    busyDetail,
  } = useInstancesViewState({
    selectedEngineId,
    currentEngine: displayEngine,
    selectedVersion: effectiveSelectedVersion,
    selectedRelease,
    selectedTask: effectiveTask,
    platform,
    isExecutableInstance: isExecutableSelected,
    executableMod: selectedExecutableMod,
  })

  const handleInstallClick = () => {
    if (isExecutableSelected || isInstallStarting) return
    if (selectedVersion) {
      triggerInstallRequest(selectedVersion)
    }
    void installSelectedVersion()
  }

  const isBusy = Boolean(
    effectiveTask &&
      (effectiveTask.status === 'downloading' ||
        effectiveTask.status === 'extracting' ||
        effectiveTask.status === 'canceling'),
  )

  const rawProgress = effectiveIsUninstalling
    ? 100
    : Math.max(0, Math.min(100, effectiveTask?.progress || 0))

  const smoothProgress = useSmoothProgress(
    rawProgress,
    isBusy || effectiveIsUninstalling,
  )

  const candidateExes = useMemo(() => {
    if (!isExecutableSelected) return undefined
    return selectedExecutableExeName ? [selectedExecutableExeName] : []
  }, [isExecutableSelected, selectedExecutableExeName])

  const {
    isRunning: isEngineRunning,
    formattedSessionDuration,
    stopEngine,
  } = useEngineProcessState(
    displayEngine.id,
    effectiveSelectedVersion ?? undefined,
    candidateExes,
  )

  const effectiveHasWarning = Boolean(
    isExecutableSelected && selectedExecutableMod?.hasEngineWarning,
  )

  return (
    <div
      ref={instancesRootRef}
      id="instances-root"
      data-engine={displayEngine.id}
      data-version={effectiveSelectedVersion ?? ''}
      className="w-full min-h-full flex flex-col select-none"
    >
      <Topbar
        leading={
          <InstancesEngineMenu
            currentEngine={displayEngine}
            supportedEngines={supportedEngines}
            selectedEngineId={selectedEngineId}
            allInstalledCounts={allInstalledCounts}
            onSelectEngine={(engineId) => {
              clearExecutableSelection()
              selectEngine(engineId)
            }}
            isExecutableSelected={isExecutableSelected}
            executableMods={executableMods}
            selectedExecutableId={selectedExecutableId}
            onSelectExecutable={selectExecutable}
            currentHasWarning={effectiveHasWarning}
          />
        }
        autoHideOnScroll={false}
        underlay={
          <InstancesTopbarUnderlay
            banner={displayEngine.banner}
            progress={bannerProgress}
          />
        }
      />

      <div className="flex-1 flex flex-col gap-4 sm:gap-6 px-3 sm:px-8 pt-3 sm:pt-4 pb-8 sm:pb-12 md:pb-36 max-w-7xl mx-auto w-full min-w-0">
        <InstancesEngineBanner
          engine={displayEngine}
          bannerProgress={bannerProgress}
          sectionRef={bannerSectionRef}
        />

        <InstancesEngineIdentity
          engine={displayEngine}
          installedVersions={installedVersions}
          activeVersion={activeVersion}
          isLoadingReleases={isLoadingReleases}
          onRefreshReleases={refreshReleases}
          onOpenFolder={() =>
            isExecutableSelected
              ? void openExecutableFolder()
              : void openFolder()
          }
          onOpenGitHub={openGitHub}
          isExecutableInstance={isExecutableSelected}
          hasWarning={effectiveHasWarning}
          warningMessage={selectedExecutableMod?.engineWarningMessage}
          executableExeName={selectedExecutableExeName}
          executableFileSize={selectedExecutableMod?.fileSize}
          sourceUrl={selectedExecutableMod?.sourceUrl}
          onOpenSourceUrl={openExecutableSource}
          mobileVersionSelector={
            isExecutableSelected ? undefined : (
              <InstancesVersionSelector
                currentEngine={currentEngine}
                platform={platform}
                selectedVersion={selectedVersion}
                versionOptions={versionOptions}
                tasksByVersion={tasksByVersion}
                isLoadingReleases={isLoadingReleases}
                smoothProgress={smoothProgress}
                onSelectVersion={selectVersion}
                onOpenFolder={(v) => void openFolder(v)}
                onSetDefault={(v) => void setDefaultVersion(v)}
                onDeleteVersion={deleteVersion}
                onLaunchVersion={(v) => void launchVersion(v)}
                menuId="instances-mobile-version-menu"
                positionY="below"
                positionX="start"
                hideIcon={true}
              />
            )
          }
          mobileActionButtons={
            <InstancesActionButtons
              selectedVersion={effectiveSelectedVersion}
              selectedInstalledVersion={effectiveInstalledVersion}
              selectedTask={effectiveTask}
              activeVersion={effectiveActiveVersion}
              isUninstalling={effectiveIsUninstalling}
              isInstallStarting={isInstallStarting}
              isEngineRunning={isEngineRunning}
              formattedSessionDuration={formattedSessionDuration}
              recommendedAsset={isExecutableSelected ? undefined : recommendedAsset}
              busyPhase={busyPhase}
              busyLabel={busyLabel}
              busyDetail={busyDetail}
              smoothProgress={smoothProgress}
              onCancelDownload={cancelDownload}
              onInstallSelected={handleInstallClick}
              onSetSelectedAsDefault={() => void setSelectedAsDefault()}
              onLaunchSelected={
                isExecutableSelected
                  ? () => void launchExecutable()
                  : launchSelectedVersion
              }
              onUninstallSelected={
                isExecutableSelected
                  ? uninstallExecutable
                  : uninstallSelectedVersion
              }
              onStopEngine={stopEngine}
            />
          }
        />

        {!isExecutableSelected && releasesError && (
          <InstancesReleasesError
            error={releasesError}
            isLoading={isLoadingReleases}
            onRetry={refreshReleases}
          />
        )}

        <InstancesDocumentation
          engine={displayEngine}
          selectedVersion={effectiveSelectedVersion}
          selectedRelease={isExecutableSelected ? undefined : selectedRelease}
          descriptionTab={descriptionTab}
          onTabChange={setDescriptionTab}
          isTranslationActive={isTranslationActive}
          onToggleTranslation={() => setIsTranslationActive((active) => !active)}
          descriptionTitle={descriptionTitle}
          descriptionHtml={descriptionHtml}
          onMarkdownClick={handleMarkdownClick}
          onlyGeneralDescription={isExecutableSelected}
        />
      </div>

      <InstancesActionFooter
        currentEngine={displayEngine}
        engineDef={currentEngine}
        isExecutableInstance={isExecutableSelected}
        executableExeName={selectedExecutableExeName}
        executableFileSize={selectedExecutableMod?.fileSize}
        executableHasWarning={effectiveHasWarning}
        platform={platform}
        selectedVersion={effectiveSelectedVersion}
        selectedInstalledVersion={effectiveInstalledVersion}
        selectedTask={effectiveTask}
        activeVersion={effectiveActiveVersion}
        versionOptions={versionOptions}
        tasksByVersion={tasksByVersion}
        isLoadingReleases={isLoadingReleases}
        isUninstalling={effectiveIsUninstalling}
        isInstallStarting={isInstallStarting}
        isEngineRunning={isEngineRunning}
        formattedSessionDuration={formattedSessionDuration}
        onStopEngine={stopEngine}
        recommendedAsset={isExecutableSelected ? undefined : recommendedAsset}
        busyPhase={busyPhase}
        busyLabel={busyLabel}
        busyDetail={busyDetail}
        smoothProgress={smoothProgress}
        onSelectVersion={selectVersion}
        onOpenFolder={(v) =>
          isExecutableSelected
            ? void openExecutableFolder()
            : void openFolder(v)
        }
        onSetDefault={(v) => void setDefaultVersion(v)}
        onDeleteVersion={deleteVersion}
        onLaunchVersion={(v) => void launchVersion(v)}
        onCancelDownload={cancelDownload}
        onInstallSelected={handleInstallClick}
        onSetSelectedAsDefault={() => void setSelectedAsDefault()}
        onLaunchSelected={
          isExecutableSelected
            ? () => void launchExecutable()
            : launchSelectedVersion
        }
        onUninstallSelected={
          isExecutableSelected ? uninstallExecutable : uninstallSelectedVersion
        }
      />
    </div>
  )
}

export default InstancesView
