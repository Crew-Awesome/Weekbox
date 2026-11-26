import { useState, useRef, useCallback } from 'react'
import type { ModItem } from '@/ui/mod-details-modal/types'
import { getMods } from '@/services/gamebanana'
import { getGameJoltMods } from '@/services/gamejolt'
import { getBackstageMods } from '@/services/backstage'
import {
  getProviderModDetails,
  parseProviderDirectInput,
  type ModProviderId,
} from '@/services/providers'
import { mapToModItem } from '../utils'

interface UseGameBananaSearchParams {
  initialQuery?: string
  provider?: ModProviderId
  onOpenDropdown?: () => void
}

export function useGameBananaSearch({
  initialQuery = '',
  provider = 'gamebanana',
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
        const directTarget = parseProviderDirectInput(trimmed)
        if (directTarget) {
          const targetKey =
            directTarget.provider === 'gamebanana'
              ? directTarget.id
              : `${directTarget.provider}:${directTarget.id}`
          const singleMod = await getProviderModDetails(targetKey)
          setSearchResults(singleMod ? [mapToModItem(singleMod)] : [])
          return
        }

        if (provider === 'gamejolt') {
          const { mods } = await getGameJoltMods({ query: trimmed, page: 1 })
          setSearchResults(mods.slice(0, 15).map(mapToModItem))
        } else if (provider === 'backstage') {
          const { mods } = await getBackstageMods({
            query: trimmed,
            page: 1,
            limit: 15,
          })
          setSearchResults(mods.map(mapToModItem))
        } else {
          const results = await getMods('ripe', 1, 15, null, trimmed)
          setSearchResults(results.map(mapToModItem))
        }
      } catch (err) {
        console.error(`${provider} search failed:`, err)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    },
    [onOpenDropdown, provider],
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
