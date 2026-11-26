import { useState, useEffect, useMemo } from 'react'
import {
  getFeaturedMods,
  getCachedFeaturedMods,
  FEATURED_UPDATED_EVENT,
  type GameBananaMod,
} from '@/services/gamebanana'
import type { ModItem } from '@/ui/mod-details-modal/types'
import { mapToModItem } from '../utils'

export function useFeaturedMods() {
  const [featuredList, setFeaturedList] = useState<GameBananaMod[]>(
    () => getCachedFeaturedMods() ?? [],
  )
  const [isFeaturedLoading, setIsFeaturedLoading] = useState(
    () => !(getCachedFeaturedMods()?.length),
  )

  useEffect(() => {
    let isMounted = true

    const handleUpdated = (evt: Event) => {
      const detail = (evt as CustomEvent<GameBananaMod[] | undefined>).detail
      if (isMounted && Array.isArray(detail) && detail.length > 0) {
        setFeaturedList(detail)
        setIsFeaturedLoading(false)
      }
    }

    window.addEventListener(FEATURED_UPDATED_EVENT, handleUpdated)

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
      window.removeEventListener(FEATURED_UPDATED_EVENT, handleUpdated)
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
