import React from 'react'
import { Card } from '@/ui/card'
import type { ModItem } from '@/ui/mod-details-modal'
import { formatCompactNumber } from '@/utils'

export interface ModGridCardProps {
  mod: ModItem
  isFavorite: boolean
  onSelect: (mod: ModItem) => void
  onToggleFavorite: (id: number | string) => void
}

/**
 * Renders a single mod card in the discovery grid with views, favorite toggle, and downloads metrics.
 */
export const ModGridCard: React.FC<ModGridCardProps> = ({
  mod,
  isFavorite,
  onSelect,
  onToggleFavorite,
}) => {
  return (
    <Card
      title={mod.title || mod.name || ''}
      description={mod.description}
      thumbnail={mod.image || mod.img || mod.thumbnail}
      icon={mod.icon || mod.engineIcon}
      iconTooltip={mod.engineName}
      extractColor={true}
      lazyLoad={true}
      isFavorite={isFavorite}
      author={mod.author}
      authorAvatar={mod.userPfp}
      onClick={() => onSelect(mod)}
    >
      <div className="flex items-center justify-between text-[11px] text-[var(--md-sys-color-on-surface-variant)] pt-1 px-0.5 border-t border-[var(--md-sys-color-outline-variant)]/25 mt-0.5">
        <div
          className="flex items-center gap-1.5 text-[var(--md-sys-color-on-surface-variant)]"
          title={`${(mod.views || 0).toLocaleString()} views`}
        >
          <span className="material-symbols-rounded text-sm text-[var(--md-sys-color-on-surface-variant)]">
            visibility
          </span>
          <span className="text-[var(--md-sys-color-on-surface-variant)] font-medium">
            {formatCompactNumber(mod.views)}
          </span>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(mod.id)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation()
              onToggleFavorite(mod.id)
            }
          }}
          className={`flex items-center gap-1.5 cursor-pointer hover:text-red-500 transition-colors select-none ${
            isFavorite
              ? 'text-red-500'
              : 'text-[var(--md-sys-color-on-surface-variant)]'
          }`}
          title="Toggle Favorite"
        >
          <span
            className={`material-symbols-rounded text-sm ${
              isFavorite
                ? 'text-red-500'
                : 'text-[var(--md-sys-color-on-surface-variant)]'
            }`}
            style={
              isFavorite ? { fontVariationSettings: "'FILL' 1" } : undefined
            }
          >
            favorite
          </span>
          <span
            className={`font-medium ${
              isFavorite
                ? 'text-red-500'
                : 'text-[var(--md-sys-color-on-surface-variant)]'
            }`}
          >
            {formatCompactNumber(mod.likes)}
          </span>
        </div>

        <div
          className="flex items-center gap-1.5 text-[var(--md-sys-color-on-surface-variant)]"
          title={`${(mod.downloads || 0).toLocaleString()} downloads`}
        >
          <span className="material-symbols-rounded text-sm text-[var(--md-sys-color-on-surface-variant)]">
            download
          </span>
          <span className="text-[var(--md-sys-color-on-surface-variant)] font-medium">
            {formatCompactNumber(mod.downloads)}
          </span>
        </div>
      </div>
    </Card>
  )
}
