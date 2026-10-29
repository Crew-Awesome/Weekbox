import React from 'react'
import type { ModItem } from '../../types'

interface DesktopDatePillsProps {
  displayCard: ModItem
  isInstalled: boolean
  localInstalledAt?: number
  formatDate: (timestamp?: number | string) => string
  formatFullDate: (timestamp?: number | string) => string
  submittedPillId: string
  updatedPillId: string
  installedPillId: string
}

export const DesktopDatePills: React.FC<DesktopDatePillsProps> = ({
  displayCard,
  isInstalled,
  localInstalledAt,
  formatDate,
  formatFullDate,
  submittedPillId,
  updatedPillId,
  installedPillId,
}) => {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto z-10 max-w-[calc(100%-360px)] min-w-0">
      <div className="inline-flex items-center rounded-full bg-[var(--wb-surface-bright)] border border-[var(--wb-outline-variant)]/30 overflow-hidden shadow-xs divide-x divide-[var(--wb-outline-variant)]/20 min-w-0 max-w-full">
        {displayCard.submittedAt && (
          <div
            id={submittedPillId}
            tabIndex={0}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-[var(--wb-surface-container-highest)]/60 transition-colors select-none cursor-default min-w-0 shrink-0 outline-none focus-visible:bg-[var(--wb-surface-container-highest)]"
            aria-label={`Submitted: ${formatDate(displayCard.submittedAt)}`}
          >
            <span className="material-symbols-rounded text-sm shrink-0 leading-none text-[var(--wb-primary)]">
              add
            </span>
            <span className="truncate">{formatDate(displayCard.submittedAt)}</span>
          </div>
        )}

        {displayCard.updatedAt &&
          displayCard.updatedAt !== displayCard.submittedAt && (
            <div
              id={updatedPillId}
              tabIndex={0}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-[var(--wb-surface-container-highest)]/60 transition-colors select-none cursor-default min-w-0 shrink-0 outline-none focus-visible:bg-[var(--wb-surface-container-highest)]"
              aria-label={`Updated: ${formatDate(displayCard.updatedAt)}`}
            >
              <span className="material-symbols-rounded text-sm shrink-0 leading-none text-[var(--wb-primary)]">
                refresh
              </span>
              <span className="truncate">{formatDate(displayCard.updatedAt)}</span>
            </div>
          )}

        {isInstalled && localInstalledAt && (
          <div
            id={installedPillId}
            tabIndex={0}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-[var(--wb-surface-container-highest)]/60 transition-colors select-none cursor-default min-w-0 shrink-0 outline-none focus-visible:bg-[var(--wb-surface-container-highest)]"
            aria-label={`Installed: ${formatDate(localInstalledAt)}`}
          >
            <span className="material-symbols-rounded text-sm shrink-0 leading-none text-[var(--wb-primary)]">
              folder
            </span>
            <span className="truncate">{formatDate(localInstalledAt)}</span>
          </div>
        )}
      </div>

      {displayCard.submittedAt && (
        <m3e-tooltip for={submittedPillId} position="below">
          Submitted: {formatFullDate(displayCard.submittedAt)}
        </m3e-tooltip>
      )}

      {displayCard.updatedAt &&
        displayCard.updatedAt !== displayCard.submittedAt && (
          <m3e-tooltip for={updatedPillId} position="below">
            Updated: {formatFullDate(displayCard.updatedAt)}
          </m3e-tooltip>
        )}

      {isInstalled && localInstalledAt && (
        <m3e-tooltip for={installedPillId} position="below">
          Installed: {formatFullDate(localInstalledAt)}
        </m3e-tooltip>
      )}
    </div>
  )
}

