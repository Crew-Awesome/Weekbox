import { useState, useEffect, useCallback } from 'react'
import {
  getFavoriteModIds,
  toggleModFavoriteId,
  FAVORITES_CHANGED_EVENT,
} from '@/core/mods'

/**
 * Provides reactive favorite mod IDs synchronized across Home cards and ModDetailsModal.
 */
export function useHomeFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() =>
    getFavoriteModIds(),
  )

  useEffect(() => {
    const syncFavorites = () => {
      setFavorites(getFavoriteModIds())
    }

    window.addEventListener(FAVORITES_CHANGED_EVENT, syncFavorites)
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, syncFavorites)
    }
  }, [])

  const isFavorite = useCallback(
    (id: number | string) => favorites.has(String(id)),
    [favorites],
  )

  const toggleFavorite = useCallback((id: number | string) => {
    toggleModFavoriteId(id)
    setFavorites(getFavoriteModIds())
  }, [])

  return {
    favorites,
    isFavorite,
    toggleFavorite,
  }
}
