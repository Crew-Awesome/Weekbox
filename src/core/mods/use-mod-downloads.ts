import { useSyncExternalStore, useMemo, useCallback } from 'react'
import {
  subscribeModDownloads,
  getModDownloadsSnapshot,
  startModDownload,
  cancelModDownload,
} from './download-manager'
import { extractBaseModId } from './mod-filesystem'
import type { ModDownloadTask, StartModDownloadParams } from './types'

/**
 * React hook that subscribes to active mod download tasks and provides helpers
 * scoped to a specific `modId` (or globally across all downloads).
 */
export function useModDownloads(modId?: string | number) {
  const allTasks = useSyncExternalStore(
    subscribeModDownloads,
    getModDownloadsSnapshot,
    getModDownloadsSnapshot,
  )

  const modTasks = useMemo(() => {
    if (modId === undefined || modId === null) return []
    const targetBase = extractBaseModId(modId)
    return Object.values(allTasks).filter(
      (task) => extractBaseModId(task.modId) === targetBase,
    )
  }, [allTasks, modId])

  const tasksByFileId = useMemo<Record<string, ModDownloadTask>>(() => {
    const map: Record<string, ModDownloadTask> = {}
    for (const task of modTasks) {
      map[task.fileId] = task
    }
    return map
  }, [modTasks])

  const primaryTask = useMemo<ModDownloadTask | undefined>(() => {
    return modTasks[0]
  }, [modTasks])

  const activeDownloadsCount = useMemo(() => {
    return modTasks.filter(
      (t) =>
        t.status === 'downloading' ||
        t.status === 'extracting' ||
        t.status === 'canceling',
    ).length
  }, [modTasks])

  const downloadMod = useCallback(
    async (params: StartModDownloadParams) => {
      return await startModDownload(params)
    },
    [],
  )

  const cancelDownload = useCallback(
    (specificFileId?: string) => {
      if (modId === undefined || modId === null) return
      cancelModDownload(modId, specificFileId)
    },
    [modId],
  )

  return {
    allTasks,
    modTasks,
    tasksByFileId,
    primaryTask,
    activeDownloadsCount,
    downloadMod,
    cancelDownload,
  }
}
