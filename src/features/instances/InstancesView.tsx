import React from 'react'
import { Topbar } from '@/ui/topbar'
import { useEnginePlaytime, useEngineProcessState } from '@/core/engines'
import { useEngineManagement } from './hooks/use-engine-management'
import { useBannerProgress } from './hooks/use-banner-progress'
import { useInstancesViewState } from './hooks/use-instances-view-state'
import {
  InstancesTopbarUnderlay,
  InstancesEngineBanner,
  InstancesEngineMenu,
  InstancesEngineIdentity,
  InstancesDocumentation,
  InstancesActionFooter,
  InstancesReleasesError,
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

  const { formattedPlaytime } = useEnginePlaytime(selectedEngineId)
  const {
    isRunning: isEngineRunning,
    formattedSessionDuration,
    stopEngine,
  } = useEngineProcessState(selectedEngineId, selectedVersion ?? undefined)

  const versionsSubtitle = `${installedVersions.length} version${
    installedVersions.length === 1 ? '' : 's'
  } installed · ${formattedPlaytime} played${
    isEngineRunning ? ` · Playing now (${formattedSessionDuration})` : ''
  }${activeVersion ? ` · Default ${activeVersion}` : ''}`

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
        subtitle={versionsSubtitle}
        autoHideOnScroll={false}
        underlay={
          <InstancesTopbarUnderlay
            banner={currentEngine.banner}
            progress={bannerProgress}
          />
        }
      />

      <div className="flex-1 flex flex-col gap-5 sm:gap-6 px-4 sm:px-8 pt-4 pb-[calc(10.5rem+env(safe-area-inset-bottom))] md:pb-36 max-w-7xl mx-auto w-full">
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
