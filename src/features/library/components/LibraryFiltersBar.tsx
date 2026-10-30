import React, { useMemo, useState, useEffect } from 'react'
import type { LibraryEngineSummary, LibrarySortOption } from '../types'
import { FilterIcon } from '@/ui/icons'

export interface LibraryFiltersBarProps {
  selectedEngine: string | string[]
  onSelectEngine: (engine: string | string[]) => void
  engineSummaries: LibraryEngineSummary[]
  sortBy: LibrarySortOption
  onSortChange: (sort: LibrarySortOption) => void
  filterFavorites: boolean
  onToggleFavorites: () => void
  favoritesCount: number
  filterBookmarks: boolean
  onToggleBookmarks: () => void
  bookmarksCount: number
  hasActiveFilters: boolean
  onClearFilters: () => void
  compact?: boolean
  className?: string
}

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

const M3E_BUTTON_STYLE: React.CSSProperties = {
  '--m3e-button-outlined-container-shape': '16px',
  '--m3e-button-outlined-outline-color':
    'color-mix(in srgb, var(--md-sys-color-outline-variant) 60%, transparent)',
  '--m3e-button-outlined-label-text-color':
    'var(--md-sys-color-on-surface)',
  '--m3e-button-container-height': '42px',
  '--m3e-button-icon-size': '22px',
  '--m3e-button-icon-label-space': '8px',
  cursor: 'pointer',
} as React.CSSProperties

export const LibraryFiltersBar: React.FC<LibraryFiltersBarProps> = ({
  selectedEngine,
  onSelectEngine,
  engineSummaries,
  sortBy,
  onSortChange,
  filterFavorites,
  onToggleFavorites,
  favoritesCount,
  filterBookmarks,
  onToggleBookmarks,
  bookmarksCount,
  hasActiveFilters,
  onClearFilters,
  compact = false,
  className = '',
}) => {
  const selectedEngines = useMemo<string[]>(() => {
    if (!selectedEngine) return []
    if (Array.isArray(selectedEngine)) {
      return selectedEngine.filter((id) => id && id !== 'all')
    }
    return selectedEngine === 'all' ? [] : [selectedEngine]
  }, [selectedEngine])

  const isAllEngines = selectedEngines.length === 0

  const handleToggleEngine = (id: string) => {
    const isSelected = selectedEngines.some(
      (e) => e.toLowerCase() === id.toLowerCase(),
    )
    if (isSelected) {
      const next = selectedEngines.filter(
        (e) => e.toLowerCase() !== id.toLowerCase(),
      )
      onSelectEngine(next.length === 0 ? 'all' : next)
    } else {
      onSelectEngine([...selectedEngines, id])
    }
  }

  const handleSelectAllEngines = () => {
    onSelectEngine('all')
  }

  const currentEngineLabel = useMemo(() => {
    if (isAllEngines) return 'All Engines'
    if (selectedEngines.length === 1) {
      const match = engineSummaries.find(
        (e) =>
          e.id.toLowerCase() === selectedEngines[0].toLowerCase() ||
          e.name.toLowerCase() === selectedEngines[0].toLowerCase(),
      )
      return match ? match.name : selectedEngines[0]
    }
    return `${selectedEngines.length} Engines`
  }, [isAllEngines, selectedEngines, engineSummaries])

  const currentCriteriaLabel = useMemo(() => {
    let sortName = 'Recently Installed'
    switch (sortBy) {
      case 'name':
        sortName = 'Name (A-Z)'
        break
      case 'size':
        sortName = 'Size'
        break
      case 'engine':
        sortName = 'Engine'
        break
      default:
        sortName = 'Recently Installed'
        break
    }

    const parts = [sortName]
    if (!isAllEngines) {
      parts.push(currentEngineLabel)
    }
    if (filterFavorites && filterBookmarks) {
      parts.push('Favs + Bookmarks')
    } else if (filterFavorites) {
      parts.push('Favorites')
    } else if (filterBookmarks) {
      parts.push('Bookmarks')
    }
    return parts.join(' • ')
  }, [sortBy, isAllEngines, currentEngineLabel, filterFavorites, filterBookmarks])

  const isCriteriaFiltered =
    filterFavorites ||
    filterBookmarks ||
    !isAllEngines ||
    sortBy !== 'recent'

  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const menuEl = document.getElementById('library-criteria-menu')
    if (!menuEl) return

    const updateState = () => {
      const open =
        menuEl.matches?.(':popover-open') ||
        menuEl.classList.contains('open') ||
        (menuEl as unknown as { isOpen?: boolean }).isOpen === true ||
        menuEl.getAttribute('aria-hidden') === 'false'
      setIsOpen(Boolean(open))
    }

    const handleToggle = (e: Event) => {
      const popoverEvent = e as ToggleEvent
      if (popoverEvent.newState) {
        setIsOpen(popoverEvent.newState === 'open')
      } else {
        updateState()
      }
    }

    menuEl.addEventListener('toggle', handleToggle)
    const observer = new MutationObserver(updateState)
    observer.observe(menuEl, {
      attributes: true,
      attributeFilter: ['style', 'class', 'open', 'aria-hidden'],
    })

    return () => {
      menuEl.removeEventListener('toggle', handleToggle)
      observer.disconnect()
    }
  }, [])

  const renderMenu = () => (
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

          <m3e-menu-item
            checked={sortBy === 'recent'}
            onClick={() => onSortChange('recent')}
            style={{ margin: '3px 0' }}
          >
            <span slot="icon" className="material-symbols-rounded text-lg">
              schedule
            </span>
            <span className="text-xs sm:text-sm font-semibold">
              Recently Installed
            </span>
            {sortBy === 'recent' && (
              <span
                slot="trailing-icon"
                className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
              >
                check
              </span>
            )}
          </m3e-menu-item>

          <m3e-menu-item
            checked={sortBy === 'name'}
            onClick={() => onSortChange('name')}
            style={{ margin: '3px 0' }}
          >
            <span slot="icon" className="material-symbols-rounded text-lg">
              sort_by_alpha
            </span>
            <span className="text-xs sm:text-sm font-semibold">
              Name (A-Z)
            </span>
            {sortBy === 'name' && (
              <span
                slot="trailing-icon"
                className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
              >
                check
              </span>
            )}
          </m3e-menu-item>

          <m3e-menu-item
            checked={sortBy === 'size'}
            onClick={() => onSortChange('size')}
            style={{ margin: '3px 0' }}
          >
            <span slot="icon" className="material-symbols-rounded text-lg">
              hard_drive
            </span>
            <span className="text-xs sm:text-sm font-semibold">
              Size (Largest)
            </span>
            {sortBy === 'size' && (
              <span
                slot="trailing-icon"
                className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
              >
                check
              </span>
            )}
          </m3e-menu-item>

          <m3e-menu-item
            checked={sortBy === 'engine'}
            onClick={() => onSortChange('engine')}
            style={{ margin: '3px 0' }}
          >
            <span slot="icon" className="material-symbols-rounded text-lg">
              category
            </span>
            <span className="text-xs sm:text-sm font-semibold">
              Engine (A-Z)
            </span>
            {sortBy === 'engine' && (
              <span
                slot="trailing-icon"
                className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
              >
                check
              </span>
            )}
          </m3e-menu-item>

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
                onClick={handleSelectAllEngines}
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
                    onClick={() => handleToggleEngine(eng.id)}
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

  if (compact) {
    return (
      <div className={`relative shrink-0 flex items-center ${className}`}>
        <m3e-button
          variant={isCriteriaFiltered ? 'filled-tonal' : 'outlined'}
          className="group"
          style={
            {
              ...M3E_BUTTON_STYLE,
              width: '42px',
              height: '42px',
              minWidth: '42px',
              maxWidth: '42px',
              padding: 0,
              borderRadius: '16px',
              '--m3e-button-leading-space': '0px',
              '--m3e-button-trailing-space': '0px',
              '--m3e-button-icon-label-space': '0px',
              transition:
                'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.25s ease, border-color 0.25s ease',
              transform: isOpen ? 'scale(0.95)' : 'scale(1)',
              ...(isCriteriaFiltered
                ? {
                    '--m3e-button-tonal-container-color':
                      'color-mix(in srgb, var(--md-sys-color-primary) 14%, transparent)',
                    '--m3e-button-tonal-label-text-color':
                      'var(--md-sys-color-primary)',
                  }
                : {}),
            } as React.CSSProperties
          }
          title="Filter and Sort"
          aria-label="Filter and Sort"
        >
          <m3e-menu-trigger for="library-criteria-menu"></m3e-menu-trigger>
          <FilterIcon
            slot="icon"
            isActive={isCriteriaFiltered}
            isOpen={isOpen}
            size={22}
          />
        </m3e-button>

        {isCriteriaFiltered && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 pointer-events-none items-center justify-center">
            <span className="cuki-filter-indicator-ping absolute inline-flex h-full w-full rounded-full bg-[var(--md-sys-color-primary)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--md-sys-color-primary)] ring-2 ring-[var(--md-sys-color-surface)] shadow-[0_0_8px_var(--md-sys-color-primary)]"></span>
          </span>
        )}

        {renderMenu()}
      </div>
    )
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 pt-1 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative">
          <m3e-button
            variant={isCriteriaFiltered ? 'filled-tonal' : 'outlined'}
            className="group"
            style={
              {
                ...M3E_BUTTON_STYLE,
                transition:
                  'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.25s ease, border-color 0.25s ease',
                transform: isOpen ? 'scale(0.97)' : 'scale(1)',
                ...(isCriteriaFiltered
                  ? {
                      '--m3e-button-tonal-container-color':
                        'color-mix(in srgb, var(--md-sys-color-primary) 14%, transparent)',
                      '--m3e-button-tonal-label-text-color':
                        'var(--md-sys-color-primary)',
                    }
                  : {}),
              } as React.CSSProperties
            }
          >
            <m3e-menu-trigger for="library-criteria-menu"></m3e-menu-trigger>
            <FilterIcon
              slot="icon"
              isActive={isCriteriaFiltered}
              isOpen={isOpen}
              size={20}
            />
            <span className="text-xs sm:text-sm font-semibold truncate max-w-[160px] sm:max-w-[260px]">
              {currentCriteriaLabel}
            </span>
            <span
              slot="trailing-icon"
              className="material-symbols-rounded text-base opacity-70 transition-transform duration-300"
              style={{
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                width: '18px',
                height: '18px',
                lineHeight: '18px',
                fontSize: '18px',
              }}
            >
              arrow_drop_down
            </span>
          </m3e-button>

          {isCriteriaFiltered && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 pointer-events-none items-center justify-center">
              <span className="cuki-filter-indicator-ping absolute inline-flex h-full w-full rounded-full bg-[var(--md-sys-color-primary)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--md-sys-color-primary)] ring-2 ring-[var(--md-sys-color-surface)] shadow-[0_0_8px_var(--md-sys-color-primary)]"></span>
            </span>
          )}

          {renderMenu()}
        </div>
      </div>

      {hasActiveFilters && (
        <m3e-button variant="text" onClick={onClearFilters}>
          <span slot="icon" className="material-symbols-rounded text-base">
            filter_alt_off
          </span>
          <span className="text-xs font-semibold">Clear Filters</span>
        </m3e-button>
      )}
    </div>
  )
}
