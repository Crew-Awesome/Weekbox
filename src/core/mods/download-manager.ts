import { initHost } from '@/core/host'
import { joinPaths } from '@/core/storage'
import { formatFileSize } from '@/utils/formatters'
import { ENGINE_CATEGORIES } from '@/services/gamebanana'
import {
  resolveModInstallDirectory,
  resolveArchiveExtension,
  detectModEngineFromFiles,
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

function getTaskCalloutId(task: ModDownloadTask): string {
  return task.calloutId || `mod-dl-${task.taskKey}`
}

function syncTaskCallout(task: ModDownloadTask): void {
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

async function removePathWithRetry(path: string, attempts = 3): Promise<void> {
  if (!path) return
  const host = initHost()

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      if (!(await host.fs.exists(path))) return
      await host.fs.remove(path)
      return
    } catch {
      if (attempt < attempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 250 * (attempt + 1)),
        )
      }
    }
  }
}

async function cleanupInstallArtifacts(
  installDir: string,
  archivePath: string,
  removeInstallDir: boolean,
): Promise<void> {
  if (archivePath) {
    await removePathWithRetry(archivePath)
  }
  if (installDir && removeInstallDir) {
    await removePathWithRetry(installDir)
  }
}

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

  syncTaskCallout(initialTask)

  const host = initHost()

  let currentModInstallDir = ''
  let tempArchivePath = ''
  let installDirCreated = false

  try {
    const existingRecord = await getInstalledModById(mod.id)

    const { compositeId, engineFolderName, folderName, modInstallDir } =
      await resolveModInstallDirectory(mod.id, modTitle)

    currentModInstallDir = modInstallDir

    try {
      const dirExists = await host.fs.exists(modInstallDir)
      if (!dirExists) {
        await host.fs.createDirectory(modInstallDir)
        installDirCreated = true
      }
    } catch {
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
          if (isCalloutSuppressedForMod(mod.id)) {
            window.callout.dismiss(calloutId)
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
      if (isCalloutSuppressedForMod(mod.id)) {
        window.callout.dismiss(calloutId)
      } else {
        window.callout.updateDownload(calloutId, {
          title: `Installing ${modTitle}`,
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

      if (typeof window !== 'undefined' && window.callout) {
        if (isCalloutSuppressedForMod(mod.id)) {
          window.callout.dismiss(calloutId)
        } else {
          window.callout.updateDownload(calloutId, {
            title: `Installing ${modTitle}`,
            filename: extractUpdate.currentFile || fileName,
            speed: 'Extracting...',
            status: 'downloading',
          })
        }
      }
    })

    if (abortController.signal.aborted) {
      throw new DOMException('Download canceled', 'AbortError')
    }

    const detected = await detectModEngineFromFiles(
      modInstallDir,
      mod.engineId,
    )

    const isExe = detected.isExecutable || detected.engineId === 'executable' || detected.engineId === 'exe'
    const finalEngineId = isExe ? 'executable' : detected.engineId

    const defaultEngineId =
      mod.engineId && mod.engineId !== 'executable' && mod.engineId !== 'exe'
        ? mod.engineId
        : detected.engineId !== 'executable' && detected.engineId !== 'exe'
          ? detected.engineId
          : 'vslice'

    const defaultCatEntry = Object.values(ENGINE_CATEGORIES).find(
      (c) => c.id === defaultEngineId,
    )
    const defaultEngineName =
      defaultCatEntry?.name || mod.engineName || 'V-Slice Engine'

    const matchedEntry = Object.entries(ENGINE_CATEGORIES).find(
      ([, cat]) => cat.id === finalEngineId,
    )
    const matchedCategoryId = matchedEntry
      ? Number(matchedEntry[0])
      : isExe
        ? 3827
        : 28367
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
      engineId: finalEngineId,
      engineName: isExe ? 'Executable Mods' : (matchedEngineCat?.name || defaultEngineName),
      defaultEngineId,
      defaultEngineName,
      engineFolderName,
      description: mod.description,
      htmlBody: mod.htmlBody,
      author: mod.author,
      image:
        (mod.image?.startsWith('http') ? mod.image : undefined) ||
        (mod.thumbnail?.startsWith('http') ? mod.thumbnail : undefined) ||
        (mod.img?.startsWith('http') ? mod.img : undefined) ||
        mod.image ||
        mod.thumbnail ||
        mod.img,
      thumbnail:
        (mod.thumbnail?.startsWith('http') ? mod.thumbnail : undefined) ||
        (mod.image?.startsWith('http') ? mod.image : undefined) ||
        (mod.img?.startsWith('http') ? mod.img : undefined) ||
        mod.thumbnail ||
        mod.image ||
        mod.img,
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
      isExecutable: isExe,
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
      if (isCalloutSuppressedForMod(mod.id)) {
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

    onComplete?.(finalRecord)
    return finalRecord
  } catch (err) {
    const isAborted =
      (err instanceof DOMException && err.name === 'AbortError') ||
      abortController.signal.aborted

    void cleanupInstallArtifacts(
      currentModInstallDir,
      tempArchivePath,
      installDirCreated,
    )

    if (isAborted) {
      updateTask(taskKey, {
        progress: -1,
        status: 'canceling',
        statusText: 'Canceled',
      })
      if (typeof window !== 'undefined' && window.callout) {
        window.callout.dismiss(calloutId)
      }
      setTimeout(() => {
        removeTask(taskKey)
      }, 300)
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
