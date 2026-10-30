import { useSyncExternalStore, useMemo, useCallback } from 'react'
import {
  subscribeEngineDownloads,
  getEngineDownloadsSnapshot,
  startEngineDownload,
  cancelEngineDownload,
} from './engine-download-manager'
import type { EngineDownloadTask, EngineId, StartEngineDownloadParams } from './types'

export function useEngineDownloads(engineId?: EngineId) {
  const allTasks = useSyncExternalStore(
    subscribeEngineDownloads,
    getEngineDownloadsSnapshot,
    getEngineDownloadsSnapshot,
  )

  const engineTasks = useMemo(() => {
    const list = Object.values(allTasks)
    if (!engineId) return list
    return list.filter((t) => t.engineId === engineId)
  }, [allTasks, engineId])

  const tasksByVersion = useMemo<Record<string, EngineDownloadTask>>(() => {
    const map: Record<string, EngineDownloadTask> = {}
    for (const task of engineTasks) {
      map[task.version] = task
    }
    return map
  }, [engineTasks])

  const isDownloadingAny = useMemo(() => {
    return engineTasks.some(
      (t) => t.status === 'downloading' || t.status === 'extracting',
    )
  }, [engineTasks])

  const downloadEngine = useCallback(
    async (params: StartEngineDownloadParams) => {
      return await startEngineDownload(params)
    },
    [],
  )

  const cancelDownload = useCallback(
    (targetEngineId: EngineId, version: string) => {
      cancelEngineDownload(targetEngineId, version)
    },
    [],
  )

  return {
    allTasks,
    engineTasks,
    tasksByVersion,
    isDownloadingAny,
    downloadEngine,
    cancelDownload,
  }
}
