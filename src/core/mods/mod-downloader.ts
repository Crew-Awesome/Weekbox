import { initHost } from '@/core/host'
import type { DownloadProgressDetails } from './types'

/**
 * Downloads a mod archive to `destArchivePath` using the active platform's HostAdapter (`host.downloadFile`),
 * reporting live progress and supporting cancellation via `AbortSignal`.
 */
export async function downloadModArchive(
  url: string,
  destArchivePath: string,
  onProgress: (details: DownloadProgressDetails) => void,
  expectedSize = 0,
  signal?: AbortSignal,
): Promise<void> {
  const host = initHost()

  await host.downloadFile({
    url,
    destinationPath: destArchivePath,
    expectedSize,
    signal,
    onProgress: (progress) => {
      onProgress({
        progress: progress.progress,
        downloaded: progress.downloaded,
        total: progress.total,
        speed: progress.speed,
        statusText: progress.statusText,
        currentFile: progress.currentFile,
      })
    },
  })
}

/**
 * Extracts a downloaded mod archive (`zip`, `7z`, `rar`, `tar.gz`) into `destDir`
 * using the active platform's HostAdapter (`host.extractArchive`),
 * removing the temporary archive file and flattening any single root wrapper folder.
 */
export async function extractModArchive(
  archivePath: string,
  destDir: string,
  onProgress?: (details: Partial<DownloadProgressDetails>) => void,
): Promise<void> {
  const host = initHost()

  await host.extractArchive({
    archivePath,
    destinationDir: destDir,
    removeArchive: true,
    flattenSingleRoot: true,
    onProgress: (progress) => {
      onProgress?.({
        progress: progress.progress,
        statusText: progress.statusText,
        currentFile: progress.currentFile,
      })
    },
  })
}
