import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  SUPPORTED_ENGINE_IDS,
  getInstalledEngineVersions,
  getActiveEngineVersion,
  scanLocalEnginesDirectory,
  getEngineUpdateState,
  ENGINES_CHANGED_EVENT,
  type EngineId,
  type InstalledEngineVersion,
} from '@/core/engines'

export function useEngineInstalled(selectedEngineId: EngineId) {
  const [installedVersions, setInstalledVersions] = useState<InstalledEngineVersion[]>([])
  const [activeVersion, setActiveVersion] = useState<string | null>(null)
  const [allInstalledCounts, setAllInstalledCounts] = useState<Record<EngineId, number>>({
    psych: 0,
    codename: 0,
    pslice: 0,
    vslice: 0,
    psychonline: 0,
    fpsplus: 0,
  })

  const refreshAllInstalled = useCallback(async () => {
    try {
      const state = await getEngineUpdateState()
      const counts: Record<EngineId, number> = {
        psych: 0,
        codename: 0,
        pslice: 0,
        vslice: 0,
        psychonline: 0,
        fpsplus: 0,
      }

      for (const id of SUPPORTED_ENGINE_IDS) {
        counts[id] = state.engines[id]?.installedVersions?.length || 0
      }
      setAllInstalledCounts(counts)

      const curRecord = state.engines[selectedEngineId]
      setInstalledVersions(curRecord?.installedVersions || [])
      setActiveVersion(curRecord?.activeVersion || null)
    } catch (err) {
      console.warn('[useEngineInstalled] Failed to refresh installed engines:', err)
    }
  }, [selectedEngineId])

  useEffect(() => {
    let mounted = true
    const init = async () => {
      await scanLocalEnginesDirectory()
      if (mounted) {
        await refreshAllInstalled()
      }
    }
    init()
    return () => {
      mounted = false
    }
  }, [refreshAllInstalled])

  useEffect(() => {
    const handler = () => {
      refreshAllInstalled()
    }
    window.addEventListener(ENGINES_CHANGED_EVENT, handler)
    return () => {
      window.removeEventListener(ENGINES_CHANGED_EVENT, handler)
    }
  }, [refreshAllInstalled])

  useEffect(() => {
    let mounted = true
    const fetchInstalled = async () => {
      const versions = await getInstalledEngineVersions(selectedEngineId)
      const currentActive = await getActiveEngineVersion(selectedEngineId)
      if (mounted) {
        setInstalledVersions(versions)
        setActiveVersion(currentActive)
      }
    }
    fetchInstalled()
    return () => {
      mounted = false
    }
  }, [selectedEngineId])

  const installedVersionMap = useMemo(() => {
    const map = new Map<string, InstalledEngineVersion>()
    for (const v of installedVersions) {
      map.set(v.version, v)
    }
    return map
  }, [installedVersions])

  const clearInstalled = useCallback(() => {
    setInstalledVersions([])
    setActiveVersion(null)
  }, [])

  return {
    installedVersions,
    setInstalledVersions,
    activeVersion,
    setActiveVersion,
    allInstalledCounts,
    installedVersionMap,
    refreshAllInstalled,
    clearInstalled,
  }
}
