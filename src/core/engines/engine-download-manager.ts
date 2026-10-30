import { ENGINE_DEFINITIONS } from './constants'
import {
  setFocusedInstanceView as setFocusedInstanceViewHelper,
  isCurrentInstanceFocused,
  getTaskCalloutId,
  showEngineDownloadToast as showEngineDownloadToastHelper,
  dismissEngineDownloadToast,
} from './engine-download-callouts'
import { executeEngineInstall } from './engine-install-runner'
import type {
  EngineDownloadTask,
  EngineId,
  StartEngineDownloadParams,
} from './types'

type Listener = () => void

const tasksMap = new Map<string, EngineDownloadTask>()
const abortControllers = new Map<string, AbortController>()
const listeners = new Set<Listener>()
let tasksSnapshot: Record<string, EngineDownloadTask> = {}

function notifyListeners(): void {
  const nextSnapshot: Record<string, EngineDownloadTask> = {}
  for (const [key, task] of tasksMap.entries()) {
    nextSnapshot[key] = { ...task }
  }
  tasksSnapshot = nextSnapshot
  listeners.forEach((listener) => {
    try {
      listener()
    } catch (e) {
      console.error('[EngineDownloads] Listener error:', e)
    }
  })
}

export function subscribeEngineDownloads(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getEngineDownloadsSnapshot(): Record<string, EngineDownloadTask> {
  return tasksSnapshot
}

function getTaskKey(engineId: EngineId, version: string): string {
  return `${engineId}::${version}`
}

export function setFocusedInstanceView(
  focus: { engineId: EngineId; version: string } | null,
): void {
  setFocusedInstanceViewHelper(focus, syncEngineActiveCallouts)
}

export function showEngineDownloadToast(
  engineId: EngineId,
  version: string,
): void {
  const task = tasksMap.get(getTaskKey(engineId, version))
  if (task) {
    showEngineDownloadToastHelper(task, () => cancelEngineDownload(engineId, task.version))
  }
}

export function showActiveEngineDownloadToasts(): void {
  for (const task of tasksMap.values()) {
    if (task.status === 'downloading' || task.status === 'extracting') {
      if (!isCurrentInstanceFocused(task.engineId, task.version)) {
        showEngineDownloadToastHelper(task, () =>
          cancelEngineDownload(task.engineId, task.version),
        )
      }
    }
  }
}

export function syncEngineActiveCallouts(): void {
  for (const task of tasksMap.values()) {
    if (task.status !== 'downloading' && task.status !== 'extracting') continue
    const calloutId = getTaskCalloutId(task)

    if (isCurrentInstanceFocused(task.engineId, task.version)) {
      dismissEngineDownloadToast(calloutId)
    } else {
      showEngineDownloadToastHelper(task, () =>
        cancelEngineDownload(task.engineId, task.version),
      )
    }
  }
}

export function cancelEngineDownload(engineId: EngineId, version: string): void {
  const taskKey = getTaskKey(engineId, version)
  const task = tasksMap.get(taskKey)
  if (!task || task.status === 'completed' || task.status === 'error' || task.status === 'canceling') {
    return
  }

  if (task.status === 'extracting') {
    return
  }

  const controller = abortControllers.get(taskKey)
  if (controller) {
    controller.abort()
    abortControllers.delete(taskKey)
  }

  task.status = 'canceling'
  task.statusText = 'Canceling...'
  notifyListeners()
  dismissEngineDownloadToast(getTaskCalloutId(task))

  const startProgress = task.progress
  const startTime = Date.now()
  const duration = 600
  const interval = setInterval(() => {
    const elapsed = Date.now() - startTime
    const ratio = Math.max(0, 1 - elapsed / duration)
    task.progress = startProgress * ratio
    notifyListeners()

    if (ratio <= 0) {
      clearInterval(interval)
      tasksMap.delete(taskKey)
      notifyListeners()
    }
  }, 25)
}

export async function startEngineDownload(
  params: StartEngineDownloadParams,
): Promise<void> {
  const { engineId, release, asset } = params
  const version = release.tagName || 'latest'
  const taskKey = getTaskKey(engineId, version)

  if (tasksMap.has(taskKey)) {
    const existing = tasksMap.get(taskKey)!
    if (existing.status === 'downloading' || existing.status === 'extracting') {
      console.warn(`[EngineDownloads] Download already in progress for ${taskKey}`)
      return
    }
  }

  const def = ENGINE_DEFINITIONS[engineId]
  const calloutId = `engine-dl-${taskKey}`

  const task: EngineDownloadTask = {
    taskKey,
    engineId,
    version,
    assetName: asset.name,
    downloadUrl: asset.downloadUrl,
    progress: 0,
    downloaded: 0,
    total: asset.size || 0,
    speed: '',
    status: 'downloading',
    statusText: 'Connecting...',
    currentFile: asset.name,
    calloutId,
  }

  tasksMap.set(taskKey, task)
  notifyListeners()

  if (!isCurrentInstanceFocused(engineId, version)) {
    showEngineDownloadToastHelper(task, () => cancelEngineDownload(engineId, version))
  }

  const abortController = new AbortController()
  abortControllers.set(taskKey, abortController)

  await executeEngineInstall({
    task,
    abortController,
    def,
    params,
    onTaskUpdate: () => notifyListeners(),
    onCleanUp: () => {
      tasksMap.delete(taskKey)
      abortControllers.delete(taskKey)
      notifyListeners()
    },
  })
}
