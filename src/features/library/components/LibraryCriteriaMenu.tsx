import React from 'react'
import type { LibraryEngineSummary, LibrarySortOption } from '../types'

const M3E_MENU_STYLE: React.CSSProperties = {
  '--m3e-menu-container-color': 'var(--md-sys-color-surface-container)',
  '--m3e-menu-container-shape': '16px',
  '--m3e-menu-container-min-width': '240px',
  '--m3e-menu-container-max-height': 'none',
  '--m3e-menu-item-color': 'var(--md-sys-color-on-surface)',
  '--m3e-menu-item-icon-size': '18px',
  '--m3e-menu-item-icon-label-space': '8px',
  '--m3e-menu-item-padding-start': '10px',
  '--m3e-menu-item-padding-end': '10px',
  '--m3e-menu-item-container-height': '38px',
  boxShadow:
    '0 12px 32px color-mix(in srgb, var(--md-sys-color-scrim) 20%, transparent)',
  border:
    '1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 50%, transparent)',
  width: 'min(280px, calc(100vw - 24px))',
  maxHeight: 'none',
  overflow: 'hidden',
} as React.CSSProperties

const SORT_OPTIONS: Array<{ id: LibrarySortOption; label: string; icon: string }> = [
  { id: 'recent', label: 'Recently Installed', icon: 'schedule' },
  { id: 'name', label: 'Name (A-Z)', icon: 'sort_by_alpha' },
  { id: 'size', label: 'Size (Largest)', icon: 'hard_drive' },
  { id: 'engine', label: 'Engine (A-Z)', icon: 'category' },
]

export interface LibraryCriteriaMenuProps {
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
  hasActiveFilters: boolean
  onClearFilters: () => void
}

export const LibraryCriteriaMenu: React.FC<LibraryCriteriaMenuProps> = ({
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
  hasActiveFilters,
  onClearFilters,
}) => {
  return (
    <m3e-menu
      id="library-criteria-menu"
      position-x="after"
      position-y="below"
      style={M3E_MENU_STYLE}
    >
      <m3e-overflow
        direction="vertical"
        style={{
          width: '100%',
          height: 'min(420px, calc(100vh - 140px))',
        }}
        thumb-color="var(--md-sys-color-primary)"
        track-color="var(--md-sys-color-outline-variant)"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            paddingBlock: '6px',
            paddingInline: '2px 14px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div className="px-3.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] opacity-85 select-none">
            Sort By
          </div>

          {SORT_OPTIONS.map((opt) => (
            <m3e-menu-item
              key={opt.id}
              checked={sortBy === opt.id}
              onClick={() => onSortChange(opt.id)}
              style={{ margin: '3px 0' }}
            >
              <span slot="icon" className="material-symbols-rounded text-lg">
                {opt.icon}
              </span>
              <span className="text-xs sm:text-sm font-semibold">
                {opt.label}
              </span>
              {sortBy === opt.id && (
                <span
                  slot="trailing-icon"
                  className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
                >
                  check
                </span>
              )}
            </m3e-menu-item>
          ))}

          <m3e-divider
            style={{
              margin: '6px 0',
              borderColor:
                'color-mix(in srgb, var(--md-sys-color-outline-variant) 40%, transparent)',
            }}
          ></m3e-divider>

          <div className="px-3.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] opacity-85 select-none">
            Filter By
          </div>

          <m3e-menu-item
            checked={filterFavorites}
            onClick={onToggleFavorites}
            style={{ margin: '3px 0' }}
          >
            <span
              slot="icon"
              className={`material-symbols-rounded text-lg ${
                filterFavorites ? 'text-red-500' : ''
              }`}
              style={
                filterFavorites
                  ? { fontVariationSettings: "'FILL' 1" }
                  : undefined
              }
            >
              favorite
            </span>
            <span className="text-xs sm:text-sm font-semibold">
              Favorites ({favoritesCount})
            </span>
            {filterFavorites && (
              <span
                slot="trailing-icon"
                className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
              >
                check
              </span>
            )}
          </m3e-menu-item>

          <m3e-menu-item
            checked={filterBookmarks}
            onClick={onToggleBookmarks}
            style={{ margin: '3px 0' }}
          >
            <span
              slot="icon"
              className={`material-symbols-rounded text-lg ${
                filterBookmarks ? 'text-amber-400' : ''
              }`}
              style={
                filterBookmarks
                  ? { fontVariationSettings: "'FILL' 1" }
                  : undefined
              }
            >
              bookmark
            </span>
            <span className="text-xs sm:text-sm font-semibold">
              Bookmarks ({bookmarksCount})
            </span>
            {filterBookmarks && (
              <span
                slot="trailing-icon"
                className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
              >
                check
              </span>
            )}
          </m3e-menu-item>

          {engineSummaries.length > 0 && (
            <>
              <m3e-divider
                style={{
                  margin: '6px 0',
                  borderColor:
                    'color-mix(in srgb, var(--md-sys-color-outline-variant) 40%, transparent)',
                }}
              ></m3e-divider>
              <div className="px-3.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] opacity-85 select-none">
                Engine
              </div>
              <m3e-menu-item
                checked={isAllEngines}
                onClick={onSelectAllEngines}
                style={{ margin: '3px 0' }}
              >
                <span slot="icon" className="material-symbols-rounded text-lg">
                  apps
                </span>
                <span className="text-xs sm:text-sm font-semibold">
                  All Engines
                </span>
                {isAllEngines && (
                  <span
                    slot="trailing-icon"
                    className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
                  >
                    check
                  </span>
                )}
              </m3e-menu-item>
              {engineSummaries.map((eng) => {
                const isSelected = selectedEngines.some(
                  (e) =>
                    e.toLowerCase() === eng.id.toLowerCase() ||
                    e.toLowerCase() === eng.name.toLowerCase(),
                )

                return (
                  <m3e-menu-item
                    key={eng.id}
                    checked={isSelected}
                    onClick={() => onToggleEngine(eng.id)}
                    style={{ margin: '3px 0' }}
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
                    {isSelected && (
                      <span
                        slot="trailing-icon"
                        className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
                      >
                        check
                      </span>
                    )}
                  </m3e-menu-item>
                )
              })}
            </>
          )}

          {hasActiveFilters && (
            <>
              <m3e-divider
                style={{
                  margin: '6px 0',
                  borderColor:
                    'color-mix(in srgb, var(--md-sys-color-outline-variant) 40%, transparent)',
                }}
              ></m3e-divider>
              <m3e-menu-item onClick={onClearFilters} style={{ margin: '3px 0' }}>
                <span
                  slot="icon"
                  className="material-symbols-rounded text-lg text-red-500"
                >
                  filter_alt_off
                </span>
                <span className="text-xs sm:text-sm font-semibold text-red-500">
                  Clear Filters
                </span>
              </m3e-menu-item>
            </>
          )}
        </div>
      </m3e-overflow>
    </m3e-menu>
  )
}
