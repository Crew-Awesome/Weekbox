import * as Neutralino from '@neutralinojs/lib'
import { formatBytesCompact, formatDownloadSpeed } from './download-helper'
import { withTimeout } from './desktop-process'
import { desktopFileSystem, ensureParentDirectories } from './desktop-fs'
import type { DownloadFileOptions } from './types'

export async function downloadViaNativeCurl(
  options: DownloadFileOptions,
): Promise<void> {
  const { url, destinationPath, expectedSize = 0, signal, onProgress } = options

  if (signal?.aborted) {
    throw new DOMException('Download canceled', 'AbortError')
  }

  const cleanUrl = typeof url === 'string' ? url.trim() : String(url || '')
  if (!cleanUrl || !cleanUrl.startsWith('http')) {
    throw new Error(`URL de descarga inválida: ${cleanUrl}`)
  }

  await ensureParentDirectories(desktopFileSystem, destinationPath)

  const totalBytes = expectedSize > 0 ? expectedSize : 0

  onProgress?.({
    progress: 0,
    downloaded: 0,
    total: totalBytes,
    speed: 'Starting...',
    statusText: 'Starting download...',
  })

  const safeUrl = `"${cleanUrl.replace(/"/g, '\\"')}"`
  const safeDest = `"${destinationPath.replace(/\//g, '\\').replace(/"/g, '\\"')}"`
  const curlCmd = `curl.exe --globoff -# -L --fail --show-error -A "WeekBox/1.0" -H "Accept-Language: en-US,en;q=0.9" --connect-timeout 25 -o ${safeDest} ${safeUrl}`

  const proc = await withTimeout(
    Neutralino.os.spawnProcess(curlCmd),
    5000,
    'curl spawn timed out',
  )

  let lastBytes = 0
  let lastTick = performance.now()
  let smoothedSpeed = 0
  let curlPercent = 0

  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false
      let pollTimer: ReturnType<typeof setInterval> | null = null

      const cleanup = () => {
        settled = true
        if (pollTimer) {
          clearInterval(pollTimer)
          pollTimer = null
        }
        Neutralino.events.off('spawnedProcess', onSpawnedProcessEvent)
        signal?.removeEventListener('abort', onAbort)
      }

      const onAbort = async () => {
        if (settled) return
        cleanup()
        try {
          const isWin =
            typeof navigator !== 'undefined' &&
            navigator.userAgent.toLowerCase().includes('win')
          const killCmd = isWin
            ? `taskkill /T /F /PID ${proc.pid || proc.id}`
            : `kill -9 ${proc.pid || proc.id}`
          await Neutralino.os.execCommand(killCmd, { background: true })
        } catch {
        }
        try {
          await desktopFileSystem.remove(destinationPath)
        } catch {
        }
        reject(new DOMException('Download canceled', 'AbortError'))
      }

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true })
      }

      const emitProgress = (currentBytes: number) => {
        const effectiveTotal =
          totalBytes > 0 ? Math.max(totalBytes, currentBytes) : 0

        let computedPercent = 0
        if (effectiveTotal > 0 && currentBytes > 0) {
          computedPercent = Math.min(
            98,
            Math.max(2, Math.floor((currentBytes / effectiveTotal) * 98)),
          )
        } else if (curlPercent > 0) {
          computedPercent = Math.min(
            98,
            Math.max(2, Math.floor(curlPercent * 0.98)),
          )
        } else if (currentBytes > 0) {
          computedPercent = Math.min(
            95,
            Math.max(2, Math.floor(currentBytes / (1024 * 512))),
          )
        }

        const estimatedDownloaded =
          currentBytes > 0
            ? currentBytes
            : effectiveTotal > 0 && curlPercent > 0
              ? Math.floor((curlPercent / 100) * effectiveTotal)
              : 0

        onProgress?.({
          progress: computedPercent,
          downloaded: estimatedDownloaded,
          total: effectiveTotal,
          speed:
            smoothedSpeed > 0
              ? formatDownloadSpeed(smoothedSpeed)
              : computedPercent > 0
                ? 'Downloading...'
                : 'Starting...',
          statusText:
            computedPercent > 0
              ? estimatedDownloaded > 0
                ? `Downloading (${formatBytesCompact(estimatedDownloaded)})...`
                : `Downloading (${computedPercent}%)...`
              : 'Starting download...',
        })
      }

      const pollStats = async () => {
        if (settled || signal?.aborted) return
        try {
          const stats = await Neutralino.filesystem.getStats(destinationPath)
          const currentBytes = Number(stats?.size) || 0
          const now = performance.now()
          const elapsedSec = Math.max(0.1, (now - lastTick) / 1000)

          if (currentBytes > lastBytes) {
            const instantSpeed = (currentBytes - lastBytes) / elapsedSec
            smoothedSpeed =
              smoothedSpeed === 0
                ? instantSpeed
                : smoothedSpeed * 0.65 + instantSpeed * 0.35
            lastBytes = currentBytes
            lastTick = now
          }

          if (currentBytes > 0 || curlPercent > 0) {
            emitProgress(currentBytes)
          }
        } catch {
          if (curlPercent > 0) {
            emitProgress(lastBytes)
          }
        }
      }

      pollTimer = setInterval(pollStats, 220)

      const onSpawnedProcessEvent = (evt: CustomEvent) => {
        if (settled) return
        const detail = evt.detail as
          | { id?: number | string; action?: string; data?: unknown }
          | undefined
        if (!detail) return

        const isSameProc =
          String(detail.id) === String(proc.id) ||
          (proc.pid !== undefined && String(detail.id) === String(proc.pid))

        if (!isSameProc) return

        if (detail.action === 'stdErr' || detail.action === 'stdOut') {
          const text = String(detail.data || '')
          const matches = text.match(/(\d+\.?\d*)%/g)
          if (matches && matches.length > 0) {
            const parsed = parseFloat(matches[matches.length - 1].replace('%', ''))
            if (!isNaN(parsed) && parsed > 0) {
              curlPercent = parsed
              emitProgress(lastBytes)
            }
          }
          return
        }

        if (detail.action === 'exit') {
          cleanup()
          const exitCode = Number(detail.data ?? 0)
          if (exitCode === 0) {
            resolve()
          } else {
            reject(new Error(`curl exited with code ${exitCode}`))
          }
        }
      }

      Neutralino.events.on('spawnedProcess', onSpawnedProcessEvent)
    })
  } catch (err) {
    try {
      await desktopFileSystem.remove(destinationPath)
    } catch {
    }
    throw err
  }
}
