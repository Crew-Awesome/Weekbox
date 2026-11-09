import { formatFileSize } from '@/utils/formatters'
import { extractBaseModId } from './mod-filesystem'
import type { ModDownloadTask } from './types'

export type Listener = () => void

export const tasksMap = new Map<string, ModDownloadTask>()
export const abortControllers = new Map<string, AbortController>()
const listeners = new Set<Listener>()
let tasksSnapshot: Record<string, ModDownloadTask> = {}

let activeModalModId: string | null = null

export function isCalloutSuppressedForMod(modId: string | number): boolean {
  if (typeof window === 'undefined') return false
  const targetBase = extractBaseModId(modId)

  if (activeModalModId && extractBaseModId(activeModalModId) === targetBase) {
    return true
  }

  if (typeof window.location !== 'undefined') {
    const { pathname, hash } = window.location
    const route = hash.startsWith('#') ? hash.slice(1) : pathname
    if (route.startsWith('/instances')) return true
  }

  return false
}

export function getTaskCalloutId(task: ModDownloadTask): string {
  return task.calloutId || `mod-dl-${task.taskKey}`
}

export function syncTaskCallout(task: ModDownloadTask): void {
  if (typeof window === 'undefined' || !window.callout) return
  if (task.status !== 'downloading' && task.status !== 'extracting') return

  const calloutId = getTaskCalloutId(task)

  if (isCalloutSuppressedForMod(task.modId)) {
    window.callout.dismiss(calloutId)
    return
  }

  window.callout.download({
    id: calloutId,
    title:
      task.status === 'extracting'
        ? `Installing ${task.modTitle}`
        : `Downloading ${task.modTitle}`,
    progress: task.progress,
    downloaded: formatFileSize(task.downloaded),
    total: task.total > 0 ? formatFileSize(task.total) : 'Unknown',
    speed: task.speed,
    status: 'downloading',
    onCancel: () => {
      cancelModDownload(task.modId, task.fileId)
    },
  })
}

export function syncActiveCallouts(): void {
  if (typeof window === 'undefined' || !window.callout) return

  for (const task of tasksMap.values()) {
    syncTaskCallout(task)
  }
}

export function setActiveModalModId(modId: string | number | null): void {
  activeModalModId = modId !== null && modId !== undefined ? String(modId) : null
  syncActiveCallouts()
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    syncActiveCallouts()
  })
}

export function notifyListeners(): void {
  tasksSnapshot = Object.fromEntries(tasksMap.entries())
  for (const listener of listeners) {
    listener()
  }
}

export function updateTask(
  taskKey: string,
  patch: Partial<ModDownloadTask>,
): ModDownloadTask | undefined {
  const existing = tasksMap.get(taskKey)
  if (!existing) return undefined
  const updated: ModDownloadTask = { ...existing, ...patch }
  tasksMap.set(taskKey, updated)
  notifyListeners()
  return updated
}

export function removeTask(taskKey: string): void {
  tasksMap.delete(taskKey)
  abortControllers.delete(taskKey)
  notifyListeners()
}

export function reportDownloadProgress(
  taskKey: string,
  modId: string | number,
  calloutId: string,
  details: {
    progress: number
    downloaded: number
    total: number
    speed: string
    statusText?: string
  },
): void {
  updateTask(taskKey, {
    progress: details.progress,
    downloaded: details.downloaded,
    total: details.total,
    speed: details.speed,
    status: 'downloading',
    statusText: details.statusText || 'Downloading...',
  })

  if (typeof window !== 'undefined' && window.callout) {
    if (isCalloutSuppressedForMod(modId)) {
      window.callout.dismiss(calloutId)
    } else {
      window.callout.updateDownload(calloutId, {
        progress: details.progress,
        downloaded: formatFileSize(details.downloaded),
        total: details.total > 0 ? formatFileSize(details.total) : undefined,
        speed: details.speed,
        status: 'downloading',
      })
    }
  }
}

export function reportExtractProgress(
  taskKey: string,
  modId: string | number,
  calloutId: string,
  modTitle: string,
  fileName: string,
  extractUpdate?: {
    progress?: number
    statusText?: string
    currentFile?: string
  },
): void {
  updateTask(taskKey, {
    progress: extractUpdate?.progress ?? 99,
    status: 'extracting',
    statusText: extractUpdate?.statusText || 'Extracting archive...',
    currentFile: extractUpdate?.currentFile || fileName,
  })

  if (typeof window !== 'undefined' && window.callout) {
    if (isCalloutSuppressedForMod(modId)) {
      window.callout.dismiss(calloutId)
    } else {
      window.callout.updateDownload(calloutId, {
        title: `Installing ${modTitle}`,
        filename: extractUpdate?.currentFile || fileName,
        progress: extractUpdate ? undefined : 99,
        speed: 'Extracting...',
        status: 'downloading',
      })
    }
  }
}

export function reportInstallCompleted(
  taskKey: string,
  modId: string | number,
  calloutId: string,
  modTitle: string,
  fileName: string,
  expectedSize: number,
  modInstallDir: string,
): void {
  updateTask(taskKey, {
    progress: 100,
    status: 'completed',
    statusText: 'Completed',
    installPath: modInstallDir,
  })

  if (typeof window !== 'undefined' && window.callout) {
    if (isCalloutSuppressedForMod(modId)) {
      window.callout.dismiss(calloutId)
    } else {
      window.callout.download({
        id: calloutId,
        variant: 'tertiary',
        title: `${modTitle} Installed`,
        message: 'Ready to install or play.',
        filename: fileName,
        progress: 100,
        downloaded: formatFileSize(expectedSize),
        total: expectedSize > 0 ? formatFileSize(expectedSize) : undefined,
        speed: 'Ready to play',
        status: 'completed',
        duration: 8000,
      })
    }
  }

  setTimeout(() => {
    removeTask(taskKey)
  }, 1800)
}

export function cancelModDownload(
  modId: string | number,
  fileId?: string,
): void {
  const baseId = extractBaseModId(modId)
  const prefix = `${baseId}:`
  for (const [key, controller] of abortControllers.entries()) {
    if (fileId ? key !== `${prefix}${fileId}` : !key.startsWith(prefix)) {
      continue
    }

    const task = tasksMap.get(key)
    if (
      !task ||
      (task.status !== 'downloading' &&
        task.status !== 'extracting' &&
        task.status !== 'canceling')
    ) {
      continue
    }

    const calloutId = getTaskCalloutId(task)

    updateTask(key, {
      progress: task.progress,
      status: 'canceling',
      statusText: 'Canceling...',
      speed: 'Canceling...',
    })

    if (typeof window !== 'undefined' && window.callout) {
      window.callout.dismiss(calloutId)
      if (!isCalloutSuppressedForMod(task.modId)) {
        window.callout.secondary(
          `Download canceled for "${task.modTitle}".`,
          'Download Canceled',
          { duration: 3000 },
        )
      }
    }

    controller.abort()
  }
}

export function subscribeModDownloads(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getModDownloadsSnapshot(): Record<string, ModDownloadTask> {
  return tasksSnapshot
}
