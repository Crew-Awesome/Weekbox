import React, { useMemo, useRef, useState } from 'react'
import { formatFileSize, type GameBananaFile } from '../types'
import type { ModModalTab } from './mod-nav-pills'
import type { CancelAnimatedIconHandle } from './cancel-animated-icon'
import {
  ModDetailsPlayActions,
  ModDetailsStaticAction,
} from './mod-details-play-actions'
import { ModDetailsTransferButton } from './mod-details-transfer-button'

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
  singleFileStatusText?: string
  singleFileCurrentFile?: string
  singleFileDownloaded: number
  singleFileTotal: number
  activeDownloadsCount: number
  isDropdownOpen: boolean
}

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
  singleFileStatusText,
  singleFileCurrentFile,
  singleFileDownloaded,
  singleFileTotal,
  activeDownloadsCount,
  isDropdownOpen,
}) => {
  const isDesktop = variant === 'desktop'
  const heightPx = isDesktop ? '48px' : '44px'
  const labelFontSize = isDesktop ? '15px' : '14px'

  const baseButtonStyle: React.CSSProperties = {
    '--m3e-button-container-height': heightPx,
    '--m3e-button-shape-round': '14px',
    '--m3e-button-label-text-font-size': labelFontSize,
    '--m3e-button-label-text-tracking': '0.15px',
    '--m3e-button-icon-size': '20px',
    '--m3e-button-icon-label-space': '8px',
    '--m3e-button-leading-space': '18px',
    '--m3e-button-trailing-space': '18px',
  } as React.CSSProperties

  const primaryButtonStyle: React.CSSProperties = {
    ...baseButtonStyle,
    '--m3e-button-label-text-font-weight': '700',
    '--m3e-button-filled-container-color': 'var(--md-sys-color-primary)',
    '--m3e-button-filled-label-text-color': 'var(--md-sys-color-on-primary)',
  } as React.CSSProperties

  const tonalButtonStyle: React.CSSProperties = {
    ...baseButtonStyle,
    '--m3e-button-label-text-font-weight': '600',
    '--m3e-button-tonal-container-color': 'var(--md-sys-color-surface-container-highest)',
    '--m3e-button-tonal-label-text-color': 'var(--md-sys-color-on-surface)',
  } as React.CSSProperties

  const isDownloading = singleFileStatus === 'downloading'
  const isExtracting = singleFileStatus === 'extracting'
  const isCanceling =
    singleFileProgress === -1 || singleFileStatus === 'canceling'
  const isCompleted = singleFileStatus === 'completed'

  const actionState: ModActionState = useMemo(() => {
    if (isLoading) return 'loading'
    if (isCanceling) return 'canceling'
    if (isExtracting) return 'extracting'
    if (isDownloading) return 'downloading'
    if (isInstalled) return 'play'
    if (isCompleted) return 'completed'
    if (hasMultipleFiles || validFiles.length > 1) return 'multiplefiles'
    if (hasNoFiles || validFiles.length === 0) return 'no-files'
    return 'download'
  }, [
    isLoading,
    isCanceling,
    isExtracting,
    isDownloading,
    isInstalled,
    isCompleted,
    hasMultipleFiles,
    validFiles.length,
    hasNoFiles,
  ])

  const cancelIconRef = useRef<CancelAnimatedIconHandle>(null)
  const [isCancelInitiated, setIsCancelInitiated] = useState(false)
  const [prevActionState, setPrevActionState] = useState(actionState)
  const [isHovered, setIsHovered] = useState(false)

  if (prevActionState !== actionState) {
    setPrevActionState(actionState)
    if (actionState !== 'downloading' && actionState !== 'canceling') {
      setIsCancelInitiated(false)
      setIsHovered(false)
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
      <ModDetailsPlayActions
        isDesktop={isDesktop}
        hasUpdate={hasUpdate}
        isUpdating={isUpdating}
        updateProgress={updateProgress}
        handleUpdateClick={handleUpdateClick}
        isStorageMigrating={isStorageMigrating}
        playStatus={playStatus}
        handleStop={handleStop}
        handleManage={handleManage}
        handleUninstall={handleUninstall}
        isUninstalling={isUninstalling}
        primaryButtonStyle={primaryButtonStyle}
        tonalButtonStyle={tonalButtonStyle}
      />
    )
  }

  if (
    actionState === 'loading' ||
    actionState === 'no-files' ||
    actionState === 'canceling' ||
    actionState === 'completed'
  ) {
    return (
      <ModDetailsStaticAction
        actionState={actionState}
        isDesktop={isDesktop}
        primaryButtonStyle={primaryButtonStyle}
        tonalButtonStyle={tonalButtonStyle}
      />
    )
  }

  if (actionState === 'extracting' || actionState === 'downloading') {
    return (
      <ModDetailsTransferButton
        mode={actionState}
        isDesktop={isDesktop}
        primaryButtonStyle={primaryButtonStyle}
        singleFileProgress={singleFileProgress}
        singleFileStatusText={singleFileStatusText}
        singleFileCurrentFile={singleFileCurrentFile}
        singleFileDownloaded={singleFileDownloaded}
        singleFileTotal={singleFileTotal}
        isHovered={isHovered}
        setIsHovered={setIsHovered}
        isCancelInitiated={isCancelInitiated}
        cancelIconRef={cancelIconRef}
        onCancelClick={handleCancelClick}
      />
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
