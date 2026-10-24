import { useState, useEffect, useMemo } from 'react'
import { getFeaturedMods, type GameBananaMod } from '@/services/gamebanana'
import type { ModItem } from '@/ui/mod-details-modal'
import { mapToModItem } from '../utils'

/**
 * Fetches and normalizes featured mods from GameBanana for the Home carousel.
 */
export function useFeaturedMods() {
  const [featuredList, setFeaturedList] = useState<GameBananaMod[]>([])
  const [isFeaturedLoading, setIsFeaturedLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    getFeaturedMods()
      .then((mods) => {
        if (!isMounted) return
        if (mods && mods.length > 0) {
          setFeaturedList(mods)
        }
      })
      .catch((err) => {
        console.error('Failed to load GameBanana featured mods:', err)
      })
      .finally(() => {
        if (isMounted) setIsFeaturedLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const featuredItems = useMemo<ModItem[]>(() => {
    return featuredList.map(mapToModItem)
  }, [featuredList])

  return {
    featuredList,
    featuredItems,
    isFeaturedLoading,
  }
}
