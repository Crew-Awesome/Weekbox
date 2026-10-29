import React from 'react'
import type { ModItem } from '../../types'

interface MobileDatePillsProps {
  displayCard: ModItem
  isInstalled: boolean
  localInstalledAt?: number
  formatDate: (timestamp?: number | string) => string
  formatFullDate: (timestamp?: number | string) => string
  mobileUpdatedId: string
  mobileInstalledId: string
  onClose?: () => void
}

export const MobileDatePills: React.FC<MobileDatePillsProps> = ({
  displayCard,
  isInstalled,
  localInstalledAt,
  formatDate,
  formatFullDate,
  mobileUpdatedId,
  mobileInstalledId,
  onClose,
}) => {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {(Boolean(isInstalled && localInstalledAt) ||
        Boolean(
          displayCard.updatedAt &&
            displayCard.updatedAt !== displayCard.submittedAt,
        )) && (
        <div className="inline-flex items-center rounded-full bg-[var(--wb-surface-bright)] border border-[var(--wb-outline-variant)]/30 overflow-hidden shadow-xs divide-x divide-[var(--wb-outline-variant)]/20 shrink-0">
          {displayCard.updatedAt &&
            displayCard.updatedAt !== displayCard.submittedAt && (
              <div
                id={mobileUpdatedId}
                tabIndex={0}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-[var(--wb-surface-container-highest)]/60 transition-colors select-none cursor-default shrink-0 outline-none"
                aria-label={`Updated: ${formatDate(displayCard.updatedAt)}`}
              >
                <span className="material-symbols-rounded text-xs shrink-0 leading-none text-[var(--wb-primary)]">
                  refresh
                </span>
                <span className="font-semibold">
                  {formatDate(displayCard.updatedAt)}
                </span>
              </div>
            )}
          {isInstalled && localInstalledAt && (
            <div
              id={mobileInstalledId}
              tabIndex={0}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-[var(--wb-surface-container-highest)]/60 transition-colors select-none cursor-default shrink-0 outline-none"
              aria-label={`Installed: ${formatDate(localInstalledAt)}`}
            >
              <span className="material-symbols-rounded text-xs shrink-0 leading-none text-[var(--wb-primary)]">
                folder
              </span>
              <span className="font-semibold">
                {formatDate(localInstalledAt)}
              </span>
            </div>
          )}
        </div>
      )}

      {displayCard.updatedAt &&
        displayCard.updatedAt !== displayCard.submittedAt && (
          <m3e-tooltip for={mobileUpdatedId} position="below">
            Updated: {formatFullDate(displayCard.updatedAt)}
          </m3e-tooltip>
        )}
      {isInstalled && localInstalledAt && (
        <m3e-tooltip for={mobileInstalledId} position="below">
          Installed: {formatFullDate(localInstalledAt)}
        </m3e-tooltip>
      )}

      {onClose && (
        <m3e-icon-button onClick={onClose} aria-label="Close modal">
          <span className="material-symbols-rounded text-xl leading-none">
            close
          </span>
        </m3e-icon-button>
      )}
    </div>
  )
}

