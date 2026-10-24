import React, { useMemo, useRef, useState } from 'react'
import { PlayStateButton } from './play-state-button'
import { formatFileSize, type GameBananaFile } from '../types'
import type { ModModalTab } from './mod-nav-pills'
import {
  CancelAnimatedIcon,
  type CancelAnimatedIconHandle,
} from './cancel-animated-icon'

export type ModActionState =
  | 'play'
  | 'multiplefiles'
  | 'download'
  | 'downloading'
  | 'extracting'
  | 'canceling'
  | 'completed'
  | 'no-files'
  | 'loading'

export type DownloadStatus = 'download' | 'downloading' | 'extracting' | 'completed' | 'error'

export interface ModDetailsActionButtonsProps {
  variant?: 'mobile' | 'desktop'
  isInstalled: boolean
  hasUpdate: boolean
  isUpdating: boolean
  updateProgress: number
  handleUpdateClick: () => void
  isStorageMigrating: boolean
  playStatus: string
  handleStop: () => void
  handleManage: () => void
  handleUninstall: () => void
  isUninstalling: boolean
  isLoading: boolean
  hasNoFiles: boolean
  hasMultipleFiles: boolean
  validFiles: GameBananaFile[]
  setActiveTab: (tab: ModModalTab) => void
  handleDownload: () => void
  handleCancelDownload?: () => void
  singleFileProgress: number
  singleFileStatus: string
  singleFileCurrentFile?: string
  singleFileDownloaded: number
  singleFileTotal: number
  activeDownloadsCount: number
  isDropdownOpen: boolean
}

/**
 * Renders the primary action bar for a mod (Download, Multiple Files, Extracting, Play, Update, Uninstall).
 */
export const ModDetailsActionButtons: React.FC<ModDetailsActionButtonsProps> = ({
  variant = 'desktop',
  isInstalled,
  hasUpdate,
  isUpdating,
  updateProgress,
  handleUpdateClick,
  isStorageMigrating,
  playStatus,
  handleStop,
  handleManage,
  handleUninstall,
  isUninstalling,
  isLoading,
  hasNoFiles,
  hasMultipleFiles,
  validFiles,
  setActiveTab,
  handleDownload,
  handleCancelDownload,
  singleFileProgress,
  singleFileStatus,
  singleFileCurrentFile,
  singleFileDownloaded,
  singleFileTotal,
  activeDownloadsCount,
  isDropdownOpen,
}) => {
  const isDesktop = variant === 'desktop'

  const heightPx = isDesktop ? '48px' : '44px'
  const labelFontSize = isDesktop ? '15px' : '14px'

  const primaryButtonStyle: React.CSSProperties = {
    '--m3e-button-container-height': heightPx,
    '--m3e-button-shape-round': '14px',
    '--m3e-button-label-text-font-size': labelFontSize,
    '--m3e-button-label-text-font-weight': '700',
    '--m3e-button-label-text-tracking': '0.15px',
    '--m3e-button-icon-size': '20px',
    '--m3e-button-icon-label-space': '8px',
    '--m3e-button-leading-space': '18px',
    '--m3e-button-trailing-space': '18px',
    '--m3e-button-filled-container-color': 'var(--md-sys-color-primary)',
    '--m3e-button-filled-label-text-color': 'var(--md-sys-color-on-primary)',
  } as React.CSSProperties

  const tonalButtonStyle: React.CSSProperties = {
    '--m3e-button-container-height': heightPx,
    '--m3e-button-shape-round': '14px',
    '--m3e-button-label-text-font-size': labelFontSize,
    '--m3e-button-label-text-font-weight': '600',
    '--m3e-button-label-text-tracking': '0.15px',
    '--m3e-button-icon-size': '20px',
    '--m3e-button-icon-label-space': '8px',
    '--m3e-button-leading-space': '18px',
    '--m3e-button-trailing-space': '18px',
    '--m3e-button-tonal-container-color': 'var(--md-sys-color-surface-container-highest)',
    '--m3e-button-tonal-label-text-color': 'var(--md-sys-color-on-surface)',
  } as React.CSSProperties

  const isDownloadingOrStarting =
    singleFileStatus === 'downloading' ||
    singleFileStatus === 'starting' ||
    singleFileStatus === 'Starting download...' ||
    (singleFileProgress !== undefined &&
      singleFileProgress >= 0 &&
      singleFileProgress < 99 &&
      singleFileStatus !== 'download' &&
      singleFileStatus !== 'ready')

  const isExtracting =
    singleFileStatus === 'extracting' ||
    singleFileProgress === 99

  const actionState: ModActionState = useMemo(() => {
    if (isLoading) return 'loading'
    if (isInstalled) return 'play'
    if (singleFileProgress === -1 || singleFileStatus === 'canceling') return 'canceling'
    if (singleFileProgress === 100 || singleFileStatus === 'completed') return 'completed'
    if (isExtracting) return 'extracting'
    if (isDownloadingOrStarting) return 'downloading'
    if (hasMultipleFiles || validFiles.length > 1) {
      return 'multiplefiles'
    }
    if (hasNoFiles || validFiles.length === 0) {
      return 'no-files'
    }
    return 'download'
  }, [
    isLoading,
    isInstalled,
    singleFileProgress,
    singleFileStatus,
    isExtracting,
    isDownloadingOrStarting,
    hasMultipleFiles,
    validFiles.length,
    hasNoFiles,
  ])

  const cancelIconRef = useRef<CancelAnimatedIconHandle>(null)
  const [isCancelInitiated, setIsCancelInitiated] = useState(false)
  const [prevActionState, setPrevActionState] = useState(actionState)

  if (prevActionState !== actionState) {
    setPrevActionState(actionState)
    if (actionState !== 'downloading' && actionState !== 'canceling') {
      setIsCancelInitiated(false)
    }
  }

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCancelInitiated) return
    setIsCancelInitiated(true)
    if (cancelIconRef.current) {
      cancelIconRef.current.triggerJumpAndMorph(() => {
        handleCancelDownload?.()
      })
    } else {
      handleCancelDownload?.()
    }
  }

  if (actionState === 'play') {
    return (
      <div className="flex items-center gap-2 md:gap-3 w-full">
        {hasUpdate &&
          (isUpdating ? (
            <m3e-button
              variant="tonal"
              disabled
              className="flex-1 cursor-wait animate-pulse"
              style={
                {
                  ...tonalButtonStyle,
                  '--m3e-button-tonal-container-color': 'rgba(245, 158, 11, 0.2)',
                  '--m3e-button-tonal-label-text-color': '#fcd34d',
                } as React.CSSProperties
              }
            >
              <span
                slot="icon"
                className="material-symbols-rounded animate-spin text-amber-400 text-xl leading-none"
              >
                progress_activity
              </span>
              <span className="font-bold">
                {updateProgress > 0 ? `Updating ${updateProgress}%` : 'Updating...'}
              </span>
            </m3e-button>
          ) : (
            <m3e-button
              variant="filled"
              onClick={handleUpdateClick}
              disabled={isStorageMigrating}
              className={`flex-1 transition-all cursor-pointer shadow-md ${
                isDesktop ? 'hover:scale-[1.02] active:scale-[0.98]' : ''
              } ${isStorageMigrating ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
              style={
                {
                  ...primaryButtonStyle,
                  '--m3e-button-filled-container-color': '#f59e0b',
                  '--m3e-button-filled-label-text-color': '#000000',
                } as React.CSSProperties
              }
              title="A new version or update is available for this mod"
            >
              <span slot="icon" className="material-symbols-rounded text-xl leading-none">
                refresh
              </span>
              <span className="font-bold">Update</span>
            </m3e-button>
          ))}

        <PlayStateButton
          playStatus={playStatus}
          onPlay={handleManage}
          onStop={handleStop}
          label="Play"
          disabled={isStorageMigrating}
          title="Play mod"
          variant={isDesktop ? 'modal-desktop' : 'modal-mobile'}
        />

        <m3e-button
          variant="tonal"
          onClick={handleUninstall}
          disabled={isUninstalling || isStorageMigrating}
          className={`flex-1 transition-all duration-300 font-bold ${
            isStorageMigrating
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:opacity-90 cursor-pointer'
          }`}
          style={
            {
              ...tonalButtonStyle,
              '--m3e-button-tonal-container-color': 'rgba(239, 68, 68, 0.12)',
              '--m3e-button-tonal-label-text-color': 'var(--md-sys-color-error, #f87171)',
            } as React.CSSProperties
          }
          title={
            isStorageMigrating
              ? 'Cannot uninstall while storage migration is in progress'
              : 'Uninstall mod'
          }
        >
          <span
            slot="icon"
            className={`material-symbols-rounded text-xl leading-none ${isUninstalling ? 'animate-spin' : ''}`}
          >
            {isUninstalling ? 'progress_activity' : 'delete'}
          </span>
          <span className="font-bold">
            {isUninstalling ? 'Uninstalling...' : 'Uninstall'}
          </span>
        </m3e-button>
      </div>
    )
  }

  if (actionState === 'loading') {
    return (
      <m3e-button
        variant="tonal"
        disabled
        className="w-full flex items-center justify-center transition-all shadow-md cursor-wait opacity-80"
        style={tonalButtonStyle}
      >
        <span
          slot="icon"
          className="material-symbols-rounded animate-spin text-xl leading-none"
        >
          progress_activity
        </span>
        <span className="font-bold tracking-wide">Processing...</span>
      </m3e-button>
    )
  }

  if (actionState === 'no-files') {
    return (
      <m3e-button
        variant="tonal"
        disabled
        className="w-full flex items-center justify-center opacity-60 cursor-not-allowed"
        style={tonalButtonStyle}
      >
        <span
          slot="icon"
          className="material-symbols-rounded text-xl leading-none pointer-events-none opacity-60"
        >
          download
        </span>
        <span className="font-semibold tracking-wide">No Download Available</span>
      </m3e-button>
    )
  }

  if (actionState === 'canceling') {
    return (
      <m3e-button
        variant="tonal"
        disabled
        className="w-full flex items-center justify-center cursor-wait"
        style={tonalButtonStyle}
      >
        <div slot="icon" className="flex items-center justify-center mr-2">
          <CancelAnimatedIcon
            isCanceling={true}
            size={isDesktop ? 22 : 20}
            color="var(--md-sys-color-primary)"
          />
        </div>
        <span className="font-bold tracking-wide">Canceling...</span>
      </m3e-button>
    )
  }

  if (actionState === 'completed') {
    return (
      <m3e-button
        variant="filled"
        disabled
        className="w-full flex items-center justify-center cursor-default"
        style={primaryButtonStyle}
      >
        <span slot="icon" className="material-symbols-rounded text-xl leading-none">
          check_circle
        </span>
        <span className="font-bold tracking-wide">Completed</span>
      </m3e-button>
    )
  }

  if (actionState === 'extracting') {
    return (
      <m3e-button
        variant="tonal"
        disabled
        className="w-full flex items-center justify-center cursor-wait"
        style={tonalButtonStyle}
      >
        <span
          slot="icon"
          className="material-symbols-rounded animate-spin text-xl shrink-0 leading-none"
        >
          progress_activity
        </span>
        <span className="flex flex-col items-center leading-tight min-w-0 max-w-full overflow-hidden py-0.5">
          <span className="text-[14px] md:text-[15px] font-semibold truncate max-w-full leading-tight text-[var(--md-sys-color-on-surface)]">
            {singleFileStatus &&
            singleFileStatus !== 'download' &&
            singleFileStatus !== 'ready' &&
            singleFileStatus !== 'downloading'
              ? singleFileStatus
              : 'Extracting archive...'}
          </span>
          {singleFileCurrentFile ? (
            <span className="text-[11px] font-normal opacity-75 truncate max-w-[260px] md:max-w-[340px] leading-none mt-1 text-[var(--md-sys-color-on-surface-variant)]">
              {singleFileCurrentFile}
            </span>
          ) : null}
        </span>
      </m3e-button>
    )
  }

  if (actionState === 'downloading') {
    const isStarting =
      singleFileProgress <= 1 ||
      singleFileStatus === 'starting' ||
      singleFileStatus === 'Starting download...'

    return (
      <m3e-button
        variant="filled"
        onClick={handleCancelClick}
        className="w-full relative overflow-hidden select-none group transition-all duration-300 shadow-md cursor-pointer"
        style={primaryButtonStyle}
        title="Click to cancel download"
      >
        {!isStarting && (
          <div
            className="absolute left-0 top-0 bottom-0 bg-[var(--md-sys-color-primary-container)]/40 transition-all duration-300 ease-out z-0 pointer-events-none"
            style={{ width: `${Math.max(0, Math.min(100, singleFileProgress))}%` }}
          />
        )}

        <div
          className={`absolute inset-0 bg-red-600 flex items-center justify-center gap-2.5 transition-opacity duration-200 z-20 cursor-pointer text-white ${
            isCancelInitiated ? 'opacity-100 pointer-events-none' : 'opacity-0 group-hover:opacity-100'
          }`}
          onClick={handleCancelClick}
        >
          <CancelAnimatedIcon
            ref={cancelIconRef}
            isCanceling={isCancelInitiated}
            size={isDesktop ? 22 : 20}
            color="#ffffff"
          />
          <span className="font-bold text-[15px] md:text-[16px] tracking-wide">
            {isCancelInitiated ? 'Canceling...' : 'Cancel Download'}
          </span>
        </div>

        {isStarting ? (
          <div className="flex items-center justify-center gap-2.5 z-10 py-0.5">
            <m3e-circular-progress-indicator
              variant="wavy"
              indeterminate
              style={
                {
                  '--m3e-circular-wavy-progress-indicator-diameter': isDesktop
                    ? '24px'
                    : '22px',
                  '--m3e-circular-progress-indicator-thickness': '3px',
                  '--m3e-circular-wavy-progress-indicator-amplitude': '1.8px',
                  '--m3e-circular-wavy-progress-indicator-wavelength': '12px',
                  '--m3e-progress-indicator-color':
                    'var(--md-sys-color-on-primary)',
                  '--m3e-progress-indicator-track-color': 'transparent',
                } as React.CSSProperties
              }
            />
            <span className="text-[15px] md:text-[16px] font-bold tracking-[0.15px] text-[var(--md-sys-color-on-primary)] leading-tight">
              Starting download...
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2.5 z-10 py-0.5 min-w-0">
            <span
              className="material-symbols-rounded animate-spin text-xl shrink-0 leading-none text-[var(--md-sys-color-on-primary)]"
            >
              progress_activity
            </span>
            <div className="flex flex-col items-center leading-tight min-w-0">
              <span className="text-[15px] md:text-[16px] font-bold tracking-[0.15px] text-[var(--md-sys-color-on-primary)] leading-tight">
                Downloading... {singleFileProgress}%
              </span>
              {singleFileDownloaded > 0 ? (
                <span className="text-[11px] font-medium opacity-85 leading-none mt-1 text-[var(--md-sys-color-on-primary)]">
                  {formatFileSize(singleFileDownloaded)}{' '}
                  {singleFileTotal > 0
                    ? `/ ${formatFileSize(singleFileTotal)}`
                    : ''}
                </span>
              ) : null}
            </div>
          </div>
        )}
      </m3e-button>
    )
  }

  if (actionState === 'multiplefiles') {
    return (
      <m3e-button
        variant="filled"
        onClick={() => setActiveTab('details')}
        className={`w-full relative overflow-hidden cursor-pointer select-none group transition-all duration-300 shadow-md ${
          isDesktop ? 'hover:scale-[1.01] active:scale-[0.99]' : ''
        }`}
        style={primaryButtonStyle}
        title="View all files and download options in Details"
      >
        <span slot="icon" className="material-symbols-rounded text-xl shrink-0 leading-none">
          format_list_bulleted
        </span>
        <span className="flex flex-col items-center justify-center leading-tight py-0.5 min-w-0">
          <span className="text-[15px] md:text-[16px] font-bold tracking-[0.15px] text-[var(--md-sys-color-on-primary)] leading-tight">
            Multiple Files
          </span>
          {activeDownloadsCount > 0 ? (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--md-sys-color-on-primary)] opacity-95 mt-0.5 leading-none">
              <span>Active Downloads</span>
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-[var(--md-sys-color-on-primary)] text-[var(--md-sys-color-primary)] text-[10px] font-black leading-none shadow-sm">
                {activeDownloadsCount}
              </span>
            </span>
          ) : (
            <span className="text-[11px] font-medium text-[var(--md-sys-color-on-primary)]/85 tracking-normal mt-0.5 leading-none">
              {validFiles.length > 1
                ? `${validFiles.length} files available • Choose in Details`
                : 'Choose files in Details'}
            </span>
          )}
        </span>
        <span
          slot="trailing-icon"
          className={`material-symbols-rounded text-xl shrink-0 leading-none transition-transform duration-200 ${
            isDropdownOpen ? 'rotate-180' : ''
          }`}
        >
          expand_less
        </span>
      </m3e-button>
    )
  }

  return (
    <m3e-button
      variant="filled"
      onClick={() => handleDownload()}
      className={`w-full relative overflow-hidden cursor-pointer select-none group transition-all duration-300 shadow-md ${
        isDesktop ? 'hover:scale-[1.01] active:scale-[0.99]' : ''
      }`}
      style={primaryButtonStyle}
      title="Download mod"
    >
      <span
        slot="icon"
        className="material-symbols-rounded filled text-xl shrink-0 leading-none"
      >
        download
      </span>
      <span className="flex flex-col items-center justify-center leading-tight py-0.5 min-w-0">
        <span className="text-[15px] md:text-[16px] font-bold tracking-[0.15px] text-[var(--md-sys-color-on-primary)] leading-tight">
          Download
        </span>
        {validFiles[0]?._nFilesize ? (
          <span className="text-[11px] font-medium text-[var(--md-sys-color-on-primary)]/85 tracking-normal mt-0.5 leading-none">
            {formatFileSize(validFiles[0]._nFilesize)}
          </span>
        ) : null}
      </span>
    </m3e-button>
  )
}

export default ModDetailsActionButtons
