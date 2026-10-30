import { useState } from 'react'
import { initHost } from '@/core/host'
import {
  setActiveEngineVersion,
  deleteInstalledEngineVersion,
  openEngineDirectory,
  launchEngineVersion,
  type EngineId,
  type EngineDefinition,
  type GitHubRelease,
  type GitHubReleaseAsset,
} from '@/core/engines'
import { useSystemDialog } from '@/ui/dialog'

interface UseEngineActionsParams {
  selectedEngineId: EngineId
  currentEngine: EngineDefinition
  refreshAllInstalled: () => Promise<void>
  setActiveVersion: (version: string | null) => void
  downloadEngine: (params: {
    engineId: EngineId
    release: GitHubRelease
    asset: GitHubReleaseAsset
    onComplete?: () => void
  }) => Promise<void>
  cancelDownload: (engineId: EngineId, version: string) => void
  onSelectDownloadingVersion?: (version: string) => void
}

export function useEngineActions({
  selectedEngineId,
  currentEngine,
  refreshAllInstalled,
  setActiveVersion,
  downloadEngine,
  cancelDownload,
  onSelectDownloadingVersion,
}: UseEngineActionsParams) {
  const [isUninstalling, setIsUninstalling] = useState(false)
  const { openDialog } = useSystemDialog()

  const handleSetDefault = async (version: string) => {
    await setActiveEngineVersion(selectedEngineId, version)
    setActiveVersion(version)
    await refreshAllInstalled()
  }

  const handleDelete = (version: string) => {
    openDialog({
      type: 'confirm',
      title: 'Uninstall Engine Version',
      message: `Are you sure you want to delete ${currentEngine.name} version ${version}? All files for this version will be removed from your disk.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setIsUninstalling(true)
        try {
          const ok = await deleteInstalledEngineVersion(selectedEngineId, version)
          if (ok) {
            await refreshAllInstalled()
          }
        } finally {
          setIsUninstalling(false)
        }
      },
    })
  }

  const handleLaunch = async (version: string) => {
    const host = initHost()
    const launched = await launchEngineVersion(selectedEngineId, version)
    if (!launched && typeof window !== 'undefined' && window.callout) {
      if (host.platform !== 'desktop') {
        window.callout.error(
          'Engine execution is currently only supported on desktop platforms.',
          'Cannot Launch',
        )
      } else {
        window.callout.error(
          `Could not find an executable file for ${currentEngine.name} ${version}.`,
          'Launch Failed',
        )
      }
    }
  }

  const handleOpenFolder = async (version?: string) => {
    const opened = await openEngineDirectory(selectedEngineId, version)
    if (!opened && typeof window !== 'undefined' && window.callout) {
      window.callout.surface('Could not open directory in explorer', 'File Explorer')
    }
  }

  const handleDownload = async (
    release: GitHubRelease,
    asset: GitHubReleaseAsset,
  ) => {
    const targetVersion = release.tagName || 'latest'
    onSelectDownloadingVersion?.(targetVersion)

    await downloadEngine({
      engineId: selectedEngineId,
      release,
      asset,
      onComplete: () => {
        refreshAllInstalled()
      },
    })
  }

  const handleCancelDownload = (version: string) => {
    cancelDownload(selectedEngineId, version)
  }

  const handleOpenGitHub = () => {
    const host = initHost()
    const url = `https://github.com/${currentEngine.repo}`
    host.openUrl(url)
  }

  return {
    isUninstalling,
    handleSetDefault,
    handleDelete,
    handleLaunch,
    handleOpenFolder,
    handleDownload,
    handleCancelDownload,
    handleOpenGitHub,
  }
}
