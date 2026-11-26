import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getMods, type GameBananaMod, type ModFilter } from '@/services/gamebanana'
import { getGameJoltMods } from '@/services/gamejolt'
import { getBackstageMods } from '@/services/backstage'
import type { ModProviderId } from '@/services/providers'
import type { ModItem } from '@/ui/mod-details-modal/types'
import { mapToModItem } from '../utils'

const CHUNK_SIZE = 20
const MAX_EMPTY_PAGE_RETRIES = 3

interface HomeModsCache {
  provider: ModProviderId
  searchQuery: string
  filter: string
  engineKey: string
  mods: GameBananaMod[]
  page: number
  hasMore: boolean
}

let globalHomeModsCache: HomeModsCache | null = null

export async function preloadInitialHomeMods(): Promise<GameBananaMod[]> {
  if (
    isMatchingCache(globalHomeModsCache, 'gamebanana', '', 'ripe', 'all') &&
    globalHomeModsCache.mods.length > 0
  ) {
    return globalHomeModsCache.mods
  }

  const mods = await getMods('ripe', 1, CHUNK_SIZE, null, '')
  const list = mods || []
  if (list.length > 0) {
    globalHomeModsCache = {
      provider: 'gamebanana',
      searchQuery: '',
      filter: 'ripe',
      engineKey: 'all',
      mods: list,
      page: 1,
      hasMore: true,
    }
  }
  return list
}

function isMatchingCache(
  cache: HomeModsCache | null,
  provider: ModProviderId,
  searchQuery: string,
  filter: string,
  engineKey: string,
): cache is HomeModsCache {
  return (
    cache !== null &&
    cache.provider === provider &&
    cache.searchQuery === searchQuery &&
    cache.filter === filter &&
    cache.engineKey === engineKey
  )
}

function getEngineKey(engineFilter: string | string[] = 'all'): string {
  if (!engineFilter) return 'all'
  if (Array.isArray(engineFilter)) {
    const clean = engineFilter.filter((id) => id && id !== 'all').sort()
    return clean.length === 0 ? 'all' : clean.join(',')
  }
  return engineFilter
}

async function fetchProviderPage(params: {
  provider: ModProviderId
  filter: string
  page: number
  activeEngines: string[] | null
  searchQuery: string
}): Promise<{ mods: GameBananaMod[]; hasMore: boolean }> {
  const { provider, filter, page, activeEngines, searchQuery } = params
  if (provider === 'gamejolt') {
    return getGameJoltMods({
      section: filter,
      page,
      query: searchQuery,
      osFilters: activeEngines ?? [],
    })
  }
  if (provider === 'backstage') {
    return getBackstageMods({
      sort: filter,
      engine: activeEngines?.[0] ?? '',
      query: searchQuery,
      page,
      limit: CHUNK_SIZE,
    })
  }
  const mods = await getMods(
    filter as ModFilter,
    page,
    CHUNK_SIZE,
    activeEngines,
    searchQuery,
  )
  const list = mods || []
  return { mods: list, hasMore: list.length > 0 }
}

export function useHomeMods(
  searchQuery: string,
  filter: string = 'ripe',
  engineFilter: string | string[] = 'all',
  provider: ModProviderId = 'gamebanana',
) {
  const initialCache =
    isMatchingCache(
      globalHomeModsCache,
      provider,
      searchQuery,
      filter,
      getEngineKey(engineFilter),
    ) && (globalHomeModsCache?.mods.length ?? 0) > 0
      ? globalHomeModsCache
      : null

  const [modsList, setModsList] = useState<GameBananaMod[]>(() => initialCache?.mods ?? [])
  const [isInitialLoading, setIsInitialLoading] = useState(() => !initialCache)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(() => initialCache?.hasMore ?? true)
  const [isError, setIsError] = useState(false)
  const [retryTrigger, setRetryTrigger] = useState(0)

  const pageRef = useRef(initialCache?.page ?? 1)
  const busyRef = useRef(!initialCache)
  const hasMoreRef = useRef(initialCache?.hasMore ?? true)
  const seenIdsRef = useRef<Set<number | string>>(
    new Set(initialCache?.mods.map((m) => m.id) ?? []),
  )
  const generationRef = useRef(0)
  const autoRetryDoneRef = useRef(false)
  const hasMatchingCacheOnMountRef = useRef(Boolean(initialCache))

  const engineKey = useMemo(() => getEngineKey(engineFilter), [engineFilter])

  const activeEngines = useMemo(() => {
    if (engineKey === 'all') return null
    return engineKey.split(',')
  }, [engineKey])

  useEffect(() => {
    if (hasMatchingCacheOnMountRef.current) {
      hasMatchingCacheOnMountRef.current = false
      busyRef.current = false
      return
    }

    const matchingCache =
      isMatchingCache(globalHomeModsCache, provider, searchQuery, filter, engineKey) &&
      (globalHomeModsCache?.mods.length ?? 0) > 0
        ? globalHomeModsCache
        : null

    const generation = ++generationRef.current

    if (matchingCache) {
      pageRef.current = matchingCache.page
      busyRef.current = false
      hasMoreRef.current = matchingCache.hasMore
      seenIdsRef.current = new Set(matchingCache.mods.map((m) => m.id))
      queueMicrotask(() => {
        if (generation !== generationRef.current) return
        setModsList(matchingCache.mods)
        setIsInitialLoading(false)
        setIsLoadingMore(false)
        setIsError(false)
        setHasMore(matchingCache.hasMore)
      })
      return
    }

    pageRef.current = 1
    busyRef.current = true
    hasMoreRef.current = true
    seenIdsRef.current = new Set()

    queueMicrotask(() => {
      if (generation !== generationRef.current) return
      setIsInitialLoading(true)
      setIsLoadingMore(false)
      setIsError(false)
      setHasMore(true)
      setModsList([])

      fetchProviderPage({
        provider,
        filter,
        page: 1,
        activeEngines,
        searchQuery,
      })
        .then(({ mods: list, hasMore: moreAvailable }) => {
          if (generation !== generationRef.current) return
          seenIdsRef.current = new Set(list.map((m) => m.id))
          setModsList(list)
          hasMoreRef.current = moreAvailable
          setHasMore(moreAvailable)

          if (list.length > 0) {
            globalHomeModsCache = {
              provider,
              searchQuery,
              filter,
              engineKey,
              mods: list,
              page: 1,
              hasMore: moreAvailable,
            }
          }
        })
        .catch((err) => {
          console.error(`Failed to load ${provider} mods:`, err)
          if (generation === generationRef.current) {
            setIsError(true)
            if (!autoRetryDoneRef.current && !searchQuery) {
              autoRetryDoneRef.current = true
              setTimeout(() => {
                setRetryTrigger((prev) => prev + 1)
              }, 1200)
            }
          }
        })
        .finally(() => {
          if (generation !== generationRef.current) return
          busyRef.current = false
          setIsInitialLoading(false)
        })
    })
  }, [provider, searchQuery, filter, activeEngines, engineKey, retryTrigger])

  const loadNextChunk = useCallback(async () => {
    if (busyRef.current || !hasMoreRef.current) return

    const generation = generationRef.current
    busyRef.current = true
    setIsLoadingMore(true)

    try {
      for (let attempt = 0; attempt < MAX_EMPTY_PAGE_RETRIES; attempt++) {
        const targetPage = pageRef.current + 1
        const { mods: nextMods, hasMore: moreAvailable } = await fetchProviderPage({
          provider,
          filter,
          page: targetPage,
          activeEngines,
          searchQuery,
        })
        if (generation !== generationRef.current) return

        if (!nextMods || nextMods.length === 0) {
          hasMoreRef.current = false
          setHasMore(false)
          if (
            globalHomeModsCache &&
            isMatchingCache(globalHomeModsCache, provider, searchQuery, filter, engineKey)
          ) {
            globalHomeModsCache.hasMore = false
          }
          return
        }

        pageRef.current = targetPage
        const uniqueNew = nextMods.filter((m) => !seenIdsRef.current.has(m.id))
        if (uniqueNew.length > 0) {
          for (const m of uniqueNew) seenIdsRef.current.add(m.id)
          hasMoreRef.current = moreAvailable
          setHasMore(moreAvailable)
          setModsList((prev) => {
            const nextList = [...prev, ...uniqueNew]
            globalHomeModsCache = {
              provider,
              searchQuery,
              filter,
              engineKey,
              mods: nextList,
              page: targetPage,
              hasMore: moreAvailable,
            }
            return nextList
          })
          return
        }
      }
    } catch (err) {
      console.error('Failed to load next mods chunk:', err)
    } finally {
      if (generation === generationRef.current) {
        busyRef.current = false
        setIsLoadingMore(false)
      }
    }
  }, [provider, filter, activeEngines, engineKey, searchQuery])

  const reload = useCallback(() => {
    globalHomeModsCache = null
    hasMatchingCacheOnMountRef.current = false
    setRetryTrigger((prev) => prev + 1)
  }, [])

  const modItems = useMemo<ModItem[]>(() => modsList.map(mapToModItem), [modsList])

  return {
    modsList,
    modItems,
    isInitialLoading,
    isLoadingMore,
    hasMore,
    isError,
    loadNextChunk,
    reload,
  }
}
