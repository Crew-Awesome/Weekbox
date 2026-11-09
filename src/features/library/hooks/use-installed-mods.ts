import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getInstalledMods,
  MODS_CHANGED_EVENT,
  FAVORITES_CHANGED_EVENT,
  BOOKMARKS_CHANGED_EVENT,
  getFavoriteModIds,
  getBookmarkedMods,
  toggleModFavoriteId,
  toggleModBookmark,
  toggleModVisibility,
  type InstalledModRecord,
} from '@/core/mods'
import type { ModItem } from '@/ui/mod-details-modal/types'
import { filterAndSortInstalledMods, installedRecordToModItem } from '../utils'
import {
  useOnlineModEnrichment,
  computeLibraryStats,
  computeEngineSummaries,
  openModFolderAction,
  openAllModsFolderAction,
  uninstallModAction,
} from './use-online-mod-enrichment'
import type {
  LibraryFilterState,
  LibrarySortOption,
} from '../types'

let cachedInstalledMods: InstalledModRecord[] | null = null

export function useInstalledMods() {
  const [mods, setMods] = useState<InstalledModRecord[]>(() => cachedInstalledMods ?? [])
  const [isLoading, setIsLoading] = useState<boolean>(() => !cachedInstalledMods)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  const [filters, setFilters] = useState<LibraryFilterState>({
    searchQuery: '',
    engineFilter: 'all',
    sortBy: 'recent',
    filterFavorites: false,
    filterBookmarks: false,
  })

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() =>
    getFavoriteModIds(),
  )
  const [bookmarkIds, setBookmarkIds] = useState<Set<string>>(() => new Set())
  const [selectedMod, setSelectedMod] = useState<ModItem | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const fetchMods = useCallback(async () => {
    try {
      setError(null)
      const list = await getInstalledMods()
      cachedInstalledMods = list
      setMods(list)
    } catch (err) {
      console.error('[WeekBox] Error loading installed mods:', err)
      setError(err instanceof Error ? err.message : 'Error loading library')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchMods()

    const handleModsChanged = () => {
      void fetchMods()
    }

    const handleFavoritesChanged = () => {
      setFavoriteIds(getFavoriteModIds())
    }

    const handleBookmarksChanged = () => {
      void getBookmarkedMods().then((list) => {
        setBookmarkIds(new Set(list.map((id) => String(id))))
      })
    }

    handleBookmarksChanged()

    window.addEventListener(MODS_CHANGED_EVENT, handleModsChanged)
    window.addEventListener(FAVORITES_CHANGED_EVENT, handleFavoritesChanged)
    window.addEventListener(BOOKMARKS_CHANGED_EVENT, handleBookmarksChanged)

    return () => {
      window.removeEventListener(MODS_CHANGED_EVENT, handleModsChanged)
      window.removeEventListener(FAVORITES_CHANGED_EVENT, handleFavoritesChanged)
      window.removeEventListener(BOOKMARKS_CHANGED_EVENT, handleBookmarksChanged)
    }
  }, [fetchMods])

  const onlineSavedMods = useOnlineModEnrichment(
    isOnline,
    mods,
    favoriteIds,
    bookmarkIds,
  )

  const isFavorite = useCallback(
    (id: string | number) => favoriteIds.has(String(id)),
    [favoriteIds],
  )

  const isBookmarked = useCallback(
    (id: string | number) => bookmarkIds.has(String(id)),
    [bookmarkIds],
  )

  const toggleFavorite = useCallback((id: string | number) => {
    toggleModFavoriteId(id)
    setFavoriteIds(getFavoriteModIds())
  }, [])

  const toggleVisibility = useCallback(async (id: string | number) => {
    try {
      await toggleModVisibility(id)
    } catch (err) {
      console.error('[WeekBox] Failed to toggle mod visibility:', err)
    }
  }, [])

  const toggleBookmark = useCallback((id: string | number) => {
    void toggleModBookmark(id).then(() => {
      void getBookmarkedMods().then((list) => {
        setBookmarkIds(new Set(list.map((item) => String(item))))
      })
    })
  }, [])

  const handleOpenModFolder = useCallback(
    (record: InstalledModRecord) => openModFolderAction(record),
    [],
  )

  const handleOpenAllModsFolder = useCallback(
    () => openAllModsFolderAction(),
    [],
  )

  const handleUninstall = useCallback(
    (record: InstalledModRecord) => uninstallModAction(record),
    [],
  )

  const handleSelectMod = useCallback((record: InstalledModRecord) => {
    setSelectedMod(installedRecordToModItem(record))
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedMod(null)
  }, [])

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }))
  }, [])

  const setEngineFilter = useCallback((engine: string | string[]) => {
    setFilters((prev) => ({ ...prev, engineFilter: engine }))
  }, [])

  const setSortBy = useCallback((sortBy: LibrarySortOption) => {
    setFilters((prev) => ({ ...prev, sortBy }))
  }, [])

  const toggleFavoritesFilter = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      filterFavorites: !prev.filterFavorites,
    }))
  }, [])

  const toggleBookmarksFilter = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      filterBookmarks: !prev.filterBookmarks,
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      engineFilter: 'all',
      sortBy: 'recent',
      filterFavorites: false,
      filterBookmarks: false,
    })
  }, [])

  const allMods = useMemo(() => {
    if (!isOnline || onlineSavedMods.length === 0) return mods
    return [...mods, ...onlineSavedMods]
  }, [mods, onlineSavedMods, isOnline])

  const filteredMods = useMemo(() => {
    return filterAndSortInstalledMods(
      allMods,
      filters.searchQuery,
      filters.engineFilter,
      filters.sortBy,
      favoriteIds,
      bookmarkIds,
      filters.filterFavorites,
      filters.filterBookmarks,
    )
  }, [
    allMods,
    filters.searchQuery,
    filters.engineFilter,
    filters.sortBy,
    filters.filterFavorites,
    filters.filterBookmarks,
    favoriteIds,
    bookmarkIds,
  ])

  const stats = useMemo(
    () => computeLibraryStats(mods, favoriteIds, bookmarkIds),
    [mods, favoriteIds, bookmarkIds],
  )

  const hasActiveFilters = useMemo(() => {
    const isEngineFiltered = Array.isArray(filters.engineFilter)
      ? filters.engineFilter.length > 0 && !filters.engineFilter.includes('all')
      : filters.engineFilter !== 'all'

    return Boolean(
      filters.searchQuery.trim() ||
        isEngineFiltered ||
        filters.filterFavorites ||
        filters.filterBookmarks ||
        filters.sortBy !== 'recent',
    )
  }, [filters])

  const engineSummaries = useMemo(
    () => computeEngineSummaries(allMods),
    [allMods],
  )

  return {
    mods,
    allMods,
    filteredMods,
    isLoading,
    isOnline,
    error,
    filters,
    stats,
    engineSummaries,
    favoriteIds,
    bookmarkIds,
    selectedMod,
    isFavorite,
    isBookmarked,
    toggleFavorite,
    toggleVisibility,
    toggleBookmark,
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
    reload: fetchMods,
  }
}
