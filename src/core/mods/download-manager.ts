import { initHost } from '@/core/host'
import { joinPaths } from '@/core/storage'
import {
  resolveModInstallDirectory,
  resolveArchiveExtension,
  extractBaseModId,
} from './mod-filesystem'
import { downloadModArchive, extractModArchive } from './mod-downloader'
import { getInstalledModById, registerInstalledMod } from './mod-registry'
import {
  verifyDownloadedArchive,
  cleanupInstallArtifacts,
  resolveTargetModFile,
  buildInstalledModRecord,
} from './download-helpers'
import {
  tasksMap,
  abortControllers,
  isCalloutSuppressedForMod,
  syncTaskCallout,
  syncActiveCallouts,
  setActiveModalModId,
  notifyListeners,
  updateTask,
  removeTask,
  reportDownloadProgress,
  reportExtractProgress,
  reportInstallCompleted,
  cancelModDownload,
  subscribeModDownloads,
  getModDownloadsSnapshot,
} from './download-state'
import type {
  ModDownloadTask,
  StartModDownloadParams,
  InstalledModRecord,
} from './types'

export {
  isCalloutSuppressedForMod,
  syncActiveCallouts,
  setActiveModalModId,
  resolveTargetModFile,
  cancelModDownload,
  subscribeModDownloads,
  getModDownloadsSnapshot,
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
    tempArchivePath = joinPaths(modInstallDir, `.temp_archive_${fileId}${ext}`)

    await downloadModArchive(
      downloadUrl,
      tempArchivePath,
      (details) => {
        if (abortController.signal.aborted) return
        reportDownloadProgress(taskKey, mod.id, calloutId, details)
      },
      expectedSize,
      abortController.signal,
    )

    if (abortController.signal.aborted) {
      throw new DOMException('Download canceled', 'AbortError')
    }

    await verifyDownloadedArchive(tempArchivePath, expectedSize)

    reportExtractProgress(taskKey, mod.id, calloutId, modTitle, fileName)

    await extractModArchive(tempArchivePath, modInstallDir, (extractUpdate) => {
      reportExtractProgress(
        taskKey,
        mod.id,
        calloutId,
        modTitle,
        fileName,
        extractUpdate,
      )
    })

    if (abortController.signal.aborted) {
      throw new DOMException('Download canceled', 'AbortError')
    }

    const installedRecord = await buildInstalledModRecord({
      mod,
      compositeId,
      baseModId,
      modTitle,
      downloadUrl,
      engineFolderName,
      folderName,
      modInstallDir,
      fileId,
      fileName,
      expectedSize,
    })

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

    reportInstallCompleted(
      taskKey,
      mod.id,
      calloutId,
      modTitle,
      fileName,
      expectedSize,
      modInstallDir,
    )

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
