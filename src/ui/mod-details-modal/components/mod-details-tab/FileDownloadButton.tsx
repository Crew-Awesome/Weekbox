import React, { useState } from 'react'
import type { GameBananaFile } from '../../types'

export interface FileDownloadButtonProps {
  file: GameBananaFile
  task?: { progress?: number; status?: string }
  onDownloadFile: (url: string, id: string) => void
  onCancelDownload?: (id: string) => void
}

export const FileDownloadButton: React.FC<FileDownloadButtonProps> = ({
  file,
  task,
  onDownloadFile,
  onCancelDownload,
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const prog = task?.progress ?? 0
  const isExtracting = task?.status === 'extracting'
  const isDownloading =
    task?.status === 'downloading' ||
    (task?.progress !== undefined &&
      task.progress >= 0 &&
      task.progress < 100 &&
      !isExtracting)
  const isActive = isDownloading || isExtracting
  const showCancel = isHovered && isDownloading && !isExtracting && Boolean(onCancelDownload)

  const commonTokens: React.CSSProperties = {
    '--m3e-button-shape-round': '12px',
    '--m3e-button-icon-size': '14px',
    '--m3e-button-icon-label-space': '6px',
    '--m3e-button-leading-space': '12px',
    '--m3e-button-trailing-space': '12px',
    '--m3e-button-container-height': '32px',
    '--m3e-button-label-text-font-size': '12px',
    '--m3e-button-label-text-font-weight': '700',
    '--m3e-button-label-text-line-height': '1',
    borderRadius: '12px',
  }

  const buttonStyle: React.CSSProperties = (showCancel
    ? {
        ...commonTokens,
        '--m3e-button-container-color': 'var(--md-sys-color-error)',
        '--m3e-filled-button-container-color': 'var(--md-sys-color-error)',
        '--m3e-button-label-text-color': 'var(--md-sys-color-on-error)',
        '--m3e-filled-button-label-text-color': 'var(--md-sys-color-on-error)',
        '--m3e-button-hover-label-text-color': 'var(--md-sys-color-on-error)',
        '--m3e-filled-button-hover-label-text-color': 'var(--md-sys-color-on-error)',
        '--m3e-button-state-layer-color': 'var(--md-sys-color-on-error)',
        '--m3e-filled-button-state-layer-color': 'var(--md-sys-color-on-error)',
        '--m3e-button-hover-state-layer-color': 'var(--md-sys-color-on-error)',
        '--m3e-filled-button-hover-state-layer-color': 'var(--md-sys-color-on-error)',
        '--m3e-button-filled-container-color': 'var(--md-sys-color-error)',
        '--m3e-button-filled-label-text-color': 'var(--md-sys-color-on-error)',
      }
    : {
        ...commonTokens,
        '--m3e-button-container-color': 'var(--md-sys-color-primary)',
        '--m3e-filled-button-container-color': 'var(--md-sys-color-primary)',
        '--m3e-button-label-text-color': 'var(--md-sys-color-on-primary)',
        '--m3e-filled-button-label-text-color': 'var(--md-sys-color-on-primary)',
        '--m3e-button-filled-container-color': 'var(--md-sys-color-primary)',
        '--m3e-button-filled-label-text-color': 'var(--md-sys-color-on-primary)',
      }) as React.CSSProperties

  return (
    <m3e-button
      variant="filled"
      onClick={(e: React.MouseEvent) => {
        if (isExtracting) {
          e.preventDefault()
          return
        }
        if (isActive && onCancelDownload) {
          onCancelDownload(String(file._idRow))
        } else {
          onDownloadFile(file._sDownloadUrl!, String(file._idRow))
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`shrink-0 text-xs font-bold transition-all rounded-[12px] overflow-hidden ${
        isExtracting ? 'cursor-default' : 'cursor-pointer'
      }`}
      style={buttonStyle}
      title={
        isExtracting
          ? 'Extracting'
          : showCancel
            ? 'Click to cancel download'
            : isActive
              ? 'Downloading'
              : 'Download file'
      }
    >
      {isActive ? (
        showCancel ? (
          <>
            <span
              slot="icon"
              className="material-symbols-rounded text-sm shrink-0 leading-none flex items-center justify-center"
            >
              close
            </span>
            <span className="leading-none flex items-center">Cancel</span>
          </>
        ) : (
          <>
            <m3e-circular-progress-indicator
              slot="icon"
              variant="wavy"
              value={!isExtracting && prog > 1 ? prog : undefined}
              indeterminate={isExtracting || prog <= 1}
              title={isExtracting ? 'Extracting' : undefined}
              className="shrink-0 flex items-center justify-center"
              style={
                {
                  '--m3e-circular-wavy-progress-indicator-diameter': '14px',
                  '--m3e-circular-flat-progress-indicator-diameter': '14px',
                  '--m3e-circular-progress-indicator-thickness': '2px',
                  '--m3e-circular-wavy-progress-indicator-amplitude': '1.2px',
                  '--m3e-circular-wavy-progress-indicator-wavelength': '7px',
                  '--m3e-progress-indicator-color':
                    'var(--md-sys-color-on-primary)',
                  '--m3e-progress-indicator-track-color':
                    !isExtracting && prog > 1
                      ? 'rgba(255, 255, 255, 0.25)'
                      : 'transparent',
                  width: '14px',
                  height: '14px',
                } as React.CSSProperties
              }
            />
            <span className="leading-none flex items-center">
              {isExtracting
                ? prog > 1
                  ? `Extracting ${prog}%`
                  : 'Extracting...'
                : prog <= 1
                  ? 'Starting...'
                  : `${prog}%`}
            </span>
          </>
        )
      ) : (
        <>
          <span
            slot="icon"
            className="material-symbols-rounded text-sm shrink-0 leading-none flex items-center justify-center"
          >
            download
          </span>
          <span className="leading-none flex items-center">Download</span>
        </>
      )}
    </m3e-button>
  )
}
