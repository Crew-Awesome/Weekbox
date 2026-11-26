import React from 'react'
import type {
  InstalledEngineVersion,
  GitHubReleaseAsset,
  EngineDownloadTask,
} from '@/core/engines'
import type { EngineInstallVisualPhase } from './EngineInstallVisual'
import { EngineRunningMorphTime } from './EngineRunningMorphTime'
import { InstancesInstallMorphControl } from './InstancesInstallMorphControl'

export interface InstancesActionButtonsProps {
  selectedVersion: string | null
  selectedInstalledVersion?: InstalledEngineVersion
  selectedTask?: EngineDownloadTask
  activeVersion: string | null
  isUninstalling: boolean
  isInstallStarting: boolean
  isEngineRunning?: boolean
  formattedSessionDuration?: string
  recommendedAsset?: GitHubReleaseAsset
  busyPhase: EngineInstallVisualPhase
  busyLabel: string
  busyDetail: string
  smoothProgress: number
  onCancelDownload: (version: string) => void
  onInstallSelected: () => void
  onSetSelectedAsDefault: () => void
  onLaunchSelected: () => void
  onUninstallSelected: () => void
  onStopEngine?: () => Promise<boolean>
}

export const InstancesActionButtons: React.FC<InstancesActionButtonsProps> = ({
  selectedVersion,
  selectedInstalledVersion,
  selectedTask,
  activeVersion,
  isUninstalling,
  isInstallStarting,
  isEngineRunning = false,
  formattedSessionDuration = '',
  recommendedAsset,
  busyPhase,
  busyLabel,
  busyDetail,
  smoothProgress,
  onCancelDownload,
  onInstallSelected,
  onSetSelectedAsDefault,
  onLaunchSelected,
  onUninstallSelected,
  onStopEngine,
}) => {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
      {isUninstalling ? (
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-[var(--md-sys-color-error)] border border-[var(--md-sys-color-error)]/40 bg-[var(--md-sys-color-error-container)]/20">
          <span className="material-symbols-rounded text-base animate-spin">refresh</span>
          <span>Uninstalling...</span>
        </div>
      ) : selectedInstalledVersion &&
      !(selectedTask && selectedTask.status !== 'completed' && selectedTask.status !== 'error') ? (
        <>
          {isEngineRunning && (
            <EngineRunningMorphTime duration={formattedSessionDuration} />
          )}

          {isEngineRunning && onStopEngine && (
            <button
              type="button"
              onClick={() => {
                void onStopEngine()
              }}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer hover:bg-[var(--md-sys-color-error)]/20 text-[var(--md-sys-color-error)] border border-[var(--md-sys-color-error)]/40 active:scale-95 shadow-sm"
            >
              <span className="material-symbols-rounded text-sm sm:text-base">
                stop
              </span>
              <span>Stop</span>
            </button>
          )}

          {selectedVersion && selectedVersion !== activeVersion && !isEngineRunning && (
            <button
              type="button"
              onClick={() => {
                void onSetSelectedAsDefault()
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer hover:opacity-90"
              style={{
                backgroundColor:
                  'var(--md-sys-color-secondary-container)',
                color: 'var(--md-sys-color-on-secondary-container)',
              }}
            >
              <span className="material-symbols-rounded text-base">
                star
              </span>
              <span>Set default</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLaunchSelected}
            className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer hover:brightness-110 active:scale-95 shadow-sm shrink-0"
            style={{
              backgroundColor: 'var(--md-sys-color-primary)',
              color: 'var(--md-sys-color-on-primary)',
            }}
          >
            <span className="material-symbols-rounded text-sm sm:text-base">play_arrow</span>
            <span>{isEngineRunning ? 'Relaunch' : 'Run'}</span>
          </button>

          {!isEngineRunning && (
            <button
              type="button"
              onClick={onUninstallSelected}
              className="inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto gap-1 sm:gap-1.5 px-0 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition cursor-pointer hover:bg-[var(--md-sys-color-error)]/20 text-[var(--md-sys-color-error)] border border-[var(--md-sys-color-error)]/40 shrink-0"
              title="Uninstall version"
            >
              <span className="material-symbols-rounded text-sm sm:text-base">delete</span>
              <span className="hidden sm:inline">Uninstall</span>
            </button>
          )}
        </>
      ) : (
        <>
          {isEngineRunning && (
            <>
              <EngineRunningMorphTime duration={formattedSessionDuration} />

              {onStopEngine && (
                <button
                  type="button"
                  onClick={() => {
                    void onStopEngine()
                  }}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer hover:bg-[var(--md-sys-color-error)]/20 text-[var(--md-sys-color-error)] border border-[var(--md-sys-color-error)]/40 active:scale-95 shadow-sm shrink-0"
                >
                  <span className="material-symbols-rounded text-sm sm:text-base">stop</span>
                  <span>Stop</span>
                </button>
              )}
            </>
          )}

          <InstancesInstallMorphControl
            selectedVersion={selectedVersion}
            selectedTask={selectedTask}
            isInstallStarting={isInstallStarting}
            recommendedAsset={recommendedAsset}
            busyPhase={busyPhase}
            busyLabel={busyLabel}
            busyDetail={busyDetail}
            smoothProgress={smoothProgress}
            onInstallSelected={onInstallSelected}
            onCancelDownload={onCancelDownload}
          />
        </>
      )}
    </div>
  )
}
