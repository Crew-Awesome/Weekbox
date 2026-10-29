import { useState, useCallback } from 'react'
import {
  useModDownloads,
  uninstallModById,
  openFolderInExplorer,
  resolveModInstallDirectory,
  launchMod,
  type InstalledModRecord,
} from '@/core/mods'
import type { ModItem, GameBananaFile } from '../types'

interface UseModDownloadActionsParams {
  displayCard: ModItem
  validFiles: GameBananaFile[]
  installedRecord: InstalledModRecord | null
  setInstalledRecord: React.Dispatch<
    React.SetStateAction<InstalledModRecord | null>
  >
  setIsInstalled: React.Dispatch<React.SetStateAction<boolean>>
  onUpdateMod?: (updates: Partial<ModItem>) => Promise<void>
  selectedVersion?: string
}

export function useModDownloadActions({
  displayCard,
  validFiles,
  installedRecord,
  setInstalledRecord,
  setIsInstalled,
  onUpdateMod,
  selectedVersion,
}: UseModDownloadActionsParams) {
  const {
    tasksByFileId,
    primaryTask,
    activeDownloadsCount,
    downloadMod,
    cancelDownload,
  } = useModDownloads(displayCard?.id)

  const [playStatus, setPlayStatus] = useState<'play' | 'running'>('play')
  const [isLoading, setIsLoading] = useState(false)
  const [isUninstalling, setIsUninstalling] = useState(false)
  const [isUninstallConfirmOpen, setIsUninstallConfirmOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleDownload = useCallback(
    (explicitUrl?: unknown, explicitFileId?: unknown) => {
      if (!displayCard) return

      const cleanUrl =
        typeof explicitUrl === 'string' && explicitUrl.trim().startsWith('http')
          ? explicitUrl.trim()
          : undefined

      const cleanFileId =
        typeof explicitFileId === 'string' && explicitFileId.trim().length > 0
          ? explicitFileId.trim()
          : typeof explicitFileId === 'number'
            ? String(explicitFileId)
            : undefined

      const matchedFile = cleanFileId
        ? validFiles.find((f) => String(f._idRow) === cleanFileId)
        : cleanUrl
          ? validFiles.find((f) => f._sDownloadUrl === cleanUrl)
          : validFiles[0]

      const fallbackUrl =
        typeof displayCard.downloadUrl === 'string' &&
        displayCard.downloadUrl.trim().startsWith('http')
          ? displayCard.downloadUrl.trim()
          : ''

      const finalUrl = cleanUrl || matchedFile?._sDownloadUrl || fallbackUrl
      const finalFileId =
        cleanFileId ||
        (matchedFile?._idRow ? String(matchedFile._idRow) : 'default')

      void downloadMod({
        mod: displayCard,
        file: matchedFile,
        url: finalUrl,
        fileId: finalFileId,
        onComplete: (record) => {
          setInstalledRecord(record)
          setIsInstalled(true)
          setIsUpdating(false)
          if (onUpdateMod) {
            void onUpdateMod({
              isInstalled: true,
              installedAt: record.installedAt,
              downloadedFileId: record.downloadedFileId,
              installedFileId: record.installedFileId,
              engineId: record.engineId,
              engineName: record.engineName,
              icon: record.icon,
            })
          }
        },
        onError: (err) => {
          setIsUpdating(false)
          setIsLoading(false)
          if (typeof window !== 'undefined' && window.callout) {
            window.callout.error(
              err?.message || 'Error durante la descarga o extracción del mod.',
              `Error al descargar ${displayCard.name || displayCard.title || 'Mod'}`,
              { duration: 8000 },
            )
          }
        },
      })
    },
    [
      displayCard,
      validFiles,
      downloadMod,
      setInstalledRecord,
      setIsInstalled,
      onUpdateMod,
    ],
  )

  const handleCancelDownload = useCallback(
    (specificFileId?: string) => {
      cancelDownload(specificFileId)
      setIsUpdating(false)
    },
    [cancelDownload],
  )

  const handleUpdateClick = useCallback(() => {
    if (!displayCard || validFiles.length === 0) return
    setIsUpdating(true)
    const latestFile = validFiles[0]
    handleDownload(
      latestFile?._sDownloadUrl,
      latestFile?._idRow ? String(latestFile._idRow) : undefined,
    )
  }, [displayCard, validFiles, handleDownload])

  const handleManage = useCallback(async () => {
    const targetMod = installedRecord || displayCard
    if (!targetMod) return

    try {
      const result = await launchMod(targetMod, selectedVersion)
      if (!result.success) {
        setPlayStatus('play')
        if (typeof window !== 'undefined' && window.callout) {
          if (result.reason === 'engine_not_installed') {
            window.callout.error(
              `The engine "${result.engineName || 'required'}" is not installed. Please install it in Instances to play this mod.`,
              'Engine Not Installed',
            )
          } else {
            window.callout.error(
              result.error || 'Failed to launch mod.',
              'Launch Error',
            )
          }
        }
      } else {
        setPlayStatus('running')
        if (typeof window !== 'undefined' && window.callout) {
          window.callout.primary(
            result.isExecutable
              ? `Launching "${targetMod.name || targetMod.title}" directly...`
              : `Running "${targetMod.name || targetMod.title}" with ${result.engineName || 'Engine'}...`,
            'Game Launched',
            { duration: 4000 },
          )
        }
      }
    } catch (err) {
      setPlayStatus('play')
      if (typeof window !== 'undefined' && window.callout) {
        window.callout.error(
          err instanceof Error ? err.message : String(err),
          'Launch Error',
        )
      }
    }
  }, [displayCard, installedRecord, selectedVersion])

  const handleStop = useCallback(() => {
    setPlayStatus('play')
  }, [])

  const handleUninstall = useCallback(() => {
    setIsUninstallConfirmOpen(true)
  }, [])

  const executeUninstall = useCallback(async () => {
    if (!displayCard?.id) return
    setIsUninstalling(true)
    try {
      await uninstallModById(displayCard.id)
      setInstalledRecord(null)
      setIsInstalled(false)
      if (onUpdateMod) {
        await onUpdateMod({
          isInstalled: false,
          installedAt: undefined,
          downloadedFileId: undefined,
          installedFileId: undefined,
        })
      }
      if (typeof window !== 'undefined' && window.callout) {
        window.callout.secondary(
          `"${displayCard.name || displayCard.title}" was uninstalled from your WeekBoxLibrary.`,
          'Mod Uninstalled',
          { duration: 3500 },
        )
      }
    } catch (err) {
      console.error('[WeekBox] Uninstall failed:', err)
      if (typeof window !== 'undefined' && window.callout) {
        window.callout.error(
          err instanceof Error ? err.message : 'Failed to uninstall mod.',
          'Uninstall Error',
        )
      }
    } finally {
      setIsUninstalling(false)
    }
  }, [displayCard, setInstalledRecord, setIsInstalled, onUpdateMod])

  const handleOpenFolder = useCallback(async () => {
    if (!displayCard) return
    const targetPath =
      installedRecord?.installPath ||
      (
        await resolveModInstallDirectory(
          displayCard.id,
          displayCard.name || displayCard.title,
        )
      ).modInstallDir

    const opened = await openFolderInExplorer(targetPath)
    if (!opened && typeof window !== 'undefined' && window.callout) {
      window.callout.surface(
        `Mod directory inside WeekBoxLibrary: ${targetPath}`,
        'Mod Folder Location',
        { duration: 4000 },
      )
    }
  }, [displayCard, installedRecord?.installPath])

  const singleFileProgress = primaryTask?.progress ?? 0
  const singleFileStatus =
    primaryTask?.statusText || primaryTask?.status || 'download'
  const singleFileCurrentFile = primaryTask?.currentFile
  const singleFileDownloaded = primaryTask?.downloaded ?? 0
  const singleFileTotal = primaryTask?.total ?? 0
  const updateProgress = isUpdating ? singleFileProgress : 0

  return {
    tasksByFileId,
    activeDownloadsCount,
    playStatus,
    isLoading,
    isUninstalling,
    isUninstallConfirmOpen,
    setIsUninstallConfirmOpen,
    isUpdating,
    updateProgress,
    singleFileProgress,
    singleFileStatus,
    singleFileCurrentFile,
    singleFileDownloaded,
    singleFileTotal,
    handleDownload,
    handleCancelDownload,
    handleUpdateClick,
    handleManage,
    handleStop,
    handleUninstall,
    executeUninstall,
    handleOpenFolder,
  }
}
