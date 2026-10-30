import React, { lazy, Suspense } from 'react'
import { Topbar } from '@/ui/topbar'
import { useSystemDialog } from '@/ui/dialog'
import { formatFileSize } from '@/utils/formatters'
import { useInstalledMods } from './hooks'
import { LibraryFiltersBar, LibraryGrid, LibrarySearchBar } from './components'
import { launchMod, type InstalledModRecord } from '@/core/mods'

const ModDetailsModal = lazy(() =>
  import('@/ui/mod-details-modal').then((m) => ({
    default: m.ModDetailsModal,
  })),
)

export const LibraryView: React.FC = () => {
  const {
    allMods,
    filteredMods,
    isLoading,
    filters,
    stats,
    engineSummaries,
    selectedMod,
    isFavorite,
    isBookmarked,
    toggleFavorite,
    toggleFavoritesFilter,
    toggleBookmarksFilter,
    clearFilters,
    hasActiveFilters,
    setSearchQuery,
    setEngineFilter,
    setSortBy,
    handleSelectMod,
    handleCloseModal,
    handleOpenModFolder,
    handleOpenAllModsFolder,
    handleUninstall,
    reload,
  } = useInstalledMods()

  const { openDialog } = useSystemDialog()

  const handlePlayMod = async (mod: InstalledModRecord) => {
    try {
      const res = await launchMod(mod)
      if (res.success) {
        if (typeof window !== 'undefined' && window.callout) {
          window.callout.primary(
            res.isExecutable
              ? `Launching ${mod.title || mod.name || 'executable'}...`
              : `Launching ${mod.title || mod.name || 'mod'} with ${res.engineName || 'engine'}...`,
            'Playing Mod',
          )
        }
      } else {
        if (typeof window !== 'undefined' && window.callout) {
          window.callout.error(
            res.error || 'Failed to launch mod',
            'Launch Error',
          )
        }
      }
    } catch (err: unknown) {
      if (typeof window !== 'undefined' && window.callout) {
        window.callout.error(
          err instanceof Error ? err.message : 'Error launching mod',
          'Launch Error',
        )
      }
    }
  }

  const handleRequestUninstall = (mod: InstalledModRecord) => {
    const title = mod.title || mod.name || 'this mod'
    openDialog({
      type: 'confirm',
      title: 'Uninstall Mod',
      message: `Are you sure you want to uninstall "${title}"? Its files will be deleted from your WeekBoxLibrary.`,
      confirmText: 'Uninstall',
      cancelText: 'Cancel',
      onConfirm: () => {
        void handleUninstall(mod)
      },
    })
  }

  const infoTooltipText = `${stats.totalMods} ${stats.totalMods === 1 ? 'mod' : 'mods'} installed · ${formatFileSize(stats.totalSizeBytes)} used`

  return (
    <div className="w-full min-h-full flex flex-col">
      <Topbar
        trailing={
          <div className="flex items-center gap-1 shrink-0 absolute right-4 sm:right-8 z-20">
            <m3e-icon-button
              onClick={() => void reload()}
              title="Refresh"
              style={{ cursor: 'pointer' }}
            >
              <span className="material-symbols-rounded text-xl leading-none">
                refresh
              </span>
            </m3e-icon-button>

            <m3e-icon-button
              onClick={() => void handleOpenAllModsFolder()}
              title="Open mods folder in File Explorer"
              style={{ cursor: 'pointer' }}
            >
              <span className="material-symbols-rounded text-xl leading-none">
                folder_open
              </span>
            </m3e-icon-button>

            <m3e-icon-button
              id="library-info-tooltip-btn"
              aria-label="Storage and mod info"
              style={{ cursor: 'pointer' }}
            >
              <span className="material-symbols-rounded text-xl leading-none">
                info
              </span>
            </m3e-icon-button>

            <m3e-tooltip for="library-info-tooltip-btn" position="below">
              {infoTooltipText}
            </m3e-tooltip>
          </div>
        }
      >
        <div className="w-full max-w-2xl mx-auto flex items-center gap-2.5">
          <LibraryFiltersBar
            compact
            selectedEngine={filters.engineFilter}
            onSelectEngine={setEngineFilter}
            engineSummaries={engineSummaries}
            sortBy={filters.sortBy}
            onSortChange={setSortBy}
            filterFavorites={filters.filterFavorites}
            onToggleFavorites={toggleFavoritesFilter}
            favoritesCount={stats.favoritesCount}
            filterBookmarks={filters.filterBookmarks}
            onToggleBookmarks={toggleBookmarksFilter}
            bookmarksCount={stats.bookmarksCount}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
          <div className="flex-1 min-w-0">
            <LibrarySearchBar
              query={filters.searchQuery}
              onQueryChange={setSearchQuery}
              allMods={allMods}
              onSelectMod={handleSelectMod}
              onPlayMod={handlePlayMod}
            />
          </div>
        </div>
      </Topbar>

      <div className="flex-1 flex flex-col gap-5 p-4 sm:p-8">
        {hasActiveFilters && (
          <div className="flex items-center justify-between pb-1">
            <div className="text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] flex items-center gap-2">
              <span className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]">
                tune
              </span>
              <span>
                Showing filtered results ({filteredMods.length} of {allMods.length})
              </span>
            </div>
            <m3e-button variant="text" onClick={clearFilters}>
              <span slot="icon" className="material-symbols-rounded text-base">
                filter_alt_off
              </span>
              <span className="text-xs font-semibold">Clear Filters</span>
            </m3e-button>
          </div>
        )}

        <LibraryGrid
          mods={filteredMods}
          isLoading={isLoading}
          totalModsCount={allMods.length}
          searchQuery={filters.searchQuery}
          isFavorite={isFavorite}
          isBookmarked={isBookmarked}
          onToggleFavorite={toggleFavorite}
          onSelectMod={handleSelectMod}
          onOpenFolder={(mod) => void handleOpenModFolder(mod)}
          onUninstall={handleRequestUninstall}
          onClearFilters={clearFilters}
          onOpenAllModsFolder={() => void handleOpenAllModsFolder()}
          onPlay={handlePlayMod}
        />

        {Boolean(selectedMod) && (
          <Suspense fallback={null}>
            <ModDetailsModal
              selectedCard={selectedMod}
              isOpen={Boolean(selectedMod)}
              onClose={handleCloseModal}
            />
          </Suspense>
        )}
      </div>
    </div>
  )
}

export default LibraryView
