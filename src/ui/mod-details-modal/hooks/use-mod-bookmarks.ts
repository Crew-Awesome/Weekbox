import { useState, useEffect, useCallback } from 'react'
import {
  getBookmarkedMods,
  toggleModBookmark,
  getFavoriteModIds,
  toggleModFavoriteId,
  BOOKMARKS_CHANGED_EVENT,
  FAVORITES_CHANGED_EVENT,
} from '@/core/mods'

/**
 * Manages persisted favorite and bookmark state for a mod in the details modal.
 */
export function useModBookmarks(modId?: string | number) {
  const [prevModId, setPrevModId] = useState(modId)
  const [isFav, setIsFav] = useState<boolean>(() =>
    modId !== undefined ? getFavoriteModIds().has(String(modId)) : false,
  )
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false)

  if (prevModId !== modId) {
    setPrevModId(modId)
    setIsFav(
      modId !== undefined && modId !== null
        ? getFavoriteModIds().has(String(modId))
        : false,
    )
  }

  useEffect(() => {
    let cancelled = false
    if (modId === undefined || modId === null) return

    const target = String(modId)

    const syncBookmarks = async () => {
      const list = await getBookmarkedMods()
      if (!cancelled) {
        setIsBookmarked(list.some((id) => String(id) === target))
      }
    }

    const syncFavorites = () => {
      if (!cancelled) {
        setIsFav(getFavoriteModIds().has(target))
      }
    }

    void syncBookmarks()

    window.addEventListener(BOOKMARKS_CHANGED_EVENT, syncBookmarks)
    window.addEventListener(FAVORITES_CHANGED_EVENT, syncFavorites)
    return () => {
      cancelled = true
      window.removeEventListener(BOOKMARKS_CHANGED_EVENT, syncBookmarks)
      window.removeEventListener(FAVORITES_CHANGED_EVENT, syncFavorites)
    }
  }, [modId])

  const handleToggleFavorite = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (modId === undefined || modId === null) return
      const next = toggleModFavoriteId(modId)
      setIsFav(next)
    },
    [modId],
  )

  const handleToggleBookmark = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (modId === undefined || modId === null) return
      void toggleModBookmark(modId).then((next) => {
        setIsBookmarked(next)
      })
    },
    [modId],
  )

  return {
    isFav,
    handleToggleFavorite,
    isBookmarked,
    handleToggleBookmark,
  }
}
