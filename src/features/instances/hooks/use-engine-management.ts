import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  ENGINE_DEFINITIONS,
  SUPPORTED_ENGINE_IDS,
  useEngineDownloads,
  getCompatibleAsset,
  type EngineId,
  type EngineDefinition,
  type GitHubRelease,
  type GitHubReleaseAsset,
  type InstalledEngineVersion,
} from '@/core/engines'
import { useEngineInstalled } from './use-engine-installed'
import { useEngineReleases } from './use-engine-releases'
import { useEngineActions } from './use-engine-actions'

export const INSTANCES_ENGINE_STORAGE_KEY = 'weekbox:instances:selected_engine'
export const INSTANCES_VERSION_STORAGE_KEY = 'weekbox:instances:selected_version'

export const getInstancesEngineVersionStorageKey = (engineId: EngineId) =>
  `weekbox:instances:selected_version:${engineId}`

function getInitialEngine(fallback: EngineId): EngineId {
  if (typeof localStorage === 'undefined') return fallback
  try {
    const saved = localStorage.getItem(INSTANCES_ENGINE_STORAGE_KEY)
    if (saved && (SUPPORTED_ENGINE_IDS as readonly string[]).includes(saved)) {
      return saved as EngineId
    }
  } catch {}
  return fallback
}

function getInitialVersion(engineId: EngineId): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const savedForEngine = localStorage.getItem(
      getInstancesEngineVersionStorageKey(engineId),
    )
    if (savedForEngine) return savedForEngine
    const globalSaved = localStorage.getItem(INSTANCES_VERSION_STORAGE_KEY)
    if (globalSaved) return globalSaved
  } catch {}
  return null
}

export interface EngineVersionOption {
  version: string
  installed?: InstalledEngineVersion
  release?: GitHubRelease
  asset?: GitHubReleaseAsset
  isActive: boolean
}

export function useEngineManagement(initialEngineId: EngineId = 'psych') {
  const [selectedEngineId, setSelectedEngineId] = useState<EngineId>(() =>
    getInitialEngine(initialEngineId),
  )
  const [versionSelection, setVersionSelection] = useState<{
    engineId: EngineId
    version: string
  } | null>(() => {
    const initEngine = getInitialEngine(initialEngineId)
    const savedVer = getInitialVersion(initEngine)
    return savedVer ? { engineId: initEngine, version: savedVer } : null
  })

  const currentEngine: EngineDefinition = ENGINE_DEFINITIONS[selectedEngineId]

  const {
    installedVersions,
    activeVersion,
    setActiveVersion,
    allInstalledCounts,
    installedVersionMap,
    refreshAllInstalled,
    clearInstalled,
  } = useEngineInstalled(selectedEngineId)

  const {
    releases,
    isLoadingReleases,
    releasesError,
    platform,
    compatibleReleases,
    latestCompatibleRelease,
    loadReleases,
    clearReleases,
  } = useEngineReleases(currentEngine)

  const { tasksByVersion, isDownloadingAny, downloadEngine, cancelDownload } =
    useEngineDownloads(selectedEngineId)

  const latestReleaseTag = latestCompatibleRelease?.tagName ?? null
  const selectedVersion = useMemo(() => {
    if (versionSelection && versionSelection.engineId === selectedEngineId) {
      return versionSelection.version
    }
    if (activeVersion) return activeVersion
    if (latestReleaseTag) return latestReleaseTag
    if (installedVersions.length > 0) return installedVersions[0].version
    return null
  }, [
    versionSelection,
    selectedEngineId,
    activeVersion,
    latestReleaseTag,
    installedVersions,
  ])

  const selectVersion = useCallback(
    (version: string) => {
      setVersionSelection({ engineId: selectedEngineId, version })
      try {
        localStorage.setItem(
          getInstancesEngineVersionStorageKey(selectedEngineId),
          version,
        )
        localStorage.setItem(INSTANCES_VERSION_STORAGE_KEY, version)
      } catch {}
    },
    [selectedEngineId],
  )

  const versionOptions = useMemo<EngineVersionOption[]>(() => {
    const options: EngineVersionOption[] = []
    const seen = new Set<string>()

    const sortedInstalled = [...installedVersions].sort((a, b) => {
      if (a.version === activeVersion) return -1
      if (b.version === activeVersion) return 1
      return b.installedAt - a.installedAt
    })

    for (const installed of sortedInstalled) {
      if (seen.has(installed.version)) continue
      seen.add(installed.version)
      const release = releases.find((r) => r.tagName === installed.version)
      options.push({
        version: installed.version,
        installed,
        release,
        asset: release
          ? getCompatibleAsset(release.assets, platform)
          : undefined,
        isActive: installed.version === activeVersion,
      })
    }

    for (const release of compatibleReleases) {
      if (seen.has(release.tagName)) continue
      seen.add(release.tagName)
      options.push({
        version: release.tagName,
        release,
        asset: getCompatibleAsset(release.assets, platform),
        isActive: release.tagName === activeVersion,
      })
    }

    return options
  }, [installedVersions, releases, compatibleReleases, activeVersion, platform])

  const {
    isUninstalling,
    handleSetDefault,
    handleDelete,
    handleLaunch,
    handleOpenFolder,
    handleDownload,
    handleCancelDownload,
    handleOpenGitHub,
  } = useEngineActions({
    selectedEngineId,
    currentEngine,
    refreshAllInstalled,
    setActiveVersion,
    downloadEngine,
    cancelDownload,
    onSelectDownloadingVersion: (version) => {
      setVersionSelection({ engineId: selectedEngineId, version })
      try {
        localStorage.setItem(
          getInstancesEngineVersionStorageKey(selectedEngineId),
          version,
        )
        localStorage.setItem(INSTANCES_VERSION_STORAGE_KEY, version)
      } catch {}
    },
  })

  const handleSelectEngine = (engineId: EngineId) => {
    if (engineId === selectedEngineId) return
    setSelectedEngineId(engineId)
    clearReleases()
    clearInstalled()
    const savedVer = getInitialVersion(engineId)
    if (savedVer) {
      setVersionSelection({ engineId, version: savedVer })
    } else {
      setVersionSelection(null)
    }
    try {
      localStorage.setItem(INSTANCES_ENGINE_STORAGE_KEY, engineId)
    } catch {}
  }

  useEffect(() => {
    try {
      localStorage.setItem(INSTANCES_ENGINE_STORAGE_KEY, selectedEngineId)
      if (selectedVersion) {
        localStorage.setItem(
          getInstancesEngineVersionStorageKey(selectedEngineId),
          selectedVersion,
        )
        localStorage.setItem(INSTANCES_VERSION_STORAGE_KEY, selectedVersion)
      }
    } catch {}
  }, [selectedEngineId, selectedVersion])

  useEffect(() => {
    if (isLoadingReleases || versionOptions.length === 0) return
    if (versionSelection && versionSelection.engineId === selectedEngineId) {
      const exists = versionOptions.some(
        (opt) => opt.version === versionSelection.version,
      )
      if (!exists) {
        setVersionSelection(null)
      }
    }
  }, [isLoadingReleases, versionOptions, versionSelection, selectedEngineId])

  const selectedRelease = useMemo(
    () =>
      selectedVersion
        ? releases.find((release) => release.tagName === selectedVersion)
        : undefined,
    [releases, selectedVersion],
  )

  const selectedInstalledVersion = selectedVersion
    ? installedVersionMap.get(selectedVersion)
    : undefined

  const selectedTask = selectedVersion
    ? tasksByVersion[selectedVersion]
    : undefined

  const handleInstallSelected = async () => {
    if (!selectedVersion) return
    const release = selectedRelease
    const asset = release
      ? getCompatibleAsset(release.assets, platform)
      : undefined

    if (!release || !asset) {
      if (typeof window !== 'undefined' && window.callout) {
        window.callout.error(
          `No compatible download was found for ${currentEngine.name} ${selectedVersion} on this platform.`,
          'No Asset Available',
        )
      }
      return
    }

    await handleDownload(release, asset)
  }

  const handleUninstallSelected = () => {
    if (selectedVersion) {
      handleDelete(selectedVersion)
    }
  }

  const handleLaunchSelected = () => {
    if (selectedVersion) {
      void handleLaunch(selectedVersion)
    }
  }

  const handleSetSelectedAsDefault = async () => {
    if (selectedVersion) {
      await handleSetDefault(selectedVersion)
    }
  }

  return {
    selectedEngineId,
    currentEngine,
    supportedEngines: SUPPORTED_ENGINE_IDS,
    allInstalledCounts,
    platform,
    releases,
    compatibleReleases,
    latestCompatibleRelease,
    isLoadingReleases,
    releasesError,
    installedVersions,
    installedVersionMap,
    activeVersion,
    tasksByVersion,
    isDownloadingAny,
    selectedVersion,
    selectedRelease,
    selectedInstalledVersion,
    selectedTask,
    versionOptions,
    selectEngine: handleSelectEngine,
    selectVersion,
    refreshReleases: () => loadReleases(true),
    refreshInstalled: refreshAllInstalled,
    setDefaultVersion: handleSetDefault,
    deleteVersion: handleDelete,
    launchVersion: handleLaunch,
    openFolder: handleOpenFolder,
    downloadRelease: handleDownload,
    cancelDownload: handleCancelDownload,
    openGitHub: handleOpenGitHub,
    installSelectedVersion: handleInstallSelected,
    uninstallSelectedVersion: handleUninstallSelected,
    isUninstalling,
    launchSelectedVersion: handleLaunchSelected,
    setSelectedAsDefault: handleSetSelectedAsDefault,
  }
}
