import React from 'react'
import { formatFileSize } from '@/utils/formatters'
import type {
  EngineDefinition,
  EnginePlatform,
  InstalledEngineVersion,
  GitHubReleaseAsset,
  EngineDownloadTask,
} from '@/core/engines'
import type { EngineVersionOption } from '../hooks/use-engine-management'
import { useSmoothProgress } from '../hooks/use-smooth-progress'
import {
  EngineInstallVisual,
  type EngineInstallVisualPhase,
} from './EngineInstallVisual'
import {
  PLATFORM_LABELS,
  VERSION_TRIGGER_STYLE,
  VERSION_MENU_STYLE,
  ACTIONS_MENU_STYLE,
  MENU_LIST_STYLE,
  getVersionActionsMenuId,
  hideMenuById,
  getMenuHeight,
} from '../constants'

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
  const versionMenuHeight = getMenuHeight(versionOptions.length, 40, 60)
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
      className="fixed inset-x-0 bottom-[calc(86px+env(safe-area-inset-bottom))] md:bottom-0 z-30 border-t"
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
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <m3e-button variant="text" style={VERSION_TRIGGER_STYLE}>
              <m3e-menu-trigger for="instances-version-menu"></m3e-menu-trigger>
              <img
                slot="icon"
                src={currentEngine.icon}
                alt=""
                className="w-6 h-6 rounded-md object-contain shrink-0 aspect-square"
                style={{
                  width: '24px',
                  height: '24px',
                  minWidth: '24px',
                  minHeight: '24px',
                  aspectRatio: '1 / 1',
                  objectFit: 'contain',
                }}
              />
              <span className="flex flex-col items-start leading-tight min-w-0">
                <span
                  className="text-[10px] uppercase tracking-wider font-semibold"
                  style={{
                    color: 'var(--md-sys-color-on-surface-variant)',
                  }}
                >
                  Version
                </span>
                <span className="text-sm font-bold truncate max-w-[8rem] sm:max-w-[14rem]">
                  {selectedVersion ?? 'Select a version'}
                </span>
              </span>
              <span
                slot="trailing-icon"
                className="material-symbols-rounded text-[18px] shrink-0"
                style={{
                  color: 'var(--md-sys-color-on-surface-variant)',
                  fontSize: '18px',
                  width: '18px',
                  height: '18px',
                  lineHeight: '18px',
                }}
              >
                expand_less
              </span>
            </m3e-button>

            <m3e-menu
              id="instances-version-menu"
              position-x="after"
              position-y="above"
              style={VERSION_MENU_STYLE}
            >
              {versionOptions.length === 0 ? (
                <m3e-menu-item disabled>
                  <span className="text-sm opacity-70">
                    {isLoadingReleases
                      ? 'Loading versions...'
                      : `No ${PLATFORM_LABELS[platform]} versions available`}
                  </span>
                </m3e-menu-item>
              ) : (
                <m3e-overflow
                  direction="vertical"
                  style={{ width: '100%', height: versionMenuHeight }}
                  thumb-color="var(--md-sys-color-primary)"
                  track-color="var(--md-sys-color-outline-variant)"
                >
                  <div style={MENU_LIST_STYLE}>
                    {versionOptions.map((option, index) => {
                      const isSelected = option.version === selectedVersion
                      const versionTask = tasksByVersion[option.version]
                      const isVersionBusy = Boolean(
                        versionTask &&
                          (versionTask.status === 'downloading' ||
                            versionTask.status === 'extracting' ||
                            versionTask.status === 'canceling'),
                      )
                      const statusLabel = option.isActive
                        ? 'Default'
                        : option.installed
                          ? 'Installed'
                          : 'Available'
                      const assetLabel = option.asset
                        ? `${PLATFORM_LABELS[platform]} · ${formatFileSize(option.asset.size)}`
                        : PLATFORM_LABELS[platform]
                      const actionsMenuId = getVersionActionsMenuId(
                        currentEngine.id,
                        index,
                      )

                      return (
                        <m3e-menu-item
                          key={option.version}
                          checked={isSelected}
                          onClick={() => {
                            onSelectVersion(option.version)
                            hideMenuById('instances-version-menu')
                          }}
                          style={{ margin: '3px 0' }}
                        >
                          <span
                            slot="icon"
                            className="shrink-0 flex items-center justify-center"
                          >
                            {isVersionBusy && versionTask ? (
                              <EngineInstallVisual
                                phase={
                                  versionTask.status === 'canceling'
                                    ? 'canceling'
                                    : versionTask.status === 'extracting'
                                      ? 'extracting'
                                      : 'downloading'
                                }
                                progress={
                                  option.version === selectedVersion
                                    ? smoothProgress
                                    : versionTask.progress
                                }
                                size={24}
                                showRing={false}
                                tone="primary"
                              />
                            ) : (
                              <span
                                className="material-symbols-rounded"
                                style={{ fontSize: '18px' }}
                              >
                                {option.isActive
                                  ? 'check_circle'
                                  : option.installed
                                    ? 'folder_special'
                                    : 'cloud_download'}
                              </span>
                            )}
                          </span>
                          <span className="inline-flex flex-col items-start leading-tight min-w-0 align-middle">
                            <span className="text-sm font-semibold truncate">
                              {option.version}
                            </span>
                            <span className="text-[11px] opacity-70 truncate">
                              {isVersionBusy && versionTask
                                ? `${versionTask.status === 'canceling' ? 'Canceling' : versionTask.status === 'extracting' ? 'Extracting' : `${Math.round(option.version === selectedVersion ? smoothProgress : versionTask.progress)}%`} · ${versionTask.speed || assetLabel}`
                                : `${statusLabel} · ${assetLabel}${
                                    option.release?.prerelease
                                      ? ' · Pre-release'
                                      : ''
                                  }`}
                            </span>
                          </span>
                          {option.installed && (
                            <m3e-menu-trigger
                              for={actionsMenuId}
                              style={{ display: 'none' }}
                            />
                          )}
                        </m3e-menu-item>
                      )
                    })}
                  </div>
                </m3e-overflow>
              )}
            </m3e-menu>

            {versionOptions.map((option, index) => {
              if (!option.installed) return null

              const actionsMenuId = getVersionActionsMenuId(
                currentEngine.id,
                index,
              )

              return (
                <m3e-menu
                  key={actionsMenuId}
                  id={actionsMenuId}
                  className="instances-version-actions-menu max-md:!left-4 max-md:!w-[min(340px,calc(100vw-24px))]"
                  position-x="after"
                  position-y="below"
                  style={ACTIONS_MENU_STYLE}
                >
                  <m3e-menu-item
                    onClick={() => {
                      void onOpenFolder(option.version)
                    }}
                    style={{ margin: '3px 0' }}
                  >
                    <span slot="icon" className="material-symbols-rounded">
                      folder_open
                    </span>
                    <span className="text-sm">Open folder</span>
                  </m3e-menu-item>
                  <m3e-menu-item
                    disabled={option.isActive}
                    onClick={() => {
                      if (!option.isActive) {
                        void onSetDefault(option.version)
                      }
                    }}
                    style={{ margin: '3px 0' }}
                  >
                    <span slot="icon" className="material-symbols-rounded">
                      {option.isActive ? 'check_circle' : 'star'}
                    </span>
                    <span className="text-sm">
                      {option.isActive
                        ? 'Already selected as default'
                        : 'Set default'}
                    </span>
                  </m3e-menu-item>
                  <m3e-menu-item
                    onClick={() => {
                      onDeleteVersion(option.version)
                    }}
                    style={{ margin: '3px 0' }}
                  >
                    <span slot="icon" className="material-symbols-rounded">
                      delete
                    </span>
                    <span className="text-sm">Uninstall</span>
                  </m3e-menu-item>
                  <m3e-menu-item
                    onClick={() => {
                      void onLaunchVersion(option.version)
                    }}
                    style={{ margin: '3px 0' }}
                  >
                    <span slot="icon" className="material-symbols-rounded">
                      play_arrow
                    </span>
                    <span className="text-sm">Quick launch</span>
                  </m3e-menu-item>
                </m3e-menu>
              )
            })}
          </div>

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
                <EngineInstallVisual
                  phase={busyPhase}
                  progress={smoothProgress}
                  size={42}
                  showRing={false}
                  tone="primary"
                />

                <div
                  role="status"
                  aria-live="polite"
                  className="inline-flex flex-col items-center justify-center w-52 h-[42px] px-3.5 py-1 rounded-2xl shadow-sm overflow-hidden shrink-0"
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
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer hover:bg-rose-500/20 text-rose-500 border border-rose-500/40 disabled:opacity-50 disabled:cursor-default"
                  >
                    <span className="material-symbols-rounded text-base">
                      close
                    </span>
                    <span>
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
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 animate-in fade-in duration-300"
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
                )}

                {isEngineRunning && onStopEngine && (
                  <button
                    type="button"
                    onClick={() => {
                      void onStopEngine()
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer hover:bg-rose-500/20 text-rose-500 border border-rose-500/40 active:scale-95 shadow-sm"
                  >
                    <span className="material-symbols-rounded text-base">
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer hover:brightness-110 active:scale-95 shadow-sm"
                  style={{
                    backgroundColor: 'var(--md-sys-color-primary)',
                    color: 'var(--md-sys-color-on-primary)',
                  }}
                >
                  <span className="material-symbols-rounded text-base">
                    play_arrow
                  </span>
                  <span>{isEngineRunning ? 'Relaunch' : 'Run'}</span>
                </button>

                {!isEngineRunning && (
                  <button
                    type="button"
                    onClick={onUninstallSelected}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer hover:bg-rose-500/20 text-rose-500 border border-rose-500/40"
                  >
                    <span className="material-symbols-rounded text-base">
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
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border shrink-0 animate-in fade-in duration-300"
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
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer hover:bg-rose-500/20 text-rose-500 border border-rose-500/40 active:scale-95 shadow-sm"
                      >
                        <span className="material-symbols-rounded text-base">
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
                  className="inline-flex items-center justify-center gap-2.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer hover:brightness-110 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-default disabled:hover:brightness-100"
                  style={{
                    backgroundColor: 'var(--md-sys-color-primary)',
                    color: 'var(--md-sys-color-on-primary)',
                  }}
                >
                  <EngineInstallVisual
                    phase={isInstallStarting ? 'starting' : 'idle'}
                    progress={0}
                    size={26}
                  />
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-xs sm:text-sm font-bold">
                      {isInstallStarting ? 'Starting...' : 'Install'}
                    </span>
                    {recommendedAsset && (
                      <span className="text-[10px] font-mono font-normal opacity-85 leading-tight">
                        {formatFileSize(recommendedAsset.size)}
                      </span>
                    )}
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
