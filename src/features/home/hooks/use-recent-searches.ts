import { useState, useCallback } from 'react'

const RECENT_SEARCHES_STORAGE_KEY = 'wbr:recent_searches'
const MAX_RECENT_SEARCHES = 10

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      )
    }
  } catch (err) {
    console.warn('Failed to load recent searches from storage:', err)
  }
  return []
}

function persistRecentSearches(items: string[]): void {
  try {
    localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(items))
  } catch (err) {
    console.warn('Failed to persist recent searches to storage:', err)
  }
}

/**
 * Manages persisted recent search queries in localStorage.
 */
export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>(() =>
    loadRecentSearches(),
  )

  const addRecentSearch = useCallback((term: string) => {
    const trimmed = term.trim()
    if (!trimmed) return
    setRecentSearches((prev) => {
      const filtered = prev.filter(
        (item) => item.toLowerCase() !== trimmed.toLowerCase(),
      )
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES)
      persistRecentSearches(updated)
      return updated
    })
  }, [])

  const removeRecentSearch = useCallback((term: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter(
        (item) => item.toLowerCase() !== term.toLowerCase(),
      )
      persistRecentSearches(updated)
      return updated
    })
  }, [])

  const clearAllRecentSearches = useCallback(() => {
    setRecentSearches([])
    try {
      localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  return {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearAllRecentSearches,
  }
}
