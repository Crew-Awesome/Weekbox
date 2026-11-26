import React from 'react'
import { formatFileSize } from '@/utils/formatters'
import { useUiStyle } from '@/utils/ui-style'
import type {
  EngineDefinition,
  EnginePlatform,
  InstalledEngineVersion,
  GitHubReleaseAsset,
  EngineDownloadTask,
} from '@/core/engines'
import type { EngineVersionOption } from '../hooks/use-engine-management'
import type { InstanceDisplayDefinition } from '../hooks/use-executable-instances'
import { useSmoothProgress } from '../hooks/use-smooth-progress'
import { VERSION_TRIGGER_STYLE } from '../constants'
import type { EngineInstallVisualPhase } from './EngineInstallVisual'
import { InstancesVersionSelector } from './InstancesVersionSelector'
import { InstancesActionButtons } from './InstancesActionButtons'

export interface InstancesActionFooterProps {
  currentEngine: InstanceDisplayDefinition
  engineDef?: EngineDefinition
  isExecutableInstance?: boolean
  executableExeName?: string | null
  executableFileSize?: number
  executableHasWarning?: boolean
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
  smoothProgress?: number
}

export const InstancesActionFooter: React.FC<InstancesActionFooterProps> = ({
  currentEngine,
  engineDef,
  isExecutableInstance = false,
  executableExeName,
  executableFileSize = 0,
  executableHasWarning = false,
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
  smoothProgress: smoothProgressProp,
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
  const isHomeStyle = useUiStyle() === 'home'
  const isBusy = Boolean(
    selectedTask &&
      (selectedTask.status === 'downloading' ||
        selectedTask.status === 'extracting' ||
        selectedTask.status === 'canceling'),
  )

  const rawProgress = isUninstalling
    ? 100
    : Math.max(0, Math.min(100, selectedTask?.progress || 0))

  const internalSmoothProgress = useSmoothProgress(
    rawProgress,
    isBusy || isUninstalling,
  )
  const smoothProgress = smoothProgressProp ?? internalSmoothProgress

  return (
    <footer
      className="hidden md:block fixed inset-x-0 bottom-0 z-30 border-t"
      style={
        isHomeStyle
          ? {
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }
          : {
              backgroundColor:
                'color-mix(in srgb, var(--md-sys-color-surface-container) 92%, transparent)',
              borderColor:
                'color-mix(in srgb, var(--md-sys-color-outline-variant) 50%, transparent)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              boxShadow:
                '0 -10px 30px color-mix(in srgb, var(--md-sys-color-scrim) 10%, transparent)',
            }
      }
    >
      {((isBusy && selectedTask) || isUninstalling) && (
        <div className="absolute -top-[2px] left-0 right-0 z-10 pointer-events-none overflow-visible transition-opacity duration-300">
          <m3e-linear-progress-indicator
            variant={isHomeStyle ? 'flat' : 'wavy'}
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
                '--m3e-linear-wavy-progress-indicator-amplitude': `${
                  smoothProgress >= 92
                    ? Math.max(0.4, 2.5 * (1 - (smoothProgress - 92) / 8)).toFixed(2)
                    : '2.5'
                }px`,
                '--m3e-linear-wavy-progress-indicator-wavelength': '18px',
                '--m3e-progress-indicator-color':
                  isUninstalling || selectedTask?.status === 'canceling'
                    ? 'var(--md-sys-color-error)'
                    : 'var(--md-sys-color-primary)',
                '--m3e-progress-indicator-track-color':
                  isUninstalling || selectedTask?.status === 'canceling'
                    ? 'color-mix(in srgb, var(--md-sys-color-error) 20%, transparent)'
                    : 'color-mix(in srgb, var(--md-sys-color-primary) 18%, transparent)',
              } as React.CSSProperties
            }
          />
        </div>
      )}

      <div className="relative md:pl-[92px]">
        <div className="max-w-7xl mx-auto w-full px-2 sm:px-6 md:px-8 py-1.5 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-3 min-w-0">
          {isExecutableInstance || !engineDef ? (
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <m3e-button
                variant="text"
                style={VERSION_TRIGGER_STYLE}
                className="min-w-0 max-w-full"
                onClick={() => onOpenFolder()}
                title="Open mod folder"
              >
                <img
                  slot="icon"
                  src={currentEngine.icon}
                  alt=""
                  className={`w-6 h-6 rounded-md object-contain shrink-0 aspect-square transition-all ${
                    executableHasWarning ? 'grayscale brightness-90 opacity-75' : ''
                  }`}
                  style={{
                    width: '24px',
                    height: '24px',
                    minWidth: '24px',
                    minHeight: '24px',
                    aspectRatio: '1 / 1',
                    objectFit: 'contain',
                  }}
                />
                <span className="flex flex-col items-start leading-tight min-w-0 flex-1">
                  <span
                    className="text-[10px] uppercase tracking-wider font-semibold"
                    style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
                  >
                    Executable
                  </span>
                  <span className="text-xs sm:text-sm font-bold truncate max-w-[14rem]">
                    {executableExeName || currentEngine.name}
                    {executableFileSize > 0
                      ? ` · ${formatFileSize(executableFileSize)}`
                      : ''}
                  </span>
                </span>
                <span
                  slot="trailing-icon"
                  className="material-symbols-rounded text-[18px] shrink-0"
                  style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
                >
                  folder_open
                </span>
              </m3e-button>
            </div>
          ) : (
            <InstancesVersionSelector
              currentEngine={engineDef}
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
          )}

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
