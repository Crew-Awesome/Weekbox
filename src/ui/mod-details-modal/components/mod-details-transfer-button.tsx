import React from 'react'
import { formatFileSize } from '../types'
import {
  CancelAnimatedIcon,
  type CancelAnimatedIconHandle,
} from './cancel-animated-icon'

export interface ModDetailsTransferButtonProps {
  mode: 'extracting' | 'downloading'
  isDesktop: boolean
  primaryButtonStyle: React.CSSProperties
  singleFileProgress: number
  singleFileStatusText?: string
  singleFileCurrentFile?: string
  singleFileDownloaded: number
  singleFileTotal: number
  isHovered: boolean
  setIsHovered: (hovered: boolean) => void
  isCancelInitiated: boolean
  cancelIconRef: React.RefObject<CancelAnimatedIconHandle | null>
  onCancelClick: (e: React.MouseEvent) => void
}

export const ModDetailsTransferButton: React.FC<ModDetailsTransferButtonProps> = ({
  mode,
  isDesktop,
  primaryButtonStyle,
  singleFileProgress,
  singleFileStatusText,
  singleFileCurrentFile,
  singleFileDownloaded,
  singleFileTotal,
  isHovered,
  setIsHovered,
  isCancelInitiated,
  cancelIconRef,
  onCancelClick,
}) => {
  if (mode === 'extracting') {
    return (
      <m3e-button
        variant="filled"
        aria-busy="true"
        onClick={(e: React.MouseEvent) => e.preventDefault()}
        className="w-full relative overflow-hidden select-none transition-all duration-300 shadow-md cursor-default rounded-[14px]"
        style={{ ...primaryButtonStyle, borderRadius: '14px' }}
        title="Extracting"
      >
        {singleFileProgress > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 bg-[var(--md-sys-color-primary-container)]/40 transition-all duration-300 ease-out z-0 pointer-events-none rounded-[14px]"
            style={{ width: `${Math.max(0, Math.min(100, singleFileProgress))}%` }}
          />
        )}

        <div className="flex flex-col items-center justify-center leading-tight z-10 py-0.5 min-w-0 max-w-full px-2">
          <div className="flex items-center justify-center gap-2 min-w-0 max-w-full">
            <m3e-circular-progress-indicator
              variant="wavy"
              indeterminate
              title="Extracting"
              className="shrink-0"
              style={
                {
                  '--m3e-circular-wavy-progress-indicator-diameter': isDesktop
                    ? '20px'
                    : '18px',
                  '--m3e-circular-flat-progress-indicator-diameter': isDesktop
                    ? '20px'
                    : '18px',
                  '--m3e-circular-progress-indicator-thickness': '2.5px',
                  '--m3e-circular-wavy-progress-indicator-amplitude': '1.5px',
                  '--m3e-circular-wavy-progress-indicator-wavelength': '10px',
                  '--m3e-progress-indicator-color':
                    'var(--md-sys-color-on-primary)',
                  '--m3e-progress-indicator-track-color': 'transparent',
                } as React.CSSProperties
              }
            />
            <span className="text-[15px] md:text-[16px] font-bold tracking-[0.15px] text-[var(--md-sys-color-on-primary)] leading-tight truncate">
              {singleFileProgress > 1
                ? `Extracting... ${singleFileProgress}%`
                : singleFileStatusText || 'Extracting...'}
            </span>
          </div>
          {singleFileCurrentFile ? (
            <span className="text-[11px] font-medium opacity-85 leading-none mt-1 text-[var(--md-sys-color-on-primary)] truncate max-w-[240px] md:max-w-[340px]">
              {singleFileCurrentFile}
            </span>
          ) : singleFileDownloaded > 0 ? (
            <span className="text-[11px] font-medium opacity-85 leading-none mt-1 text-[var(--md-sys-color-on-primary)]">
              {formatFileSize(singleFileDownloaded)}{' '}
              {singleFileTotal > 0
                ? `/ ${formatFileSize(singleFileTotal)}`
                : ''}
            </span>
          ) : null}
        </div>
      </m3e-button>
    )
  }

  const isStarting = singleFileProgress <= 1
  const showCancelState = isHovered || isCancelInitiated

  const dynamicButtonStyle: React.CSSProperties = (showCancelState
    ? {
        ...primaryButtonStyle,
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
        '--m3e-button-shape-round': '14px',
        borderRadius: '14px',
      }
    : {
        ...primaryButtonStyle,
        '--m3e-button-shape-round': '14px',
        borderRadius: '14px',
      }) as React.CSSProperties

  return (
    <m3e-button
      variant="filled"
      onClick={onCancelClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full relative overflow-hidden select-none transition-all duration-300 shadow-md cursor-pointer rounded-[14px]"
      style={dynamicButtonStyle}
      title="Click to cancel download"
    >
      {!isStarting && (
        <div
          className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ease-out z-0 pointer-events-none rounded-[14px] ${
            showCancelState
              ? 'bg-[var(--md-sys-color-error-container)]/40'
              : 'bg-[var(--md-sys-color-primary-container)]/40'
          }`}
          style={{ width: `${Math.max(0, Math.min(100, singleFileProgress))}%` }}
        />
      )}

      {showCancelState ? (
        <div className="flex items-center justify-center gap-2 z-10 py-0.5 text-[var(--md-sys-color-on-error)]">
          <CancelAnimatedIcon
            ref={cancelIconRef}
            isCanceling={isCancelInitiated}
            size={isDesktop ? 20 : 18}
            className="shrink-0"
            color="var(--md-sys-color-on-error)"
          />
          <span className="font-bold text-[15px] md:text-[16px] tracking-wide text-[var(--md-sys-color-on-error)]">
            {isCancelInitiated ? 'Canceling...' : 'Cancel Download'}
          </span>
        </div>
      ) : isStarting ? (
        <div className="flex items-center justify-center gap-2 z-10 py-0.5">
          <m3e-circular-progress-indicator
            variant="wavy"
            indeterminate
            className="shrink-0"
            style={
              {
                '--m3e-circular-wavy-progress-indicator-diameter': isDesktop
                  ? '20px'
                  : '18px',
                '--m3e-circular-flat-progress-indicator-diameter': isDesktop
                  ? '20px'
                  : '18px',
                '--m3e-circular-progress-indicator-thickness': '2.5px',
                '--m3e-circular-wavy-progress-indicator-amplitude': '1.5px',
                '--m3e-circular-wavy-progress-indicator-wavelength': '10px',
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
        <div className="flex flex-col items-center justify-center leading-tight z-10 py-0.5 min-w-0">
          <div className="flex items-center justify-center gap-2 min-w-0">
            <m3e-circular-progress-indicator
              variant="wavy"
              value={singleFileProgress}
              max="100"
              className="shrink-0"
              style={
                {
                  '--m3e-circular-wavy-progress-indicator-diameter': isDesktop
                    ? '20px'
                    : '18px',
                  '--m3e-circular-flat-progress-indicator-diameter': isDesktop
                    ? '20px'
                    : '18px',
                  '--m3e-circular-progress-indicator-thickness': '2.5px',
                  '--m3e-circular-wavy-progress-indicator-amplitude': '1.5px',
                  '--m3e-circular-wavy-progress-indicator-wavelength': '10px',
                  '--m3e-progress-indicator-color':
                    'var(--md-sys-color-on-primary)',
                  '--m3e-progress-indicator-track-color':
                    'rgba(255, 255, 255, 0.25)',
                } as React.CSSProperties
              }
            />
            <span className="text-[15px] md:text-[16px] font-bold tracking-[0.15px] text-[var(--md-sys-color-on-primary)] leading-tight">
              Downloading... {singleFileProgress}%
            </span>
          </div>
          {singleFileDownloaded > 0 ? (
            <span className="text-[11px] font-medium opacity-85 leading-none mt-1 text-[var(--md-sys-color-on-primary)]">
              {formatFileSize(singleFileDownloaded)}{' '}
              {singleFileTotal > 0
                ? `/ ${formatFileSize(singleFileTotal)}`
                : ''}
            </span>
          ) : null}
        </div>
      )}
    </m3e-button>
  )
}
