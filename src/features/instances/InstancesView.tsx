import React from 'react'
import { Topbar } from '@/ui/topbar/Topbar'
import { useEngineProcessState } from '@/core/engines'
import { useEngineManagement } from './hooks/use-engine-management'
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
    currentEngine,
    selectedVersion,
    selectedRelease,
    selectedTask,
    platform,
  })

  const handleInstallClick = () => {
    if (isInstallStarting) return
    if (selectedVersion) {
      triggerInstallRequest(selectedVersion)
    }
    void installSelectedVersion()
  }

  const isBusy = Boolean(
    selectedTask &&
      (selectedTask.status === 'downloading' ||
        selectedTask.status === 'extracting' ||
        selectedTask.status === 'canceling'),
  )

  const rawProgress = isUninstalling
    ? 100
    : Math.max(0, Math.min(100, selectedTask?.progress || 0))

  const smoothProgress = useSmoothProgress(
    rawProgress,
    isBusy || isUninstalling,
  )

  const {
    isRunning: isEngineRunning,
    formattedSessionDuration,
    stopEngine,
  } = useEngineProcessState(selectedEngineId, selectedVersion ?? undefined)

  return (
    <div
      ref={instancesRootRef}
      id="instances-root"
      data-engine={selectedEngineId}
      data-version={selectedVersion ?? ''}
      className="w-full min-h-full flex flex-col select-none"
    >
      <Topbar
        leading={
          <InstancesEngineMenu
            currentEngine={currentEngine}
            supportedEngines={supportedEngines}
            selectedEngineId={selectedEngineId}
            allInstalledCounts={allInstalledCounts}
            onSelectEngine={selectEngine}
          />
        }
        autoHideOnScroll={false}
        underlay={
          <InstancesTopbarUnderlay
            banner={currentEngine.banner}
            progress={bannerProgress}
          />
        }
      />

      <div className="flex-1 flex flex-col gap-4 sm:gap-6 px-3 sm:px-8 pt-3 sm:pt-4 pb-8 sm:pb-12 md:pb-36 max-w-7xl mx-auto w-full min-w-0">
        <InstancesEngineBanner
          engine={currentEngine}
          bannerProgress={bannerProgress}
          sectionRef={bannerSectionRef}
        />

        <InstancesEngineIdentity
          engine={currentEngine}
          installedVersions={installedVersions}
          activeVersion={activeVersion}
          isLoadingReleases={isLoadingReleases}
          onRefreshReleases={refreshReleases}
          onOpenFolder={() => void openFolder()}
          onOpenGitHub={openGitHub}
          mobileVersionSelector={
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
          }
          mobileActionButtons={
            <InstancesActionButtons
              selectedVersion={selectedVersion}
              selectedInstalledVersion={selectedInstalledVersion}
              selectedTask={selectedTask}
              activeVersion={activeVersion}
              isUninstalling={isUninstalling}
              isInstallStarting={isInstallStarting}
              isEngineRunning={isEngineRunning}
              formattedSessionDuration={formattedSessionDuration}
              recommendedAsset={recommendedAsset}
              busyPhase={busyPhase}
              busyLabel={busyLabel}
              busyDetail={busyDetail}
              smoothProgress={smoothProgress}
              onCancelDownload={cancelDownload}
              onInstallSelected={handleInstallClick}
              onSetSelectedAsDefault={() => void setSelectedAsDefault()}
              onLaunchSelected={launchSelectedVersion}
              onUninstallSelected={uninstallSelectedVersion}
              onStopEngine={stopEngine}
            />
          }
        />

        {releasesError && (
          <InstancesReleasesError
            error={releasesError}
            isLoading={isLoadingReleases}
            onRetry={refreshReleases}
          />
        )}

        <InstancesDocumentation
          engine={currentEngine}
          selectedVersion={selectedVersion}
          selectedRelease={selectedRelease}
          descriptionTab={descriptionTab}
          onTabChange={setDescriptionTab}
          isTranslationActive={isTranslationActive}
          onToggleTranslation={() => setIsTranslationActive((active) => !active)}
          descriptionTitle={descriptionTitle}
          descriptionHtml={descriptionHtml}
          onMarkdownClick={handleMarkdownClick}
        />
      </div>

      <InstancesActionFooter
        currentEngine={currentEngine}
        platform={platform}
        selectedVersion={selectedVersion}
        selectedInstalledVersion={selectedInstalledVersion}
        selectedTask={selectedTask}
        activeVersion={activeVersion}
        versionOptions={versionOptions}
        tasksByVersion={tasksByVersion}
        isLoadingReleases={isLoadingReleases}
        isUninstalling={isUninstalling}
        isInstallStarting={isInstallStarting}
        isEngineRunning={isEngineRunning}
        formattedSessionDuration={formattedSessionDuration}
        onStopEngine={stopEngine}
        recommendedAsset={recommendedAsset}
        busyPhase={busyPhase}
        busyLabel={busyLabel}
        busyDetail={busyDetail}
        smoothProgress={smoothProgress}
        onSelectVersion={selectVersion}
        onOpenFolder={(v) => void openFolder(v)}
        onSetDefault={(v) => void setDefaultVersion(v)}
        onDeleteVersion={deleteVersion}
        onLaunchVersion={(v) => void launchVersion(v)}
        onCancelDownload={cancelDownload}
        onInstallSelected={handleInstallClick}
        onSetSelectedAsDefault={() => void setSelectedAsDefault()}
        onLaunchSelected={launchSelectedVersion}
        onUninstallSelected={uninstallSelectedVersion}
      />
    </div>
  )
}

export default InstancesView
