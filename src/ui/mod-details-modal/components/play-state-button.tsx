import React from 'react'

export type PlayButtonState =
  | 'play'
  | 'launching'
  | 'playing'
  | 'stopping'
  | 'error'
  | string

export interface PlayStateButtonProps {
  playStatus?: PlayButtonState
  onPlay?: () => void
  onStop?: () => void
  label?: string
  playLabel?: string
  idleLabel?: string
  disabled?: boolean
  title?: string
  playTitle?: string
  idleTitle?: string
  disabledTitle?: string
  variant?: 'footer-full' | 'footer-flex' | 'modal-desktop' | 'modal-mobile'
}

/**
 * Stateful M3E action button transitioning between Play, Launching, Playing (hover-to-Stop), Stopping, and Error states.
 */
export const PlayStateButton: React.FC<PlayStateButtonProps> = ({
  playStatus = 'play',
  onPlay,
  onStop,
  label,
  playLabel,
  idleLabel = 'Play',
  disabled = false,
  title,
  playTitle,
  idleTitle = 'Play mod',
  disabledTitle = 'Cannot launch game while storage migration is in progress',
  variant = 'footer-full',
}) => {
  const isModal = variant === 'modal-desktop' || variant === 'modal-mobile'
  const isModalDesktop = variant === 'modal-desktop'

  const effectiveLabel = label || playLabel || idleLabel
  const effectiveTitle = title || playTitle || idleTitle

  const heightPx = isModalDesktop ? '48px' : '44px'
  const labelFontSize = isModalDesktop ? '15px' : '14px'

  const baseStyle: React.CSSProperties = {
    '--m3e-button-container-height': heightPx,
    '--m3e-button-shape-round': '14px',
    '--m3e-button-label-text-font-size': labelFontSize,
    '--m3e-button-label-text-font-weight': '700',
    '--m3e-button-label-text-tracking': '0.15px',
    '--m3e-button-icon-size': '20px',
    '--m3e-button-icon-label-space': '8px',
    '--m3e-button-leading-space': isModal ? '16px' : '24px',
    '--m3e-button-trailing-space': isModal ? '16px' : '24px',
  } as React.CSSProperties

  const sizeClasses = isModal
    ? 'flex-1 rounded-xl'
    : variant === 'footer-flex'
      ? 'flex-1 sm:flex-initial rounded-2xl shadow-lg'
      : 'w-full sm:w-auto rounded-2xl shadow-lg'

  if (playStatus === 'launching') {
    return (
      <m3e-button
        variant="tonal"
        disabled
        className={`flex items-center justify-center transition-all cursor-not-allowed ${sizeClasses}`}
        style={
          {
            ...baseStyle,
            '--m3e-button-tonal-container-color': 'rgba(245, 158, 11, 0.2)',
            '--m3e-button-tonal-label-text-color': '#fcd34d',
          } as React.CSSProperties
        }
      >
        <span
          slot="icon"
          className="material-symbols-rounded animate-spin text-xl leading-none"
        >
          progress_activity
        </span>
        <span className="font-bold">Launching...</span>
      </m3e-button>
    )
  }

  if (playStatus === 'playing') {
    return (
      <m3e-button
        variant="tonal"
        onClick={onStop || onPlay}
        className={`flex items-center justify-center transition-all cursor-pointer group ${
          !isModal ? 'shadow-emerald-950/40 hover:scale-105 active:scale-95' : ''
        } ${sizeClasses}`}
        style={
          {
            ...baseStyle,
            '--m3e-button-tonal-container-color': 'rgba(16, 185, 129, 0.2)',
            '--m3e-button-tonal-label-text-color': '#6ee7b7',
          } as React.CSSProperties
        }
        title="Click to stop process"
      >
        <span
          slot="icon"
          className="material-symbols-rounded text-emerald-400 group-hover:hidden animate-pulse text-xl leading-none"
        >
          pulse
        </span>
        <span
          slot="icon"
          className="material-symbols-rounded filled text-rose-400 hidden group-hover:inline text-xl leading-none"
        >
          stop
        </span>
        <span className="group-hover:hidden font-bold">Playing</span>
        <span className="hidden group-hover:inline font-bold">Stop</span>
      </m3e-button>
    )
  }

  if (playStatus === 'stopping') {
    return (
      <m3e-button
        variant="tonal"
        disabled
        className={`flex items-center justify-center transition-all cursor-not-allowed ${sizeClasses}`}
        style={
          {
            ...baseStyle,
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
        <span className="font-bold">Stopping...</span>
      </m3e-button>
    )
  }

  if (playStatus === 'error') {
    return (
      <m3e-button
        variant="tonal"
        disabled
        className={`flex items-center justify-center transition-all cursor-not-allowed animate-in fade-in ${sizeClasses}`}
        style={
          {
            ...baseStyle,
            '--m3e-button-tonal-container-color': 'rgba(239, 68, 68, 0.2)',
            '--m3e-button-tonal-label-text-color': '#fca5a5',
          } as React.CSSProperties
        }
      >
        <span
          slot="icon"
          className="material-symbols-rounded text-rose-400 text-xl leading-none"
        >
          warning
        </span>
        <span className="font-bold">Error</span>
      </m3e-button>
    )
  }

  return (
    <m3e-button
      variant="filled"
      onClick={onPlay}
      disabled={disabled}
      className={`flex items-center justify-center transition-all duration-300 ${sizeClasses} ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : isModal
            ? 'hover:opacity-95 cursor-pointer'
            : 'hover:opacity-95 cursor-pointer hover:scale-105 active:scale-95'
      }`}
      style={
        {
          ...baseStyle,
          '--m3e-button-filled-container-color': 'var(--md-sys-color-primary)',
          '--m3e-button-filled-label-text-color': 'var(--md-sys-color-on-primary)',
        } as React.CSSProperties
      }
      title={disabled ? disabledTitle : effectiveTitle}
    >
      <span
        slot="icon"
        className="material-symbols-rounded filled text-xl leading-none"
      >
        play_arrow
      </span>
      <span className="font-bold">{effectiveLabel}</span>
    </m3e-button>
  )
}

export default PlayStateButton
