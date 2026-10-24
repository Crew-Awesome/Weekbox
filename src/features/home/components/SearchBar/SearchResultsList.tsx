import React from 'react'
import type { ModItem } from '@/ui/mod-details-modal'
import { formatCompactNumber } from '@/utils'

interface SearchResultsListProps {
  results: ModItem[]
  onSelectMod: (mod: ModItem) => void
}

/**
 * Renders the list of GameBanana mod matches inside the docked search dropdown.
 */
export const SearchResultsList: React.FC<SearchResultsListProps> = ({
  results,
  onSelectMod,
}) => {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-1 text-[var(--md-sys-color-on-surface-variant)] opacity-75">
        GameBanana Results ({results.length})
      </span>
      {results.map((mod) => (
        <div
          key={`gb-search-res-${mod.id}`}
          role="button"
          tabIndex={0}
          onClick={() => onSelectMod(mod)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelectMod(mod)
            }
          }}
          className="flex items-center gap-3 p-2 rounded-2xl cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,transparent)] active:scale-[0.99]"
        >
          <img
            src={mod.image || mod.img || mod.thumbnail}
            alt={mod.title}
            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[var(--md-sys-color-outline-variant)]"
            onError={(e) => {
              e.currentTarget.src = '/imgs/images/placeholder-mini.webp'
            }}
          />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-semibold truncate text-[var(--md-sys-color-on-surface)]">
              {mod.title}
            </span>
            <span className="text-xs text-[var(--md-sys-color-on-surface-variant)] truncate">
              By {mod.author} • {mod.engineName || 'FNF'}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 text-xs text-[var(--md-sys-color-on-surface-variant)] opacity-80">
            {mod.likes !== undefined && (
              <span className="flex items-center gap-0.5">
                <span
                  className="material-symbols-rounded text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  favorite
                </span>
                {formatCompactNumber(mod.likes)}
              </span>
            )}
            {mod.icon && (
              <img
                src={mod.icon}
                alt=""
                className="w-5 h-5 object-contain"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
