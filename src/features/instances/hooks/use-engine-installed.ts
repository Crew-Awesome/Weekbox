import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  SUPPORTED_ENGINE_IDS,
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
  const selectedEngineIdRef = useRef(selectedEngineId)
  useEffect(() => {
    selectedEngineIdRef.current = selectedEngineId
  }, [selectedEngineId])

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

      const curRecord = state.engines[selectedEngineIdRef.current]
      setInstalledVersions(curRecord?.installedVersions || [])
      setActiveVersion(
        curRecord?.activeVersion ||
          curRecord?.installedVersions?.[0]?.version ||
          null,
      )
    } catch (err) {
      console.warn('[useEngineInstalled] Failed to refresh installed engines:', err)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const init = async () => {
      await refreshAllInstalled()
      await scanLocalEnginesDirectory()
      if (mounted) {
        await refreshAllInstalled()
      }
    }
    void init()
    return () => {
      mounted = false
    }
  }, [refreshAllInstalled])

  useEffect(() => {
    const handler = () => {
      void refreshAllInstalled()
    }
    window.addEventListener(ENGINES_CHANGED_EVENT, handler)
    return () => {
      window.removeEventListener(ENGINES_CHANGED_EVENT, handler)
    }
  }, [refreshAllInstalled])

  useEffect(() => {
    let mounted = true
    const fetchSelectedEngine = async () => {
      const state = await getEngineUpdateState()
      const curRecord = state.engines[selectedEngineId]
      if (mounted) {
        setInstalledVersions(curRecord?.installedVersions || [])
        setActiveVersion(
          curRecord?.activeVersion ||
            curRecord?.installedVersions?.[0]?.version ||
            null,
        )
      }
    }
    void fetchSelectedEngine()
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
