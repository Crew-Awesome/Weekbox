import React, { useEffect } from 'react'
import type { LibraryEngineSummary, LibrarySortOption } from '../types'
import {
  M3E_MENU_STYLE,
  DIVIDER_STYLE,
  LibraryCriteriaSubmenus,
} from './LibraryCriteriaSubmenus'

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
  const handleClearAndClose = () => {
    onClearFilters()
    const mainMenu = document.getElementById('library-criteria-menu') as unknown as {
      hideAll?: (restoreFocus?: boolean) => void
    }
    mainMenu?.hideAll?.(true)
  }

  const handleSelectAllEngines = () => {
    onSelectAllEngines()
    const mainMenu = document.getElementById('library-criteria-menu') as unknown as {
      hideAll?: (restoreFocus?: boolean) => void
    }
    mainMenu?.hideAll?.(true)
  }

  useEffect(() => {
    const engineMenuEl = document.getElementById('library-filter-engine-menu')
    const byMenuEl = document.getElementById('library-filter-by-menu')

    const handleEngineClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const item = target?.closest('m3e-menu-item-checkbox')
      if (!item) return
      const engineId = item.getAttribute('data-engine-id')
      if (engineId === 'all') return
      e.preventDefault()
    }

    const handleEngineMouseLeave = (e: MouseEvent) => {
      const related = e.relatedTarget as Node | null
      const triggerItem = document.getElementById('library-engine-menu-item')
      if (triggerItem && related && triggerItem.contains(related)) return
      const menu = engineMenuEl as unknown as { hide?: () => void }
      menu?.hide?.()
    }

    const handleByClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('m3e-menu-item-checkbox')) {
        e.preventDefault()
      }
    }

    const handleByMouseLeave = (e: MouseEvent) => {
      const related = e.relatedTarget as Node | null
      const triggerItem = document.getElementById('library-filter-by-menu-item')
      if (triggerItem && related && triggerItem.contains(related)) return
      const menu = byMenuEl as unknown as { hide?: () => void }
      menu?.hide?.()
    }

    engineMenuEl?.addEventListener('click', handleEngineClickCapture, { capture: true })
    engineMenuEl?.addEventListener('mouseleave', handleEngineMouseLeave)
    byMenuEl?.addEventListener('click', handleByClickCapture, { capture: true })
    byMenuEl?.addEventListener('mouseleave', handleByMouseLeave)

    return () => {
      engineMenuEl?.removeEventListener('click', handleEngineClickCapture, { capture: true })
      engineMenuEl?.removeEventListener('mouseleave', handleEngineMouseLeave)
      byMenuEl?.removeEventListener('click', handleByClickCapture, { capture: true })
      byMenuEl?.removeEventListener('mouseleave', handleByMouseLeave)
    }
  }, [])

  return (
    <>
      <m3e-menu
        id="library-criteria-menu"
        position-x="after"
        position-y="below"
        style={M3E_MENU_STYLE}
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
          <m3e-menu-item id="library-sort-menu-item" style={{ margin: '2px 0' }}>
            <span
              slot="icon"
              className="material-symbols-rounded text-lg text-[var(--md-sys-color-primary)]"
            >
              sort
            </span>
            <m3e-menu-trigger for="library-filter-sort-menu">
              <span className="text-xs sm:text-sm font-semibold">Sort</span>
            </m3e-menu-trigger>
          </m3e-menu-item>

          <m3e-menu-item id="library-filter-by-menu-item" style={{ margin: '2px 0' }}>
            <span
              slot="icon"
              className="material-symbols-rounded text-lg text-[var(--md-sys-color-primary)]"
            >
              filter_list
            </span>
            <m3e-menu-trigger for="library-filter-by-menu">
              <span className="text-xs sm:text-sm font-semibold">Filter By</span>
            </m3e-menu-trigger>
          </m3e-menu-item>

          <m3e-menu-item id="library-engine-menu-item" style={{ margin: '2px 0' }}>
            <span
              slot="icon"
              className="material-symbols-rounded text-lg text-[var(--md-sys-color-primary)]"
            >
              tune
            </span>
            <m3e-menu-trigger for="library-filter-engine-menu">
              <span className="text-xs sm:text-sm font-semibold">Engine</span>
            </m3e-menu-trigger>
          </m3e-menu-item>

          {hasActiveFilters && (
            <>
              <m3e-divider style={DIVIDER_STYLE}></m3e-divider>
              <m3e-menu-item onClick={handleClearAndClose} style={{ margin: '2px 0' }}>
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
      </m3e-menu>

      <LibraryCriteriaSubmenus
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
        onSelectAllEngines={handleSelectAllEngines}
        onToggleEngine={onToggleEngine}
      />
    </>
  )
}
