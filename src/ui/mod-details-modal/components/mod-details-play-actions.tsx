import React from 'react'
import { PlayStateButton } from './play-state-button'
import { CancelAnimatedIcon } from './cancel-animated-icon'
import type { ModActionState } from './mod-details-action-buttons'

export interface ModDetailsPlayActionsProps {
  isDesktop: boolean
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
  primaryButtonStyle: React.CSSProperties
  tonalButtonStyle: React.CSSProperties
}

export const ModDetailsPlayActions: React.FC<ModDetailsPlayActionsProps> = ({
  isDesktop,
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
  primaryButtonStyle,
  tonalButtonStyle,
}) => {
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
                '--m3e-button-tonal-container-color':
                  'color-mix(in srgb, var(--md-sys-color-tertiary) 20%, transparent)',
                '--m3e-button-tonal-label-text-color':
                  'var(--md-sys-color-tertiary)',
              } as React.CSSProperties
            }
          >
            <span
              slot="icon"
              className="material-symbols-rounded animate-spin text-[var(--md-sys-color-tertiary)] text-xl leading-none"
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
                '--m3e-button-filled-container-color':
                  'var(--md-sys-color-tertiary)',
                '--m3e-button-filled-label-text-color':
                  'var(--md-sys-color-on-tertiary)',
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
            '--m3e-button-tonal-container-color':
              'color-mix(in srgb, var(--md-sys-color-error) 15%, transparent)',
            '--m3e-button-tonal-label-text-color':
              'var(--md-sys-color-error)',
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

export interface ModDetailsStaticActionProps {
  actionState: Extract<ModActionState, 'loading' | 'no-files' | 'canceling' | 'completed'>
  isDesktop: boolean
  primaryButtonStyle: React.CSSProperties
  tonalButtonStyle: React.CSSProperties
}

export const ModDetailsStaticAction: React.FC<ModDetailsStaticActionProps> = ({
  actionState,
  isDesktop,
  primaryButtonStyle,
  tonalButtonStyle,
}) => {
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
