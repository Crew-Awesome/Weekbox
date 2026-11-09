import React from 'react'
import { formatFileSize } from '@/utils/formatters'
import type {
  InstalledEngineVersion,
  GitHubReleaseAsset,
  EngineDownloadTask,
} from '@/core/engines'
import {
  EngineInstallVisual,
  type EngineInstallVisualPhase,
} from './EngineInstallVisual'

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
    <div className="flex items-center gap-2 shrink-0">
      {isUninstalling ? (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-rose-500 border border-rose-500/40 bg-rose-500/10">
          <span className="material-symbols-rounded text-base animate-spin">
            refresh
          </span>
          <span>Uninstalling...</span>
        </div>
      ) : selectedTask &&
      selectedTask.status !== 'completed' &&
      selectedTask.status !== 'error' &&
      !isInstallStarting ? (
        <>
          <span className="hidden sm:inline-flex">
            <EngineInstallVisual
              phase={busyPhase}
              progress={smoothProgress}
              size={42}
              showRing={false}
              tone="primary"
            />
          </span>

          <div
            role="status"
            aria-live="polite"
            className="inline-flex flex-col items-center justify-center w-28 min-[400px]:w-40 sm:w-52 h-[38px] sm:h-[42px] px-2 sm:px-3.5 py-1 rounded-2xl shadow-sm overflow-hidden shrink-0"
            style={{
              backgroundColor:
                selectedTask.status === 'canceling'
                  ? 'var(--md-sys-color-error, #ba1a1a)'
                  : 'var(--md-sys-color-primary)',
              color:
                selectedTask.status === 'canceling'
                  ? 'var(--md-sys-color-on-error, #ffffff)'
                  : 'var(--md-sys-color-on-primary)',
            }}
          >
            <span className="text-xs sm:text-sm font-bold tracking-wide leading-tight truncate w-full text-center">
              {busyLabel}
            </span>
            <span
              className="text-[10px] font-mono leading-tight opacity-80 truncate w-full text-center"
              title={busyDetail}
            >
              {busyDetail || '\u00A0'}
            </span>
          </div>

          {selectedTask.status !== 'extracting' && (
            <button
              type="button"
              onClick={() => {
                if (selectedVersion) onCancelDownload(selectedVersion)
              }}
              disabled={selectedTask.status === 'canceling'}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition cursor-pointer hover:bg-rose-500/20 text-rose-500 border border-rose-500/40 disabled:opacity-50 disabled:cursor-default"
            >
              <span className="material-symbols-rounded text-sm sm:text-base">
                close
              </span>
              <span className="hidden min-[400px]:inline">
                {selectedTask.status === 'canceling'
                  ? 'Canceling...'
                  : 'Cancel'}
              </span>
            </button>
          )}
        </>
      ) : selectedInstalledVersion ? (
        <>
          {isEngineRunning && (
            <div
              className="hidden min-[400px]:inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold border shrink-0 animate-in fade-in duration-300"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--md-sys-color-primary) 12%, transparent)',
                color: 'var(--md-sys-color-primary)',
                borderColor:
                  'color-mix(in srgb, var(--md-sys-color-primary) 35%, transparent)',
              }}
              title="Engine is currently running"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>
                <span className="hidden sm:inline">Running </span>({formattedSessionDuration || '00:00'})
              </span>
            </div>
          )}

          {isEngineRunning && onStopEngine && (
            <button
              type="button"
              onClick={() => {
                void onStopEngine()
              }}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer hover:bg-rose-500/20 text-rose-500 border border-rose-500/40 active:scale-95 shadow-sm"
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
            className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer hover:brightness-110 active:scale-95 shadow-sm"
            style={{
              backgroundColor: 'var(--md-sys-color-primary)',
              color: 'var(--md-sys-color-on-primary)',
            }}
          >
            <span className="material-symbols-rounded text-sm sm:text-base">
              play_arrow
            </span>
            <span>{isEngineRunning ? 'Relaunch' : 'Run'}</span>
          </button>

          {!isEngineRunning && (
            <button
              type="button"
              onClick={onUninstallSelected}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition cursor-pointer hover:bg-rose-500/20 text-rose-500 border border-rose-500/40"
            >
              <span className="material-symbols-rounded text-sm sm:text-base">
                delete
              </span>
              <span className="hidden sm:inline">Uninstall</span>
            </button>
          )}
        </>
      ) : (
        <>
          {isEngineRunning && (
            <>
              <div
                className="hidden min-[400px]:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 animate-in fade-in duration-300"
                style={{
                  backgroundColor:
                    'color-mix(in srgb, var(--md-sys-color-primary) 12%, transparent)',
                  color: 'var(--md-sys-color-primary)',
                  borderColor:
                    'color-mix(in srgb, var(--md-sys-color-primary) 35%, transparent)',
                }}
                title="Engine is currently running"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Running ({formattedSessionDuration || '00:00'})</span>
              </div>

              {onStopEngine && (
                <button
                  type="button"
                  onClick={() => {
                    void onStopEngine()
                  }}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer hover:bg-rose-500/20 text-rose-500 border border-rose-500/40 active:scale-95 shadow-sm"
                >
                  <span className="material-symbols-rounded text-sm sm:text-base">
                    stop
                  </span>
                  <span>Stop</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={onInstallSelected}
            disabled={isInstallStarting || !recommendedAsset}
            className="inline-flex items-center justify-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer hover:brightness-110 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-default disabled:hover:brightness-100"
            style={{
              backgroundColor: 'var(--md-sys-color-primary)',
              color: 'var(--md-sys-color-on-primary)',
            }}
          >
            <EngineInstallVisual
              phase={isInstallStarting ? 'starting' : 'idle'}
              progress={0}
              size={24}
            />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-xs sm:text-sm font-bold">
                {isInstallStarting ? 'Starting...' : 'Install'}
              </span>
              {recommendedAsset && (
                <span className="text-[9px] sm:text-[10px] font-mono font-normal opacity-85 leading-tight">
                  {formatFileSize(recommendedAsset.size)}
                </span>
              )}
            </div>
          </button>
        </>
      )}
    </div>
  )
}
