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
  uninstallModById,
  matchesModId,
  registerInstalledMod,
  extractBaseModId,
  type InstalledModRecord,
} from '@/core/mods'
import { openFolderInExplorer, resolveModInstallDirectory } from '@/core/mods/mod-filesystem'
import { ensureWeekBoxLibrary } from '@/core/storage'
import { getModById, ENGINE_CATEGORIES } from '@/services/gamebanana'
import type { ModItem } from '@/ui/mod-details-modal/types'
import { filterAndSortInstalledMods, installedRecordToModItem } from '../utils'
import type {
  LibraryEngineSummary,
  LibraryFilterState,
  LibrarySortOption,
  LibraryStats,
} from '../types'

let cachedInstalledMods: InstalledModRecord[] | null = null

export function useInstalledMods() {
  const [mods, setMods] = useState<InstalledModRecord[]>(() => cachedInstalledMods ?? [])
  const [onlineSavedMods, setOnlineSavedMods] = useState<InstalledModRecord[]>([])
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

  useEffect(() => {
    if (!isOnline) {
      setOnlineSavedMods([])
      return
    }

    let isMounted = true

    const loadOnlineSaved = async () => {
      const savedList = Array.from(new Set([...favoriteIds, ...bookmarkIds]))
      const missingIds = savedList.filter((favId) => {
        return !mods.some((m) => matchesModId(m, favId))
      })

      if (missingIds.length === 0) {
        if (isMounted) setOnlineSavedMods([])
        return
      }

      const fetchedList: InstalledModRecord[] = []
      for (const rawId of missingIds) {
        const numId = Number(rawId)
        if (Number.isNaN(numId) || numId <= 0) continue

        try {
          const gbMod = await getModById(numId)
          if (!gbMod || !isMounted) continue
          const engineCategory = Object.values(ENGINE_CATEGORIES).find(
            (c) => c.id === gbMod.engineId,
          )

          fetchedList.push({
            id: gbMod.id,
            modId: gbMod.id,
            name: gbMod.title,
            title: gbMod.title,
            description: gbMod.description,
            htmlBody: gbMod.htmlBody,
            author: gbMod.author,
            userPfp: gbMod.userPfp,
            image: gbMod.thumbnail,
            thumbnail: gbMod.thumbnail,
            previewMedia: gbMod.previewMedia,
            icon: gbMod.engineIcon || engineCategory?.icon,
            engineId: gbMod.engineId,
            engineName: engineCategory?.name || 'Default Engine',
            installPath: '',
            folderName: '',
            fileSize: 0,
            submittedAt: gbMod.submittedAt,
            updatedAt: gbMod.updatedAt,
            views: gbMod.views,
            likes: gbMod.likes,
            downloads: gbMod.downloads,
          })
        } catch {
        }
      }

      if (isMounted) {
        setOnlineSavedMods(fetchedList)
      }
    }

    void loadOnlineSaved()

    return () => {
      isMounted = false
    }
  }, [isOnline, favoriteIds, bookmarkIds, mods])

  useEffect(() => {
    if (!isOnline || mods.length === 0) return

    let isMounted = true

    const enrichIncompleteMods = async () => {
      for (const mod of mods) {
        if (!isMounted) break
        const hasRemoteThumb =
          mod.thumbnail?.startsWith('http') || mod.image?.startsWith('http')
        const hasPreviews =
          Array.isArray(mod.previewMedia) && mod.previewMedia.length > 0

        if (hasRemoteThumb && hasPreviews && mod.description) continue

        const baseId = extractBaseModId(mod.id || mod.modId || '')
        if (!/^\d+$/.test(baseId)) continue

        try {
          const gbMod = await getModById(Number(baseId))
          if (!gbMod || !isMounted) continue

          const remoteThumb = gbMod.thumbnail || ''
          const isBase =
            gbMod.categoryId === 43777 ||
            gbMod.categoryId === 29202 ||
            gbMod.engineId === 'vslice' ||
            (gbMod.categoryName || '').toLowerCase().includes('base')
          const resolvedEngineId = isBase ? 'vslice' : (gbMod.engineId || mod.engineId)
          const resolvedEngineName = isBase
            ? 'V-Slice / Base Game'
            : (gbMod.engineName || mod.engineName || 'Default Engine')
          const resolvedIcon = isBase
            ? '/imgs/icons/categories/vslice.png'
            : (gbMod.engineIcon || mod.icon)

          const updated: InstalledModRecord = {
            ...mod,
            categoryId: mod.categoryId || gbMod.categoryId,
            categoryName: mod.categoryName || gbMod.categoryName,
            engineId: mod.isExecutable ? 'executable' : resolvedEngineId,
            engineName: mod.isExecutable ? 'Executable' : resolvedEngineName,
            defaultEngineId: isBase ? 'vslice' : mod.defaultEngineId,
            defaultEngineName: isBase ? 'V-Slice / Base Game' : mod.defaultEngineName,
            icon: resolvedIcon,
            modId: mod.modId || gbMod.id,
            source: mod.source || 'gamebanana',
            sourceUrl:
              mod.sourceUrl || `https://gamebanana.com/mods/${gbMod.id}`,
            thumbnail: remoteThumb || mod.thumbnail,
            image: remoteThumb || mod.image,
            previewMedia:
              gbMod.previewMedia && gbMod.previewMedia.length > 0
                ? gbMod.previewMedia
                : mod.previewMedia,
            description: mod.description || gbMod.description,
            htmlBody: mod.htmlBody || gbMod.htmlBody,
            author:
              !mod.author ||
              mod.author === 'Unknown Creator' ||
              mod.author === 'Unknown Author'
                ? gbMod.author
                : mod.author,
            userPfp: mod.userPfp || gbMod.userPfp,
            likes: mod.likes || gbMod.likes,
            views: mod.views || gbMod.views,
            downloads: mod.downloads || gbMod.downloads,
            submittedAt: mod.submittedAt || gbMod.submittedAt,
            updatedAt: mod.updatedAt || gbMod.updatedAt,
          }

          await registerInstalledMod(updated)
        } catch {
        }
      }
    }

    void enrichIncompleteMods()

    return () => {
      isMounted = false
    }
  }, [isOnline, mods])

  const isFavorite = useCallback(
    (id: string | number) => {
      return favoriteIds.has(String(id))
    },
    [favoriteIds],
  )

  const isBookmarked = useCallback(
    (id: string | number) => {
      return bookmarkIds.has(String(id))
    },
    [bookmarkIds],
  )

  const toggleFavorite = useCallback((id: string | number) => {
    toggleModFavoriteId(id)
    setFavoriteIds(getFavoriteModIds())
  }, [])

  const toggleBookmark = useCallback((id: string | number) => {
    void toggleModBookmark(id).then(() => {
      void getBookmarkedMods().then((list) => {
        setBookmarkIds(new Set(list.map((item) => String(item))))
      })
    })
  }, [])

  const handleOpenModFolder = useCallback(
    async (record: InstalledModRecord) => {
      try {
        let folderPath = record.installPath
        if (!folderPath) {
          const resolved = await resolveModInstallDirectory(
            record.id,
            record.title || record.name,
          )
          folderPath = resolved.modInstallDir
        }
        const opened = await openFolderInExplorer(folderPath)
        if (!opened && typeof window !== 'undefined' && window.callout) {
          window.callout.surface(
            `Directory: ${folderPath}`,
            'Mod Directory Location',
            { duration: 4500 },
          )
        }
      } catch (err) {
        console.error('[WeekBox] Failed to open folder:', err)
        if (typeof window !== 'undefined' && window.callout) {
          window.callout.error(
            'Could not open mod directory on disk.',
            'Folder Error',
          )
        }
      }
    },
    [],
  )

  const handleOpenAllModsFolder = useCallback(async () => {
    try {
      const { paths } = await ensureWeekBoxLibrary()
      const opened = await openFolderInExplorer(paths.modsDir)
      if (!opened && typeof window !== 'undefined' && window.callout) {
        window.callout.surface(
          `Mods directory: ${paths.modsDir}`,
          'Library Location',
          { duration: 4500 },
        )
      }
    } catch (err) {
      console.error('[WeekBox] Failed to open mods directory:', err)
      if (typeof window !== 'undefined' && window.callout) {
        window.callout.error('Could not open library folder.', 'Storage Error')
      }
    }
  }, [])

  const handleUninstall = useCallback(async (record: InstalledModRecord) => {
    try {
      const success = await uninstallModById(record.id)
      if (success) {
        if (typeof window !== 'undefined' && window.callout) {
          window.callout.secondary(
            `"${record.title || record.name}" was uninstalled from your library.`,
            'Mod Uninstalled',
            { duration: 3500 },
          )
        }
      }
    } catch (err) {
      console.error('[WeekBox] Failed to uninstall mod:', err)
      if (typeof window !== 'undefined' && window.callout) {
        window.callout.error(
          err instanceof Error ? err.message : 'Failed to uninstall mod.',
          'Uninstall Error',
        )
      }
    }
  }, [])

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

  const stats = useMemo<LibraryStats>(() => {
    let totalSizeBytes = 0

    for (const mod of mods) {
      if (typeof mod.fileSize === 'number' && mod.fileSize > 0) {
        totalSizeBytes += mod.fileSize
      }
    }

    return {
      totalMods: mods.length,
      totalSizeBytes,
      favoritesCount: favoriteIds.size,
      bookmarksCount: bookmarkIds.size,
    }
  }, [mods, favoriteIds, bookmarkIds])

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

  const engineSummaries = useMemo<LibraryEngineSummary[]>(() => {
    const map = new Map<string, { name: string; icon?: string; count: number }>()

    for (const mod of allMods) {
      const rawId = (mod.engineId || mod.engineName || 'vslice').toLowerCase()
      const isVSlice =
        rawId === 'vslice' ||
        rawId === 'v-slice' ||
        rawId === 'base' ||
        rawId === 'basegame' ||
        rawId.includes('v-slice') ||
        rawId.includes('base') ||
        mod.categoryId === 43777 ||
        mod.categoryId === 29202

      const id = isVSlice ? 'vslice' : rawId
      const name = isVSlice
        ? 'V-Slice / Base Game'
        : (mod.engineName || (id === 'executable' ? 'Executable' : 'Default Engine'))
      const icon = isVSlice ? '/imgs/icons/categories/vslice.png' : mod.icon

      const existing = map.get(id)
      if (existing) {
        existing.count += 1
        if (!existing.icon && icon) existing.icon = icon
      } else {
        map.set(id, { name, icon, count: 1 })
      }
    }

    return Array.from(map.entries()).map(([id, info]) => ({
      id,
      name: info.name,
      icon: info.icon,
      count: info.count,
    }))
  }, [allMods])

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
