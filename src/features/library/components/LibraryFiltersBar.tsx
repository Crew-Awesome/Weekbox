import React, { useMemo, useState, useEffect } from 'react'
import type { LibraryEngineSummary, LibrarySortOption } from '../types'
import { FilterIcon } from '@/ui/icons/FilterIcon'
import { LibraryCriteriaMenu } from './LibraryCriteriaMenu'

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

const M3E_BUTTON_STYLE: React.CSSProperties = {
  '--m3e-button-outlined-container-shape': '16px',
  '--m3e-button-outlined-outline-color':
    'color-mix(in srgb, var(--md-sys-color-outline-variant) 60%, transparent)',
  '--m3e-button-outlined-label-text-color': 'var(--md-sys-color-on-surface)',
  '--m3e-button-container-height': '42px',
  '--m3e-button-icon-size': '22px',
  '--m3e-button-icon-label-space': '8px',
  cursor: 'pointer',
} as React.CSSProperties

const SORT_NAMES: Record<LibrarySortOption, string> = {
  recent: 'Recently Installed',
  name: 'Name (A-Z)',
  size: 'Size',
  engine: 'Engine',
}

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
    const parts = [SORT_NAMES[sortBy] || 'Recently Installed']
    if (!isAllEngines) parts.push(currentEngineLabel)
    if (filterFavorites && filterBookmarks) parts.push('Favs + Bookmarks')
    else if (filterFavorites) parts.push('Favorites')
    else if (filterBookmarks) parts.push('Bookmarks')
    return parts.join(' • ')
  }, [sortBy, isAllEngines, currentEngineLabel, filterFavorites, filterBookmarks])

  const isCriteriaFiltered =
    filterFavorites || filterBookmarks || !isAllEngines || sortBy !== 'recent'

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

  const menuNode = (
    <LibraryCriteriaMenu
      sortBy={sortBy}
      onSortChange={onSortChange}
      filterFavorites={filterFavorites}
      onToggleFavorites={onToggleFavorites}
      favoritesCount={favoritesCount}
      filterBookmarks={filterBookmarks}
      onToggleBookmarks={onToggleBookmarks}
      bookmarksCount={bookmarksCount}
      engineSummaries={engineSummaries}
      selectedEngines={selectedEngines}
      isAllEngines={isAllEngines}
      onSelectAllEngines={() => onSelectEngine('all')}
      onToggleEngine={handleToggleEngine}
      hasActiveFilters={hasActiveFilters}
      onClearFilters={onClearFilters}
    />
  )

  const tonalOverride = isCriteriaFiltered
    ? {
        '--m3e-button-tonal-container-color':
          'color-mix(in srgb, var(--md-sys-color-primary) 14%, transparent)',
        '--m3e-button-tonal-label-text-color': 'var(--md-sys-color-primary)',
      }
    : {}

  const activeBadge = isCriteriaFiltered && (
    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 pointer-events-none items-center justify-center">
      <span className="cuki-filter-indicator-ping absolute inline-flex h-full w-full rounded-full bg-[var(--md-sys-color-primary)] opacity-75"></span>
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--md-sys-color-primary)] ring-2 ring-[var(--md-sys-color-surface)] shadow-[0_0_8px_var(--md-sys-color-primary)]"></span>
    </span>
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
              ...tonalOverride,
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
        {activeBadge}
        {menuNode}
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 pt-1 ${className}`}>
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
                ...tonalOverride,
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
          {activeBadge}
          {menuNode}
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
