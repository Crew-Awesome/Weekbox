import { initHost } from '@/core/host'
import { joinPaths, getWeekBoxLibraryPaths } from '@/core/storage'
import { formatFileSize } from '@/utils/formatters'
import { ENGINE_CATEGORIES } from '@/services/gamebanana'
import {
  resolveModInstallDirectory,
  resolveArchiveExtension,
  detectModEngineFromFiles,
  toSafeModFolderName,
  toEngineFolderName,
  extractBaseModId,
} from './mod-filesystem'
import { downloadModArchive, extractModArchive } from './mod-downloader'
import { getInstalledModById, registerInstalledMod } from './mod-registry'
import type {
  ModDownloadTask,
  StartModDownloadParams,
  InstalledModRecord,
} from './types'
import type { GameBananaFile } from '@/ui/mod-details-modal/types'

type Listener = () => void

const tasksMap = new Map<string, ModDownloadTask>()
const abortControllers = new Map<string, AbortController>()
const listeners = new Set<Listener>()
let tasksSnapshot: Record<string, ModDownloadTask> = {}

let activeModalModId: string | null = null

async function verifyDownloadedArchive(
  archivePath: string,
  expectedSize: number,
): Promise<void> {
  const host = initHost()
  const separator = archivePath.lastIndexOf('/')
  const parentPath = separator > 0 ? archivePath.slice(0, separator) : '.'
  const archiveName = archivePath.slice(separator + 1)
  const entry = (await host.fs.readDirectory(parentPath)).find(
    (item) => item.name === archiveName,
  )

  if (!entry || entry.isDirectory || entry.size === 0) {
    throw new Error('The downloaded archive is missing or empty.')
  }
  if (expectedSize > 0 && entry.size !== undefined && entry.size !== expectedSize) {
    throw new Error(
      `The downloaded archive is incomplete (${entry.size} of ${expectedSize} bytes).`,
    )
  }
}

/**
 * Checks whether the download callout toast should be suppressed for a given mod:
 * 1. Suppressed if the user is currently inside the ModDetailsModal for this exact mod.
 * 2. Suppressed if the user is inside the `/instances` tab.
 */
export function isCalloutSuppressedForMod(modId: string | number): boolean {
  if (typeof window === 'undefined') return false
  const targetBase = extractBaseModId(modId)

  if (activeModalModId && extractBaseModId(activeModalModId) === targetBase) {
    return true
  }

  if (
    typeof window.location !== 'undefined' &&
    window.location.pathname.startsWith('/instances')
  ) {
    return true
  }

  return false
}

/**
 * Synchronizes the visibility of active download callout toasts according to modal and route state.
 */
export function syncActiveCallouts(): void {
  if (typeof window === 'undefined' || !window.callout) return

  for (const task of tasksMap.values()) {
    if (task.status !== 'downloading' && task.status !== 'extracting') continue
    const calloutId = task.calloutId || `mod-dl-${task.taskKey}`

    if (isCalloutSuppressedForMod(task.modId)) {
      window.callout.dismiss(calloutId)
    } else {
      const exists = window.callout.toasts.some((t) => t.id === calloutId)
      if (!exists) {
        window.callout.download({
          id: calloutId,
          title: `Downloading ${task.modTitle}`,
          filename: task.fileName,
          progress: task.progress,
          downloaded: formatFileSize(task.downloaded),
          total: task.total > 0 ? formatFileSize(task.total) : 'Unknown',
          speed: task.speed,
          status: 'downloading',
          onCancel: () => {
            cancelModDownload(task.modId, task.fileId)
          },
        })
      } else {
        window.callout.updateDownload(calloutId, {
          progress: task.progress,
          downloaded: formatFileSize(task.downloaded),
          total: task.total > 0 ? formatFileSize(task.total) : undefined,
          speed: task.speed,
          status: 'downloading',
        })
      }
    }
  }
}

/**
 * Sets the ID of the mod currently displayed in the ModDetailsModal (or null if modal is closed).
 */
export function setActiveModalModId(modId: string | number | null): void {
  activeModalModId = modId !== null && modId !== undefined ? String(modId) : null
  syncActiveCallouts()
}

// Listen to popstate for route changes to sync callouts
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    syncActiveCallouts()
  })
}

function notifyListeners(): void {
  tasksSnapshot = Object.fromEntries(tasksMap.entries())
  for (const listener of listeners) {
    listener()
  }
}

function updateTask(
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

function removeTask(taskKey: string): void {
  tasksMap.delete(taskKey)
  abortControllers.delete(taskKey)
  notifyListeners()
}

/**
 * Resolves the target GameBananaFile to download when either an explicit URL/fileId or default single file is used.
 */
export function resolveTargetModFile(
  files: GameBananaFile[] | Record<string, GameBananaFile> | undefined,
  explicitFile?: GameBananaFile,
  explicitFileId?: string,
  explicitUrl?: string,
): {
  file?: GameBananaFile
  fileId: string
  downloadUrl: string
  fileName: string
  expectedSize: number
} | null {
  const cleanExplicitUrl =
    typeof explicitUrl === 'string' && explicitUrl.trim().startsWith('http')
      ? explicitUrl.trim()
      : undefined

  const cleanExplicitFileId =
    typeof explicitFileId === 'string' && explicitFileId.trim().length > 0
      ? explicitFileId.trim()
      : typeof explicitFileId === 'number'
        ? String(explicitFileId)
        : undefined

  const validFiles: GameBananaFile[] = files
    ? Array.isArray(files)
      ? files
      : Object.values(files)
    : []

  const matchedFile =
    explicitFile ||
    (cleanExplicitFileId
      ? validFiles.find((f) => String(f._idRow) === cleanExplicitFileId)
      : undefined) ||
    (cleanExplicitUrl
      ? validFiles.find((f) => f._sDownloadUrl === cleanExplicitUrl)
      : undefined) ||
    validFiles[0]

  const downloadUrl = cleanExplicitUrl || matchedFile?._sDownloadUrl || ''
  if (!downloadUrl) return null

  const fileId = String(cleanExplicitFileId || matchedFile?._idRow || 'default')
  const fileName = matchedFile?._sFile || `mod_${fileId}.zip`
  const expectedSize = matchedFile?._nFilesize || 0

  return {
    file: matchedFile,
    fileId,
    downloadUrl,
    fileName,
    expectedSize,
  }
}

/**
 * Starts downloading and installing a mod into the active `WeekBoxLibrary/mods` directory.
 */
export async function startModDownload(
  params: StartModDownloadParams,
): Promise<InstalledModRecord | null> {
  const { mod, file, url, fileId: explicitFileId, onComplete, onError } = params
  const resolved = resolveTargetModFile(
    mod.files,
    file,
    explicitFileId,
    url || mod.downloadUrl,
  )

  if (!resolved) {
    const err = new Error('No downloadable file URL found for this mod.')
    if (typeof window !== 'undefined' && window.callout) {
      window.callout.error(err.message, 'Download Unavailable')
    }
    onError?.(err)
    return null
  }

  const { fileId, downloadUrl, fileName, expectedSize } = resolved
  const baseModId = extractBaseModId(mod.id)
  const taskKey = `${baseModId}:${fileId}`

  // A mod has one install transaction at a time; different files still share its registry/install state.
  const activeTask = [...tasksMap.values()].find(
    (task) =>
      extractBaseModId(task.modId) === baseModId &&
      (task.status === 'downloading' || task.status === 'extracting'),
  )
  if (activeTask) {
    return null
  }

  const modTitle = mod.name || mod.title || `Mod #${baseModId}`
  const abortController = new AbortController()
  abortControllers.set(taskKey, abortController)

  const calloutId = `mod-dl-${taskKey}`

  const initialTask: ModDownloadTask = {
    taskKey,
    modId: mod.id,
    fileId,
    modTitle,
    fileName,
    url: downloadUrl,
    progress: 0,
    downloaded: 0,
    total: expectedSize,
    speed: 'Starting...',
    status: 'downloading',
    statusText: 'Starting download...',
    currentFile: fileName,
    calloutId,
  }

  tasksMap.set(taskKey, initialTask)
  notifyListeners()

  if (typeof window !== 'undefined' && window.callout) {
    if (!isCalloutSuppressedForMod(mod.id)) {
      window.callout.download({
        id: calloutId,
        title: `Downloading ${modTitle}`,
        filename: fileName,
        progress: 0,
        downloaded: '0 B',
        total: expectedSize > 0 ? formatFileSize(expectedSize) : 'Unknown',
        speed: 'Starting...',
        status: 'downloading',
        onCancel: () => {
          cancelModDownload(mod.id, fileId)
        },
      })
    }
  }

  const host = initHost()

  let currentModInstallDir = ''
  let tempArchivePath = ''

  try {
    const existingRecord = await getInstalledModById(mod.id)

    const { compositeId, engineFolderName, folderName, modInstallDir } =
      await Promise.race([
        resolveModInstallDirectory(mod.id, modTitle),
        new Promise<{
          libraryPaths: ReturnType<typeof getWeekBoxLibraryPaths>
          compositeId: string
          engineFolderName: string
          folderName: string
          modInstallDir: string
        }>((resolve) => {
          setTimeout(() => {
            const folder = toSafeModFolderName(mod.id, modTitle)
            const parts = folder.split('--')
            const compId =
              parts.length >= 3
                ? `${parts[1]}--${parts.slice(2).join('--')}`
                : String(mod.id)
            resolve({
              libraryPaths: getWeekBoxLibraryPaths('WeekBoxLibrary'),
              compositeId: compId,
              engineFolderName: toEngineFolderName(modTitle),
              folderName: folder,
              modInstallDir: `WeekBoxLibrary/mods/${folder}`,
            })
          }, 4000)
        }),
      ])

    currentModInstallDir = modInstallDir

    try {
      const dirExists = await host.fs.exists(modInstallDir)
      if (!dirExists) {
        await host.fs.createDirectory(modInstallDir)
      }
    } catch {
      // ignore
    }

    const ext = resolveArchiveExtension(fileName, downloadUrl)
    tempArchivePath = joinPaths(
      modInstallDir,
      `.temp_archive_${fileId}${ext}`,
    )

    await downloadModArchive(
      downloadUrl,
      tempArchivePath,
      (details) => {
        if (abortController.signal.aborted) return
        updateTask(taskKey, {
          progress: details.progress,
          downloaded: details.downloaded,
          total: details.total,
          speed: details.speed,
          status: 'downloading',
          statusText: details.statusText || 'Downloading...',
        })

        if (typeof window !== 'undefined' && window.callout) {
          if (!isCalloutSuppressedForMod(mod.id)) {
            const exists = window.callout.toasts.some((t) => t.id === calloutId)
            if (!exists) {
              window.callout.download({
                id: calloutId,
                title: `Downloading ${modTitle}`,
                filename: fileName,
                progress: details.progress,
                downloaded: formatFileSize(details.downloaded),
                total:
                  details.total > 0 ? formatFileSize(details.total) : undefined,
                speed: details.speed,
                status: 'downloading',
                onCancel: () => {
                  cancelModDownload(mod.id, fileId)
                },
              })
            } else {
              window.callout.updateDownload(calloutId, {
                progress: details.progress,
                downloaded: formatFileSize(details.downloaded),
                total:
                  details.total > 0 ? formatFileSize(details.total) : undefined,
                speed: details.speed,
                status: 'downloading',
              })
            }
          } else {
            window.callout.dismiss(calloutId)
          }
        }
      },
      expectedSize,
      abortController.signal,
    )

    if (abortController.signal.aborted) {
      throw new DOMException('Download canceled', 'AbortError')
    }

    await verifyDownloadedArchive(tempArchivePath, expectedSize)

    updateTask(taskKey, {
      progress: 99,
      status: 'extracting',
      statusText: 'Extracting archive...',
      currentFile: fileName,
    })

    if (typeof window !== 'undefined' && window.callout) {
      if (!isCalloutSuppressedForMod(mod.id)) {
        window.callout.updateDownload(calloutId, {
          progress: 99,
          speed: 'Extracting...',
          status: 'downloading',
        })
      }
    }

    await extractModArchive(tempArchivePath, modInstallDir, (extractUpdate) => {
      updateTask(taskKey, {
        progress: extractUpdate.progress ?? 99,
        status: 'extracting',
        statusText: extractUpdate.statusText || 'Extracting archive...',
        currentFile: extractUpdate.currentFile || fileName,
      })
    })

    const detected = await detectModEngineFromFiles(
      modInstallDir,
      mod.engineId,
    )
    const matchedEntry = Object.entries(ENGINE_CATEGORIES).find(
      ([, cat]) => cat.id === detected.engineId,
    )
    const matchedCategoryId = matchedEntry ? Number(matchedEntry[0]) : 3827
    const matchedEngineCat = matchedEntry?.[1]

    const now = Date.now()
    const installedRecord: InstalledModRecord = {
      id: compositeId,
      modId: baseModId,
      name: modTitle,
      title: modTitle,
      hidden: false,
      kind: 'mod',
      categoryId: matchedCategoryId,
      source: 'gamebanana',
      sourceUrl: `https://gamebanana.com/mods/${baseModId}`,
      downloadUrl,
      engineLocked: false,
      engineId: detected.engineId,
      engineName: matchedEngineCat?.name || mod.engineName || 'Psych Engine',
      engineFolderName,
      description: mod.description,
      htmlBody: mod.htmlBody,
      author: mod.author,
      userPfp: mod.userPfp,
      image: mod.img || mod.image || mod.thumbnail,
      thumbnail: mod.thumbnail || mod.img || mod.image,
      previewMedia: mod.previewMedia,
      icon: matchedEngineCat?.icon || mod.icon || mod.engineIcon,
      categoryName: mod.categoryName,
      installPath: modInstallDir,
      folderName,
      installedAt: now,
      updatedAt: mod.updatedAt || now,
      submittedAt: mod.submittedAt,
      downloadedFileId: fileId,
      installedFileId: fileId,
      fileName,
      fileSize: expectedSize,
      isExecutable: detected.isExecutable,
    }

    const finalRecord = await registerInstalledMod(installedRecord)

    if (
      existingRecord?.installPath &&
      existingRecord.installPath !== modInstallDir
    ) {
      try {
        const previousExists = await host.fs.exists(existingRecord.installPath)
        if (previousExists) await host.fs.remove(existingRecord.installPath)
      } catch (cleanupError) {
        console.warn(
          '[WeekBox] New install is ready, but the previous install could not be removed:',
          cleanupError,
        )
      }
    }

    updateTask(taskKey, {
      progress: 100,
      status: 'completed',
      statusText: 'Completed',
      installPath: modInstallDir,
    })

    if (typeof window !== 'undefined' && window.callout) {
      if (!isCalloutSuppressedForMod(mod.id)) {
        window.callout.updateDownload(calloutId, {
          title: `${modTitle} Installed`,
          progress: 100,
          status: 'completed',
          speed: 'Ready to play',
        })
      }
    }

    setTimeout(() => {
      removeTask(taskKey)
    }, 1800)

    onComplete?.(finalRecord)
    return finalRecord
  } catch (err) {
    if (currentModInstallDir) {
      try {
        const exists = await host.fs.exists(currentModInstallDir)
        if (exists) {
          await host.fs.remove(currentModInstallDir)
        }
      } catch {
        // ignore cleanup error
      }
    }

    if (tempArchivePath) {
      try {
        if (await host.fs.exists(tempArchivePath)) {
          await host.fs.remove(tempArchivePath)
        }
      } catch {
        // ignore cleanup error
      }
    }

    const isAborted =
      (err instanceof DOMException && err.name === 'AbortError') ||
      abortController.signal.aborted

    if (isAborted) {
      updateTask(taskKey, {
        progress: -1,
        status: 'canceling',
        statusText: 'Canceled',
      })
      if (typeof window !== 'undefined' && window.callout) {
        window.callout.dismiss(calloutId)
        if (!isCalloutSuppressedForMod(mod.id)) {
          window.callout.secondary(
            `Download canceled for "${modTitle}".`,
            'Download Canceled',
            { duration: 3000 },
          )
        }
      }
      setTimeout(() => {
        removeTask(taskKey)
      }, 600)
      return null
    }

    const errorObj = err instanceof Error ? err : new Error(String(err))
    console.error('[WeekBox] Mod download/install error:', errorObj)

    updateTask(taskKey, {
      status: 'error',
      error: errorObj.message,
      statusText: 'Download failed',
    })

    if (typeof window !== 'undefined' && window.callout) {
      window.callout.dismiss(calloutId)
      window.callout.error(
        errorObj.message,
        `Error al descargar ${modTitle}`,
        { duration: 8000 },
      )
    }

    setTimeout(() => {
      removeTask(taskKey)
    }, 3500)

    onError?.(errorObj)
    return null
  }
}

/**
 * Cancels an active download for a specific mod (and optional fileId).
 */
export function cancelModDownload(
  modId: string | number,
  fileId?: string,
): void {
  const baseId = extractBaseModId(modId)
  const prefix = `${baseId}:`
  for (const [key, controller] of abortControllers.entries()) {
    if (fileId ? key === `${prefix}${fileId}` : key.startsWith(prefix)) {
      updateTask(key, {
        progress: -1,
        status: 'canceling',
        statusText: 'Canceling...',
      })
      controller.abort()
    }
  }
}

/**
 * Subscribe & snapshot functions for `useSyncExternalStore`.
 */
export function subscribeModDownloads(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getModDownloadsSnapshot(): Record<string, ModDownloadTask> {
  return tasksSnapshot
}
