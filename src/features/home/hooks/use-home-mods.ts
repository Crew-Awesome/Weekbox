import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getMods, type GameBananaMod, type ModFilter } from '@/services/gamebanana'
import type { ModItem } from '@/ui/mod-details-modal'
import { mapToModItem } from '../utils'

const CHUNK_SIZE = 16

export function useHomeMods(
  searchQuery: string,
  filter: ModFilter = 'ripe',
  engineFilter: string | string[] = 'all',
) {
  const [modsList, setModsList] = useState<GameBananaMod[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const pageRef = useRef(1)

  const engineKey = useMemo(() => {
    if (!engineFilter) return 'all'
    if (Array.isArray(engineFilter)) {
      const clean = engineFilter.filter((id) => id && id !== 'all').sort()
      return clean.length === 0 ? 'all' : clean.join(',')
    }
    return engineFilter
  }, [engineFilter])

  const syncKey = `${searchQuery}|${filter}|${engineKey}`
  const [syncedKey, setSyncedKey] = useState(syncKey)

  if (syncedKey !== syncKey) {
    setSyncedKey(syncKey)
    setIsInitialLoading(true)
    setHasMore(true)
    setModsList([])
  }

  const activeEngines = useMemo(() => {
    if (engineKey === 'all') return null
    if (Array.isArray(engineFilter)) {
      return engineFilter.filter((id) => id && id !== 'all')
    }
    return engineFilter
  }, [engineKey, engineFilter])

  useEffect(() => {
    let isMounted = true
    pageRef.current = 1

    getMods(filter, 1, CHUNK_SIZE, activeEngines, searchQuery)
      .then((mods) => {
        if (!isMounted) return
        setModsList(mods || [])
        pageRef.current = 1
        if (!mods || mods.length === 0) {
          setHasMore(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load GameBanana mods:', err)
        if (isMounted) setModsList([])
      })
      .finally(() => {
        if (isMounted) setIsInitialLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [searchQuery, filter, engineKey, activeEngines])

  const loadNextChunk = useCallback(async () => {
    if (isLoadingMore || !hasMore || isInitialLoading) return

    setIsLoadingMore(true)
    const nextPage = pageRef.current + 1

    try {
      const nextMods = await getMods(
        filter,
        nextPage,
        CHUNK_SIZE,
        activeEngines,
        searchQuery,
      )
      if (!nextMods || nextMods.length === 0) {
        setHasMore(false)
      } else {
        setModsList((prev) => {
          const existingIds = new Set(prev.map((m) => m.id))
          const uniqueNew = nextMods.filter((m) => !existingIds.has(m.id))
          if (uniqueNew.length === 0) {
            setHasMore(false)
            return prev
          }
          return [...prev, ...uniqueNew]
        })
        pageRef.current = nextPage
        if (nextMods.length < 15) {
          setHasMore(false)
        }
      }
    } catch (err) {
      console.error('Failed to load next mods chunk:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, isInitialLoading, filter, activeEngines, searchQuery])

  const modItems = useMemo<ModItem[]>(() => {
    return modsList.map(mapToModItem)
  }, [modsList])

  return {
    modsList,
    modItems,
    isInitialLoading,
    isLoadingMore,
    hasMore,
    loadNextChunk,
  }
}
