import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getMods, type GameBananaMod } from '@/services/gamebanana'
import type { ModItem } from '@/ui/mod-details-modal'
import { mapToModItem } from '../utils'

const CHUNK_SIZE = 16

/**
 * Fetches paginated popular (ripe) or search-filtered mods from GameBanana.
 */
export function useHomeMods(searchQuery: string) {
  const [modsList, setModsList] = useState<GameBananaMod[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const pageRef = useRef(1)
  const [syncedSearchQuery, setSyncedSearchQuery] = useState(searchQuery)

  if (syncedSearchQuery !== searchQuery) {
    setSyncedSearchQuery(searchQuery)
    setIsInitialLoading(true)
    setHasMore(true)
    setModsList([])
  }

  useEffect(() => {
    let isMounted = true
    pageRef.current = 1

    getMods('ripe', 1, CHUNK_SIZE, null, searchQuery)
      .then((mods) => {
        if (!isMounted) return
        setModsList(mods || [])
        pageRef.current = 1
        if (!mods || mods.length === 0) {
          setHasMore(false)
        }
      })
      .catch((err) => {
        console.error('Failed to load GameBanana ripe mods:', err)
        if (isMounted) setModsList([])
      })
      .finally(() => {
        if (isMounted) setIsInitialLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [searchQuery])

  const loadNextChunk = useCallback(async () => {
    if (isLoadingMore || !hasMore || isInitialLoading) return

    setIsLoadingMore(true)
    const nextPage = pageRef.current + 1

    try {
      const nextMods = await getMods(
        'ripe',
        nextPage,
        CHUNK_SIZE,
        null,
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
  }, [isLoadingMore, hasMore, isInitialLoading, searchQuery])

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
