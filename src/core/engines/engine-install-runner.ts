import { initHost } from '@/core/host'
import { ensureWeekBoxLibrary, joinPaths } from '@/core/storage'
import {
  getTaskCalloutId,
  notifyEngineDownloadCompleted,
  notifyEngineDownloadError,
  updateEngineDownloadProgress,
  updateEngineExtractProgress,
} from './engine-download-callouts'
import {
  findEngineExecutable,
  registerInstalledEngine,
  sanitizeVersionFolderName,
} from './engine-registry'
import type {
  EngineDefinition,
  EngineDownloadTask,
  StartEngineDownloadParams,
} from './types'

export interface ExecuteEngineInstallOptions {
  task: EngineDownloadTask
  abortController: AbortController
  def: EngineDefinition
  params: StartEngineDownloadParams
  onTaskUpdate: () => void
  onCleanUp: () => void
}

export async function executeEngineInstall(
  options: ExecuteEngineInstallOptions,
): Promise<void> {
  const { task, abortController, def, params, onTaskUpdate, onCleanUp } = options
  const { engineId, release, asset, onProgress, onComplete, onError } = params
  const version = task.version
  const calloutId = getTaskCalloutId(task)

  let tempArchivePath = ''
  let targetDir = ''
  let targetDirCreated = false

  try {
    const host = initHost()
    const { paths } = await ensureWeekBoxLibrary()
    const safeVersion = sanitizeVersionFolderName(version)
    targetDir = joinPaths(paths.enginesDir, `${engineId}/${safeVersion}`)

    const dirExists = await host.fs.exists(targetDir)
    if (!dirExists) {
      await host.fs.createDirectory(targetDir)
      targetDirCreated = true
    }

    const archiveExt = asset.name.toLowerCase().endsWith('.7z')
      ? '.7z'
      : asset.name.toLowerCase().endsWith('.tar.gz')
        ? '.tar.gz'
        : '.zip'

    const tempArchive = joinPaths(
      targetDir,
      `.temp_${Date.now()}_${asset.name || 'archive' + archiveExt}`,
    )
    tempArchivePath = tempArchive

    await host.downloadFile({
      url: asset.downloadUrl,
      destinationPath: tempArchive,
      expectedSize: asset.size,
      signal: abortController.signal,
      onProgress: (p) => {
        task.progress = p.progress
        task.downloaded = p.downloaded
        task.total = p.total || asset.size
        task.speed = p.speed
        task.statusText = p.statusText || `${Math.round(p.progress)}%`
        task.currentFile = p.currentFile || task.currentFile
        onTaskUpdate()

        onProgress?.({
          progress: p.progress,
          downloaded: p.downloaded,
          total: p.total || asset.size,
          speed: p.speed,
          statusText: task.statusText,
        })

        updateEngineDownloadProgress(calloutId, engineId, version, {
          progress: p.progress,
          downloaded: p.downloaded,
          total: p.total,
          speed: p.speed,
        })
      },
    })

    task.status = 'extracting'
    task.progress = 99
    task.statusText = 'Extracting engine files...'
    task.currentFile = asset.name
    onTaskUpdate()

    updateEngineExtractProgress(calloutId, engineId, version)

    await host.extractArchive({
      archivePath: tempArchive,
      destinationDir: targetDir,
      removeArchive: true,
      flattenSingleRoot: true,
      onProgress: (ep) => {
        task.currentFile = ep.currentFile || task.currentFile
        task.statusText = ep.statusText || 'Extracting engine files...'
        onTaskUpdate()
        updateEngineExtractProgress(calloutId, engineId, version)
      },
    })

    if (abortController.signal.aborted) {
      throw new DOMException('Download canceled', 'AbortError')
    }

    const detectedExe = await findEngineExecutable(targetDir, def.defaultExeName)

    const installedRecord = {
      version,
      tag: release.tagName,
      name: `${def.name} ${version}`,
      releaseId: release.id,
      assetName: asset.name,
      assetSize: asset.size,
      downloadUrl: asset.downloadUrl,
      installPath: targetDir,
      executablePath: detectedExe || undefined,
      installedAt: Date.now(),
    }

    await registerInstalledEngine(installedRecord, engineId)

    task.status = 'completed'
    task.progress = 100
    task.statusText = 'Installation complete'
    task.installPath = targetDir
    onTaskUpdate()

    notifyEngineDownloadCompleted(calloutId, def.name, version)
    onComplete?.(installedRecord)

    setTimeout(() => {
      onCleanUp()
    }, 4000)
  } catch (err: unknown) {
    const errorObj = err instanceof Error ? err : new Error(String(err))
    if (abortController.signal.aborted) {
      const cleanupHost = initHost()
      if (tempArchivePath) {
        void cleanupHost.fs.remove(tempArchivePath).catch(() => undefined)
      }
      if (targetDirCreated && targetDir) {
        void cleanupHost.fs.remove(targetDir).catch(() => undefined)
      }
      return
    }

    task.status = 'error'
    task.error = errorObj.message
    task.statusText = `Error: ${errorObj.message}`
    onTaskUpdate()

    notifyEngineDownloadError(calloutId, errorObj.message)
    onError?.(errorObj)
    onCleanUp()
  }
}
