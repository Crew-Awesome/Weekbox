import React from 'react'
import type { ModItem } from '../../types'

interface ModStatsGridProps {
  displayCard: ModItem
  formatDate: (timestamp?: number | string) => string
  formatFullDate?: (timestamp?: number | string) => string
  updatesCount: number
}

export const ModStatsGrid: React.FC<ModStatsGridProps> = ({
  displayCard,
  formatDate,
  formatFullDate,
  updatesCount,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="flex flex-col p-3 rounded-xl bg-[var(--md-sys-color-surface-bright)]/60 border border-[var(--md-sys-color-outline-variant)]/20">
          <div className="flex items-center gap-1.5 text-xs text-[var(--md-sys-color-on-surface-variant)] mb-1">
            <span className="material-symbols-rounded text-sm text-[var(--md-sys-color-primary)]">
              calendar_today
            </span>
            <span>Uploaded</span>
          </div>
          <span
            className="text-sm font-semibold text-[var(--md-sys-color-on-surface)] truncate"
            title={
              formatFullDate ? formatFullDate(displayCard.submittedAt) : undefined
            }
          >
            {formatDate(displayCard.submittedAt)}
          </span>
        </div>

        <div className="flex flex-col p-3 rounded-xl bg-[var(--md-sys-color-surface-bright)]/60 border border-[var(--md-sys-color-outline-variant)]/20">
          <div className="flex items-center gap-1.5 text-xs text-[var(--md-sys-color-on-surface-variant)] mb-1">
            <span className="material-symbols-rounded text-sm text-[var(--md-sys-color-primary)]">
              refresh
            </span>
            <span>Last Updated</span>
          </div>
          <span
            className="text-sm font-semibold text-[var(--md-sys-color-on-surface)] truncate"
            title={
              formatFullDate ? formatFullDate(displayCard.updatedAt) : undefined
            }
          >
            {displayCard.updatedAt ? formatDate(displayCard.updatedAt) : 'Never'}
          </span>
        </div>

        {displayCard.installedAt && (
          <div className="flex flex-col p-3 rounded-xl bg-[var(--md-sys-color-surface-bright)]/60 border border-[var(--md-sys-color-outline-variant)]/20">
            <div className="flex items-center gap-1.5 text-xs text-[var(--md-sys-color-on-surface-variant)] mb-1">
              <span className="material-symbols-rounded text-sm text-[var(--md-sys-color-primary)]">
                storage
              </span>
              <span>Installed</span>
            </div>
            <span
              className="text-sm font-semibold text-[var(--md-sys-color-on-surface)] truncate"
              title={
                formatFullDate
                  ? formatFullDate(displayCard.installedAt)
                  : undefined
              }
            >
              {formatDate(displayCard.installedAt)}
            </span>
          </div>
        )}

        <div className="flex flex-col p-3 rounded-xl bg-[var(--md-sys-color-surface-bright)]/60 border border-[var(--md-sys-color-outline-variant)]/20">
          <div className="flex items-center gap-1.5 text-xs text-[var(--md-sys-color-on-surface-variant)] mb-1">
            <span className="material-symbols-rounded text-sm text-[var(--md-sys-color-primary)]">
              layers
            </span>
            <span>Updates</span>
          </div>
          <span className="text-sm font-semibold text-[var(--md-sys-color-on-surface)]">
            {updatesCount} {updatesCount === 1 ? 'update' : 'updates'}
          </span>
        </div>

        <div className="flex flex-col p-3 rounded-xl bg-[var(--md-sys-color-surface-bright)]/60 border border-[var(--md-sys-color-outline-variant)]/20">
          <div className="flex items-center gap-1.5 text-xs text-[var(--md-sys-color-on-surface-variant)] mb-1">
            <span className="material-symbols-rounded text-sm text-[var(--md-sys-color-primary)]">
              visibility
            </span>
            <span>Views</span>
          </div>
          <span className="text-sm font-semibold text-[var(--md-sys-color-on-surface)]">
            {displayCard.views !== undefined
              ? Intl.NumberFormat().format(displayCard.views)
              : 'N/A'}
          </span>
        </div>

        <div className="flex flex-col p-3 rounded-xl bg-[var(--md-sys-color-surface-bright)]/60 border border-[var(--md-sys-color-outline-variant)]/20">
          <div className="flex items-center gap-1.5 text-xs text-[var(--md-sys-color-on-surface-variant)] mb-1">
            <span className="material-symbols-rounded text-sm text-[var(--md-sys-color-primary)]">
              favorite
            </span>
            <span>Likes</span>
          </div>
          <span className="text-sm font-semibold text-[var(--md-sys-color-on-surface)]">
            {displayCard.likes !== undefined
              ? Intl.NumberFormat().format(displayCard.likes)
              : 'N/A'}
          </span>
        </div>

        <div className="flex flex-col p-3 rounded-xl bg-[var(--md-sys-color-surface-bright)]/60 border border-[var(--md-sys-color-outline-variant)]/20">
          <div className="flex items-center gap-1.5 text-xs text-[var(--md-sys-color-on-surface-variant)] mb-1">
            <span className="material-symbols-rounded text-sm text-[var(--md-sys-color-primary)]">
              download
            </span>
            <span>Downloads</span>
          </div>
          <span className="text-sm font-semibold text-[var(--md-sys-color-on-surface)]">
            {displayCard.downloads !== undefined
              ? Intl.NumberFormat().format(displayCard.downloads)
              : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  )
}

