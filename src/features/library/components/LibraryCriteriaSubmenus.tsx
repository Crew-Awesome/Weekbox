import React from 'react'
import type { LibraryEngineSummary, LibrarySortOption } from '../types'

export const M3E_MENU_STYLE: React.CSSProperties = {
  '--m3e-menu-container-color': 'var(--md-sys-color-surface-container)',
  '--m3e-menu-container-shape': '16px',
  '--m3e-menu-container-min-width': '190px',
  '--m3e-menu-container-max-height': 'none',
  '--m3e-menu-item-color': 'var(--md-sys-color-on-surface)',
  '--m3e-menu-item-selected-color': 'var(--md-sys-color-primary)',
  '--m3e-menu-item-selected-container-color':
    'color-mix(in srgb, var(--md-sys-color-primary) 12%, transparent)',
  '--m3e-menu-item-icon-size': '18px',
  '--m3e-menu-item-icon-label-space': '8px',
  '--m3e-menu-item-padding-start': '10px',
  '--m3e-menu-item-padding-end': '10px',
  '--m3e-menu-item-container-height': '38px',
  boxShadow:
    '0 12px 32px color-mix(in srgb, var(--md-sys-color-scrim) 20%, transparent)',
  border:
    '1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 50%, transparent)',
  width: 'min(210px, calc(100vw - 24px))',
  maxHeight: 'none',
  overflow: 'hidden',
} as React.CSSProperties

export const M3E_SUBMENU_STYLE: React.CSSProperties = {
  ...M3E_MENU_STYLE,
  '--m3e-menu-container-min-width': '220px',
  width: 'min(240px, calc(100vw - 24px))',
} as React.CSSProperties

export const DIVIDER_STYLE: React.CSSProperties = {
  margin: '4px 0',
  borderColor:
    'color-mix(in srgb, var(--md-sys-color-outline-variant) 40%, transparent)',
}

export const SORT_OPTIONS: Array<{ id: LibrarySortOption; label: string; icon: string }> = [
  { id: 'recent', label: 'Recently Installed', icon: 'schedule' },
  { id: 'name', label: 'Name (A-Z)', icon: 'sort_by_alpha' },
  { id: 'size', label: 'Size (Largest)', icon: 'hard_drive' },
  { id: 'engine', label: 'Engine (A-Z)', icon: 'category' },
]

export interface LibraryCriteriaSubmenusProps {
  sortBy: LibrarySortOption
  onSortChange: (sort: LibrarySortOption) => void
  filterFavorites: boolean
  onToggleFavorites: () => void
  favoritesCount: number
  filterBookmarks: boolean
  onToggleBookmarks: () => void
  bookmarksCount: number
  engineSummaries: LibraryEngineSummary[]
  selectedEngines: string[]
  isAllEngines: boolean
  onSelectAllEngines: () => void
  onToggleEngine: (id: string) => void
}

export const LibraryCriteriaSubmenus: React.FC<LibraryCriteriaSubmenusProps> = ({
  sortBy,
  onSortChange,
  filterFavorites,
  onToggleFavorites,
  favoritesCount,
  filterBookmarks,
  onToggleBookmarks,
  bookmarksCount,
  engineSummaries,
  selectedEngines,
  isAllEngines,
  onSelectAllEngines,
  onToggleEngine,
}) => {
  return (
    <>
      <m3e-menu
        id="library-filter-sort-menu"
        position-x="after"
        style={M3E_SUBMENU_STYLE}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '6px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <m3e-menu-item-radio
              key={opt.id}
              checked={sortBy === opt.id}
              onClick={() => onSortChange(opt.id)}
              style={{ margin: '2px 0' }}
            >
              <span
                slot="icon"
                className="material-symbols-rounded text-lg text-[var(--md-sys-color-primary)]"
              >
                {opt.icon}
              </span>
              <span className="text-xs sm:text-sm font-semibold">{opt.label}</span>
            </m3e-menu-item-radio>
          ))}
        </div>
      </m3e-menu>

      <m3e-menu
        id="library-filter-by-menu"
        position-x="after"
        style={M3E_SUBMENU_STYLE}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '6px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <m3e-menu-item-checkbox
            data-filter-id="favorites"
            checked={filterFavorites}
            onClick={onToggleFavorites}
            style={{ margin: '2px 0' }}
          >
            <span
              slot="icon"
              className={`material-symbols-rounded text-lg ${filterFavorites ? 'text-red-500' : 'text-[var(--md-sys-color-primary)]'}`}
              style={filterFavorites ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              favorite
            </span>
            <span className="text-xs sm:text-sm font-semibold">
              Favorites ({favoritesCount})
            </span>
          </m3e-menu-item-checkbox>

          <m3e-menu-item-checkbox
            data-filter-id="bookmarks"
            checked={filterBookmarks}
            onClick={onToggleBookmarks}
            style={{ margin: '2px 0' }}
          >
            <span
              slot="icon"
              className={`material-symbols-rounded text-lg ${filterBookmarks ? 'text-amber-400' : 'text-[var(--md-sys-color-primary)]'}`}
              style={filterBookmarks ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              bookmark
            </span>
            <span className="text-xs sm:text-sm font-semibold">
              Bookmarks ({bookmarksCount})
            </span>
          </m3e-menu-item-checkbox>
        </div>
      </m3e-menu>

      <m3e-menu
        id="library-filter-engine-menu"
        position-x="after"
        style={M3E_SUBMENU_STYLE}
      >
        <m3e-overflow
          direction="vertical"
          style={{
            width: '100%',
            maxHeight: 'min(360px, calc(100vh - 80px))',
          }}
          thumb-color="var(--md-sys-color-primary)"
          track-color="var(--md-sys-color-outline-variant)"
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              padding: '6px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <m3e-menu-item-checkbox
              data-engine-id="all"
              checked={isAllEngines}
              onClick={onSelectAllEngines}
              style={{ margin: '2px 0' }}
            >
              <span
                slot="icon"
                className="material-symbols-rounded text-lg text-[var(--md-sys-color-primary)]"
              >
                apps
              </span>
              <span className="text-xs sm:text-sm font-semibold">All Engines</span>
            </m3e-menu-item-checkbox>

            {engineSummaries.map((eng) => {
              const isSelected = selectedEngines.some(
                (e) =>
                  e.toLowerCase() === eng.id.toLowerCase() ||
                  e.toLowerCase() === eng.name.toLowerCase(),
              )
              return (
                <m3e-menu-item-checkbox
                  key={eng.id}
                  data-engine-id={eng.id}
                  checked={isSelected}
                  onClick={() => onToggleEngine(eng.id)}
                  style={{ margin: '2px 0' }}
                >
                  {eng.icon ? (
                    <img
                      slot="icon"
                      src={eng.icon}
                      alt=""
                      className="w-5 h-5 rounded object-contain shrink-0 aspect-square"
                      style={{
                        width: '20px',
                        height: '20px',
                        minWidth: '20px',
                        minHeight: '20px',
                        aspectRatio: '1 / 1',
                        objectFit: 'contain',
                        borderRadius: '4px',
                      }}
                    />
                  ) : (
                    <span
                      slot="icon"
                      className="material-symbols-rounded text-lg flex items-center justify-center shrink-0"
                      style={{
                        width: '20px',
                        height: '20px',
                        minWidth: '20px',
                        minHeight: '20px',
                        fontSize: '20px',
                        lineHeight: '20px',
                        aspectRatio: '1 / 1',
                      }}
                    >
                      layers
                    </span>
                  )}
                  <span className="text-xs sm:text-sm font-semibold truncate">
                    {eng.name} ({eng.count})
                  </span>
                </m3e-menu-item-checkbox>
              )
            })}
          </div>
        </m3e-overflow>
      </m3e-menu>
    </>
  )
}

