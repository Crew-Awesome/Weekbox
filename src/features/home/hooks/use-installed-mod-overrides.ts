import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  getInstalledMods,
  getCachedInstalledModsFromLocalStorage,
  extractBaseModId,
  MODS_CHANGED_EVENT,
  type InstalledModRecord,
} from '@/core/mods'
import type { ModItem } from '@/ui/mod-details-modal/types'

function buildInstalledMap(
  records: InstalledModRecord[],
): Map<string, InstalledModRecord> {
  const map = new Map<string, InstalledModRecord>()
  for (const rec of records) {
    const baseId = extractBaseModId(rec.id || rec.modId || '')
    if (baseId) map.set(baseId, rec)
  }
  return map
}

/**
 * Keeps an in-memory map of installed mods keyed by base GameBanana ID so Home
 * cards automatically show the detected engine icon, warnings, and local avatars.
 */
export function useInstalledModOverrides() {
  const [installedMap, setInstalledMap] = useState<
    Map<string, InstalledModRecord>
  >(() => buildInstalledMap(getCachedInstalledModsFromLocalStorage()))

  useEffect(() => {
    let cancelled = false
    const loadMap = () => {
      void getInstalledMods()
        .then((records) => {
          if (cancelled) return
          setInstalledMap(buildInstalledMap(records))
        })
        .catch(() => {})
    }

    loadMap()
    window.addEventListener(MODS_CHANGED_EVENT, loadMap)
    return () => {
      cancelled = true
      window.removeEventListener(MODS_CHANGED_EVENT, loadMap)
    }
  }, [])

  const applyOverride = useCallback(
    (item: ModItem): ModItem => {
      const installed = installedMap.get(extractBaseModId(item.id))
      if (!installed) return item
      return {
        ...item,
        isInstalled: true,
        categoryId: installed.categoryId ?? item.categoryId,
        categoryName: installed.isExecutable
          ? 'Executable Mods'
          : installed.categoryName || item.categoryName,
        fileName: installed.fileName || item.fileName,
        isExecutable: installed.isExecutable,
        engineId: installed.engineId || item.engineId,
        engineName: installed.engineName || item.engineName,
        icon: installed.icon || item.icon,
        engineIcon: installed.icon || item.engineIcon,
        hasEngineWarning: installed.hasEngineWarning,
        engineWarningMessage: installed.engineWarningMessage,
        userPfp: installed.userPfp || item.userPfp,
        userPfpPath: installed.userPfpPath || item.userPfpPath,
        localUserPfp: installed.localUserPfp || item.localUserPfp,
        credits:
          installed.credits && installed.credits.length > 0
            ? installed.credits
            : item.credits,
        authors:
          installed.authors && installed.authors.length > 0
            ? installed.authors
            : item.authors,
      }
    },
    [installedMap],
  )

  const applyOverrides = useMemo(() => {
    return (items: ModItem[]): ModItem[] => items.map(applyOverride)
  }, [applyOverride])

  return { applyOverride, applyOverrides }
}
