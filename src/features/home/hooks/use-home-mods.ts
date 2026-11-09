import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getMods, type GameBananaMod, type ModFilter } from '@/services/gamebanana'
import type { ModItem } from '@/ui/mod-details-modal'
import { mapToModItem } from '../utils'

const CHUNK_SIZE = 30
const MAX_EMPTY_PAGE_RETRIES = 3

interface HomeModsCache {
  searchQuery: string
  filter: ModFilter
  engineKey: string
  mods: GameBananaMod[]
  page: number
  hasMore: boolean
}

let globalHomeModsCache: HomeModsCache | null = null

function isMatchingCache(
  cache: HomeModsCache | null,
  searchQuery: string,
  filter: ModFilter,
  engineKey: string,
): cache is HomeModsCache {
  return (
    cache !== null &&
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

export function useHomeMods(
  searchQuery: string,
  filter: ModFilter = 'ripe',
  engineFilter: string | string[] = 'all',
) {
  const initialCache =
    isMatchingCache(
      globalHomeModsCache,
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

  const engineKey = useMemo(() => {
    return getEngineKey(engineFilter)
  }, [engineFilter])

  const activeEngines = useMemo(() => {
    if (engineKey === 'all') return null
    return engineKey.split(',')
  }, [engineKey])

  useEffect(() => {
    if (
      isMatchingCache(globalHomeModsCache, searchQuery, filter, engineKey) &&
      modsList.length > 0 &&
      modsList === globalHomeModsCache?.mods
    ) {
      busyRef.current = false
      return
    }

    const generation = ++generationRef.current
    pageRef.current = 1
    busyRef.current = true
    hasMoreRef.current = true
    seenIdsRef.current = new Set()
    setIsInitialLoading(true)
    setIsLoadingMore(false)
    setIsError(false)
    setHasMore(true)
    setModsList([])

    getMods(filter, 1, CHUNK_SIZE, activeEngines, searchQuery)
      .then((mods) => {
        if (generation !== generationRef.current) return
        const list = mods || []
        seenIdsRef.current = new Set(list.map((m) => m.id))
        setModsList(list)
        const hasMoreMods = list.length > 0
        hasMoreRef.current = hasMoreMods
        setHasMore(hasMoreMods)

        if (list.length > 0) {
          globalHomeModsCache = {
            searchQuery,
            filter,
            engineKey,
            mods: list,
            page: 1,
            hasMore: hasMoreMods,
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load GameBanana mods:', err)
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
  }, [searchQuery, filter, activeEngines, engineKey, retryTrigger])

  const loadNextChunk = useCallback(async () => {
    if (busyRef.current || !hasMoreRef.current) return

    const generation = generationRef.current
    busyRef.current = true
    setIsLoadingMore(true)

    try {
      for (let attempt = 0; attempt < MAX_EMPTY_PAGE_RETRIES; attempt++) {
        const targetPage = pageRef.current + 1
        const nextMods = await getMods(
          filter,
          targetPage,
          CHUNK_SIZE,
          activeEngines,
          searchQuery,
        )
        if (generation !== generationRef.current) return

        if (!nextMods || nextMods.length === 0) {
          hasMoreRef.current = false
          setHasMore(false)
          if (globalHomeModsCache && isMatchingCache(globalHomeModsCache, searchQuery, filter, engineKey)) {
            globalHomeModsCache.hasMore = false
          }
          return
        }

        pageRef.current = targetPage
        const uniqueNew = nextMods.filter((m) => !seenIdsRef.current.has(m.id))
        if (uniqueNew.length > 0) {
          for (const m of uniqueNew) seenIdsRef.current.add(m.id)
          setModsList((prev) => {
            const nextList = [...prev, ...uniqueNew]
            globalHomeModsCache = {
              searchQuery,
              filter,
              engineKey,
              mods: nextList,
              page: targetPage,
              hasMore: true,
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
  }, [filter, activeEngines, searchQuery, engineKey])

  const reload = useCallback(() => {
    globalHomeModsCache = null
    autoRetryDoneRef.current = false
    setRetryTrigger((prev) => prev + 1)
  }, [])

  const modItems = useMemo<ModItem[]>(() => {
    return modsList.map(mapToModItem)
  }, [modsList])

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
