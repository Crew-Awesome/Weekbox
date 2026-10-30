import { formatFileSize } from '@/utils/formatters'
import { ENGINE_DEFINITIONS } from './constants'
import type { EngineDownloadTask, EngineId } from './types'

let currentFocusedInstance: { engineId: EngineId; version: string } | null = null

export function setFocusedInstanceView(
  focus: { engineId: EngineId; version: string } | null,
  syncCallback?: () => void,
): void {
  currentFocusedInstance = focus
  syncCallback?.()
}

export function isInstancesRoute(): boolean {
  if (typeof window === 'undefined' || typeof window.location === 'undefined') {
    return false
  }
  const { pathname, hash } = window.location
  const route = hash.startsWith('#') ? hash.slice(1) : pathname
  return route.startsWith('/instances')
}

export function isCurrentInstanceFocused(engineId: EngineId, version: string): boolean {
  if (!isInstancesRoute()) return false
  if (!currentFocusedInstance) return false
  return (
    currentFocusedInstance.engineId === engineId &&
    currentFocusedInstance.version === version
  )
}

export function getTaskCalloutId(task: { calloutId?: string; taskKey: string }): string {
  return task.calloutId || `engine-dl-${task.taskKey}`
}

export function showEngineDownloadToast(
  task: EngineDownloadTask,
  onCancel: () => void,
): void {
  if (typeof window === 'undefined' || !window.callout) return
  if (isCurrentInstanceFocused(task.engineId, task.version)) return
  if (task.status !== 'downloading' && task.status !== 'extracting') return

  const def = ENGINE_DEFINITIONS[task.engineId]
  const isExtracting = task.status === 'extracting'

  window.callout.download({
    id: getTaskCalloutId(task),
    title: isExtracting
      ? `Installing ${def?.name || task.engineId} (${task.version})`
      : `Downloading ${def?.name || task.engineId} (${task.version})`,
    progress: task.progress,
    downloaded: formatFileSize(task.downloaded),
    total: task.total ? formatFileSize(task.total) : 'Unknown',
    speed: isExtracting ? 'Extracting...' : task.speed,
    status: 'downloading',
    onCancel,
  })
}

export function updateEngineDownloadProgress(
  calloutId: string,
  engineId: EngineId,
  version: string,
  data: { progress: number; downloaded: number; total?: number; speed: string },
): void {
  if (typeof window === 'undefined' || !window.callout) return
  if (isCurrentInstanceFocused(engineId, version)) return
  window.callout.updateDownload(calloutId, {
    progress: data.progress,
    downloaded: formatFileSize(data.downloaded),
    total: data.total ? formatFileSize(data.total) : undefined,
    speed: data.speed,
    status: 'downloading',
  })
}

export function updateEngineExtractProgress(
  calloutId: string,
  engineId: EngineId,
  version: string,
  speed = 'Extracting...',
): void {
  if (typeof window === 'undefined' || !window.callout) return
  if (isCurrentInstanceFocused(engineId, version)) return
  const def = ENGINE_DEFINITIONS[engineId]
  window.callout.updateDownload(calloutId, {
    title: `Installing ${def?.name || engineId} (${version})`,
    progress: 99,
    speed,
    status: 'downloading',
  })
}

export function dismissEngineDownloadToast(calloutId: string): void {
  if (typeof window === 'undefined' || !window.callout) return
  window.callout.dismiss(calloutId)
}

export function notifyEngineDownloadCompleted(
  calloutId: string,
  engineName: string,
  version: string,
): void {
  if (typeof window === 'undefined' || !window.callout) return
  window.callout.dismiss(calloutId)
  window.callout.secondary(
    `${engineName} version ${version} is ready to use!`,
    'Engine Installed',
  )
}

export function notifyEngineDownloadError(
  calloutId: string,
  errorMessage: string,
): void {
  if (typeof window === 'undefined' || !window.callout) return
  window.callout.dismiss(calloutId)
  window.callout.error(errorMessage, 'Engine Download Failed')
}
