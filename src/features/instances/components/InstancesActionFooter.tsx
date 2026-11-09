import React from 'react'
import type {
  EngineDefinition,
  EnginePlatform,
  InstalledEngineVersion,
  GitHubReleaseAsset,
  EngineDownloadTask,
} from '@/core/engines'
import type { EngineVersionOption } from '../hooks/use-engine-management'
import { useSmoothProgress } from '../hooks/use-smooth-progress'
import type { EngineInstallVisualPhase } from './EngineInstallVisual'
import { InstancesVersionSelector } from './InstancesVersionSelector'
import { InstancesActionButtons } from './InstancesActionButtons'

export interface InstancesActionFooterProps {
  currentEngine: EngineDefinition
  platform: EnginePlatform
  selectedVersion: string | null
  selectedInstalledVersion?: InstalledEngineVersion
  selectedTask?: EngineDownloadTask
  activeVersion: string | null
  versionOptions: EngineVersionOption[]
  tasksByVersion: Record<string, EngineDownloadTask>
  isLoadingReleases: boolean
  isUninstalling: boolean
  isInstallStarting: boolean
  isEngineRunning?: boolean
  formattedSessionDuration?: string
  recommendedAsset?: GitHubReleaseAsset
  busyPhase: EngineInstallVisualPhase
  busyLabel: string
  busyDetail: string
  onSelectVersion: (version: string) => void
  onOpenFolder: (version?: string) => void
  onSetDefault: (version: string) => void
  onDeleteVersion: (version: string) => void
  onLaunchVersion: (version: string) => void
  onCancelDownload: (version: string) => void
  onInstallSelected: () => void
  onSetSelectedAsDefault: () => void
  onLaunchSelected: () => void
  onUninstallSelected: () => void
  onStopEngine?: () => Promise<boolean>
}

export const InstancesActionFooter: React.FC<InstancesActionFooterProps> = ({
  currentEngine,
  platform,
  selectedVersion,
  selectedInstalledVersion,
  selectedTask,
  activeVersion,
  versionOptions,
  tasksByVersion,
  isLoadingReleases,
  isUninstalling,
  isInstallStarting,
  isEngineRunning = false,
  formattedSessionDuration = '',
  recommendedAsset,
  busyPhase,
  busyLabel,
  busyDetail,
  onSelectVersion,
  onOpenFolder,
  onSetDefault,
  onDeleteVersion,
  onLaunchVersion,
  onCancelDownload,
  onInstallSelected,
  onSetSelectedAsDefault,
  onLaunchSelected,
  onUninstallSelected,
  onStopEngine,
}) => {
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

  return (
    <footer
      className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:bottom-0 z-30 border-t"
      style={{
        backgroundColor:
          'color-mix(in srgb, var(--md-sys-color-surface-container) 86%, transparent)',
        borderColor:
          'color-mix(in srgb, var(--md-sys-color-outline-variant) 70%, transparent)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        boxShadow:
          '0 -10px 30px color-mix(in srgb, var(--md-sys-color-scrim) 10%, transparent)',
      }}
    >
      {((isBusy && selectedTask) || isUninstalling) && (
        <div className="absolute -top-[2px] left-0 right-0 z-10 pointer-events-none overflow-visible transition-opacity duration-300">
          <m3e-linear-progress-indicator
            variant="wavy"
            value={
              isUninstalling
                ? 100
                : Math.round(smoothProgress * 10) / 10
            }
            max="100"
            mode={
              isUninstalling ||
              selectedTask?.status === 'extracting' ||
              selectedTask?.status === 'canceling'
                ? 'indeterminate'
                : 'determinate'
            }
            style={
              {
                width: '100%',
                display: 'block',
                '--m3e-linear-progress-indicator-thickness': '4px',
                '--m3e-linear-wavy-progress-indicator-amplitude': '2.5px',
                '--m3e-linear-wavy-progress-indicator-wavelength': '18px',
                '--m3e-progress-indicator-color':
                  isUninstalling || selectedTask?.status === 'canceling'
                    ? 'var(--md-sys-color-error, #ba1a1a)'
                    : 'var(--md-sys-color-primary)',
                '--m3e-progress-indicator-track-color':
                  isUninstalling || selectedTask?.status === 'canceling'
                    ? 'color-mix(in srgb, var(--md-sys-color-error, #ba1a1a) 20%, transparent)'
                    : 'color-mix(in srgb, var(--md-sys-color-primary) 18%, transparent)',
              } as React.CSSProperties
            }
          />
        </div>
      )}

      <div className="relative md:pl-[92px]">
        <div className="max-w-7xl mx-auto w-full px-2.5 sm:px-6 md:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3">
          <InstancesVersionSelector
            currentEngine={currentEngine}
            platform={platform}
            selectedVersion={selectedVersion}
            versionOptions={versionOptions}
            tasksByVersion={tasksByVersion}
            isLoadingReleases={isLoadingReleases}
            smoothProgress={smoothProgress}
            onSelectVersion={onSelectVersion}
            onOpenFolder={onOpenFolder}
            onSetDefault={onSetDefault}
            onDeleteVersion={onDeleteVersion}
            onLaunchVersion={onLaunchVersion}
          />

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
            onCancelDownload={onCancelDownload}
            onInstallSelected={onInstallSelected}
            onSetSelectedAsDefault={onSetSelectedAsDefault}
            onLaunchSelected={onLaunchSelected}
            onUninstallSelected={onUninstallSelected}
            onStopEngine={onStopEngine}
          />
        </div>
      </div>
    </footer>
  )
}
