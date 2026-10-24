import { useState, useRef, useCallback } from 'react'
import type { ModItem } from '@/ui/mod-details-modal'
import { getModById, getMods } from '@/services/gamebanana'
import { mapToModItem } from '../utils'

interface UseGameBananaSearchParams {
  initialQuery?: string
  onOpenDropdown?: () => void
}

/**
 * Handles debounced and immediate GameBanana searches (by numeric mod ID or text query).
 */
export function useGameBananaSearch({
  initialQuery = '',
  onOpenDropdown,
}: UseGameBananaSearchParams) {
  const [query, setQuery] = useState(initialQuery)
  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery)
  const [searchResults, setSearchResults] = useState<ModItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (prevInitialQuery !== initialQuery) {
    setPrevInitialQuery(initialQuery)
    setQuery(initialQuery)
  }

  const cancelDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
  }, [])

  const resetSearchState = useCallback(() => {
    cancelDebounce()
    setQuery('')
    setSearchResults([])
    setHasSearched(false)
    setIsSearching(false)
  }, [cancelDebounce])

  const executeSearch = useCallback(
    async (searchTerm: string) => {
      const trimmed = searchTerm.trim()
      if (!trimmed) {
        setSearchResults([])
        setHasSearched(false)
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      setHasSearched(true)
      onOpenDropdown?.()

      try {
        const isNumeric = /^\d+$/.test(trimmed)
        if (isNumeric) {
          const singleMod = await getModById(Number(trimmed))
          setSearchResults(singleMod ? [mapToModItem(singleMod)] : [])
        } else {
          const results = await getMods('ripe', 1, 15, null, trimmed)
          setSearchResults(results.map(mapToModItem))
        }
      } catch (err) {
        console.error('GameBanana search failed:', err)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    },
    [onOpenDropdown],
  )

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      setQuery(val)
      cancelDebounce()

      const trimmed = val.trim()
      if (!trimmed) {
        setSearchResults([])
        setHasSearched(false)
        setIsSearching(false)
        return
      }

      debounceTimerRef.current = setTimeout(() => {
        void executeSearch(trimmed)
      }, 450)
    },
    [cancelDebounce, executeSearch],
  )

  return {
    query,
    setQuery,
    cleanQuery: query.trim(),
    searchResults,
    isSearching,
    hasSearched,
    cancelDebounce,
    resetSearchState,
    executeSearch,
    handleQueryChange,
  }
}
