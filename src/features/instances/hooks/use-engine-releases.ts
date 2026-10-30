import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getCompatibleAsset,
  detectPlatform,
  type EngineDefinition,
  type EnginePlatform,
} from '@/core/engines'
import { fetchEngineReleases, type GitHubRelease } from '@/services/github'

export function useEngineReleases(currentEngine: EngineDefinition | undefined) {
  const [releases, setReleases] = useState<GitHubRelease[]>([])
  const [isLoadingReleases, setIsLoadingReleases] = useState(false)
  const [releasesError, setReleasesError] = useState<string | null>(null)

  const platform = useMemo<EnginePlatform>(() => detectPlatform(), [])

  const loadReleases = useCallback(
    async (forceRefresh = false) => {
      if (!currentEngine?.repo) return
      setIsLoadingReleases(true)
      setReleasesError(null)

      try {
        const data = await fetchEngineReleases(currentEngine.repo, forceRefresh)
        setReleases(data)
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Failed to fetch releases from GitHub'
        setReleasesError(msg)
      } finally {
        setIsLoadingReleases(false)
      }
    },
    [currentEngine],
  )

  useEffect(() => {
    loadReleases(false)
  }, [loadReleases])

  const compatibleReleases = useMemo(
    () =>
      releases.filter((release) =>
        Boolean(getCompatibleAsset(release.assets, platform)),
      ),
    [releases, platform],
  )

  const latestCompatibleRelease = compatibleReleases[0]

  const clearReleases = useCallback(() => {
    setReleases([])
    setReleasesError(null)
  }, [])

  return {
    releases,
    setReleases,
    isLoadingReleases,
    releasesError,
    setReleasesError,
    platform,
    compatibleReleases,
    latestCompatibleRelease,
    loadReleases,
    clearReleases,
  }
}
