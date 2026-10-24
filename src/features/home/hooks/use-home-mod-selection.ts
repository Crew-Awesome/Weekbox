import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getModById, type GameBananaMod } from '@/services/gamebanana'
import type { ModItem } from '@/ui/mod-details-modal'
import { mapToModItem } from '../utils'

interface UseHomeModSelectionParams {
  featuredList: GameBananaMod[]
  modsList: GameBananaMod[]
}

/**
 * Synchronizes URL search parameters (`?q=` and `?mod=`) with the selected ModDetailsModal state.
 */
export function useHomeModSelection({
  featuredList,
  modsList,
}: UseHomeModSelectionParams) {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') || ''
  const currentModId = searchParams.get('mod')

  const [syncedModId, setSyncedModId] = useState<string | null>(null)
  const [selectedModData, setSelectedModData] = useState<ModItem | null>(null)

  if (currentModId !== syncedModId) {
    setSyncedModId(currentModId)
    if (!currentModId) {
      setSelectedModData(null)
    } else {
      const initial =
        featuredList.find((m) => String(m.id) === currentModId) ||
        modsList.find((m) => String(m.id) === currentModId)
      setSelectedModData(initial ? mapToModItem(initial) : null)
    }
  }

  useEffect(() => {
    if (!currentModId) return

    const modNum = Number(currentModId)
    if (Number.isNaN(modNum)) return

    let isMounted = true
    getModById(modNum).then((mod) => {
      if (isMounted && mod) {
        setSelectedModData(mapToModItem(mod))
      }
    })

    return () => {
      isMounted = false
    }
  }, [currentModId])

  const handleOpenMod = useCallback(
    (mod: ModItem) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('mod', String(mod.id))
        return next
      })
    },
    [setSearchParams],
  )

  const handleCloseModal = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('mod')
      return next
    })
  }, [setSearchParams])

  const handleSearch = useCallback(
    (newQuery: string) => {
      const trimmed = newQuery.trim()
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (trimmed) {
          next.set('q', trimmed)
        } else {
          next.delete('q')
        }
        next.delete('mod')
        return next
      })
    },
    [setSearchParams],
  )

  return {
    searchQuery,
    selectedModData,
    handleOpenMod,
    handleCloseModal,
    handleSearch,
  }
}
