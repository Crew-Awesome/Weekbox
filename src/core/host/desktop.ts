import * as Neutralino from '@neutralinojs/lib'
import {
  DEFAULT_DOWNLOAD_USER_AGENT,
  callDevFsBridge,
  downloadViaDevBridge,
  downloadViaFetchStream,
  formatBytesCompact,
  formatDownloadSpeed,
} from './download-helper'
import type {
  DownloadFileOptions,
  ExtractArchiveOptions,
  FileEntry,
  FileSystemHost,
  HostAdapter,
  ProcessHost,
  SpawnProcessOptions,
} from './types'

function withTimeout<T>(
  promise: Promise<T>,
  ms = 4000,
  errorMsg = 'Neutralino call timed out',
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms),
    ),
  ])
}

async function ensureParentDirectories(
  fsHost: FileSystemHost,
  filePath: string,
): Promise<void> {
  const norm = filePath.replace(/\\/g, '/')
  const idx = norm.lastIndexOf('/')
  if (idx <= 0) return
  const dir = norm.slice(0, idx)
  const parts = dir.split('/')
  let current = norm.startsWith('/') ? '/' : ''
  for (const part of parts) {
    if (!part) continue
    current =
      current === '/' ? `/${part}` : current ? `${current}/${part}` : part
    try {
      const exists = await fsHost.exists(current)
      if (!exists) {
        await fsHost.createDirectory(current)
      }
    } catch {
      // ignore
    }
  }
}

const desktopFileSystem: FileSystemHost = {
  async readTextFile(path: string): Promise<string> {
    try {
      return await withTimeout(Neutralino.filesystem.readFile(path))
    } catch (err) {
      const res = await callDevFsBridge<{ ok?: boolean; data?: string }>({
        action: 'readTextFile',
        path,
      })
      if (res && typeof res.data === 'string') return res.data
      throw err
    }
  },

  async writeTextFile(path: string, data: string): Promise<void> {
    try {
      await withTimeout(Neutralino.filesystem.writeFile(path, data))
    } catch (err) {
      const res = await callDevFsBridge<{ ok?: boolean }>({
        action: 'writeTextFile',
        path,
        data,
      })
      if (res?.ok) return
      throw err
    }
  },

  async readBinaryFile(path: string): Promise<ArrayBuffer> {
    return await withTimeout(Neutralino.filesystem.readBinaryFile(path), 30000)
  },

  async writeBinaryFile(
    path: string,
    data: ArrayBuffer | Uint8Array,
  ): Promise<void> {
    const buffer =
      data instanceof Uint8Array
        ? (data.buffer.slice(
            data.byteOffset,
            data.byteOffset + data.byteLength,
          ) as ArrayBuffer)
        : data
    await withTimeout(
      Neutralino.filesystem.writeBinaryFile(path, buffer),
      60000,
    )
  },

  async createDirectory(path: string): Promise<void> {
    try {
      await withTimeout(Neutralino.filesystem.createDirectory(path))
    } catch {
      await callDevFsBridge({ action: 'createDirectory', path })
    }
  },

  async move(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await withTimeout(
        Neutralino.filesystem.move(sourcePath, destinationPath),
        60000,
      )
    } catch (err) {
      const res = await callDevFsBridge<{ ok?: boolean }>({
        action: 'move',
        sourcePath,
        destinationPath,
      })
      if (!res?.ok) throw err
    }
  },

  async remove(path: string): Promise<void> {
    try {
      await withTimeout(Neutralino.filesystem.remove(path))
    } catch {
      await callDevFsBridge({ action: 'remove', path })
    }
  },

  async readDirectory(path: string): Promise<FileEntry[]> {
    try {
      const entries = await withTimeout(
        Neutralino.filesystem.readDirectory(path),
      )
      return entries
        .filter((item) => item.entry !== '.' && item.entry !== '..')
        .map((item) => ({
          name: item.entry,
          path: `${path}/${item.entry}`.replace(/\/+/g, '/'),
          isDirectory: item.type === 'DIRECTORY',
          size: Number((item as { size?: number }).size) || undefined,
        }))
    } catch {
      const res = await callDevFsBridge<{
        ok?: boolean
        entries?: FileEntry[]
      }>({
        action: 'readDirectory',
        path,
      })
      return res?.entries || []
    }
  },

  async exists(path: string): Promise<boolean> {
    try {
      await withTimeout(Neutralino.filesystem.getStats(path), 2500)
      return true
    } catch {
      const res = await callDevFsBridge<{ exists?: boolean }>({
        action: 'exists',
        path,
      })
      return Boolean(res?.exists)
    }
  },
}

const desktopProcess: ProcessHost = {
  async spawn(command: string, options?: SpawnProcessOptions) {
    const fullCommand = options?.args?.length
      ? `${command} ${options.args.join(' ')}`
      : command
    const processInfo = await withTimeout(
      Neutralino.os.spawnProcess(fullCommand),
      6000,
      'Neutralino.os.spawnProcess timed out',
    )
    return {
      id: processInfo.id,
      pid: processInfo.pid,
    }
  },

  async execute(command: string, options?: SpawnProcessOptions) {
    const fullCommand = options?.args?.length
      ? `${command} ${options.args.join(' ')}`
      : command
    const res = await withTimeout(
      Neutralino.os.execCommand(fullCommand, {
        cwd: options?.cwd,
      }),
      300000,
      'Neutralino.os.execCommand timed out',
    )
    return {
      stdOut: res.stdOut || '',
      stdErr: res.stdErr || '',
      exitCode: res.exitCode ?? 0,
    }
  },
}

async function downloadViaNativeCurl(
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
  const curlCmd = `curl.exe --globoff -# -L --fail --show-error -A "${DEFAULT_DOWNLOAD_USER_AGENT}" -H "Accept-Language: en-US,en;q=0.9" --connect-timeout 25 -o ${safeDest} ${safeUrl}`

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
        // ignore
      }
      try {
        await desktopFileSystem.remove(destinationPath)
      } catch {
        // ignore
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
        // File may still be opening during 302 redirects or locked by curl on Windows
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
      // ignore cleanup error
    }
    throw err
  }
}

async function flattenDesktopSubdirectory(targetDir: string): Promise<void> {
  try {
    const entries = await desktopFileSystem.readDirectory(targetDir)
    const validEntries = entries.filter(
      (e) =>
        e.name !== '.' &&
        e.name !== '..' &&
        e.name !== '__MACOSX' &&
        !e.name.startsWith('.temp_archive'),
    )

    if (validEntries.length === 1 && validEntries[0].isDirectory) {
      const subDir = validEntries[0]
      const isWin =
        typeof navigator !== 'undefined' &&
        navigator.userAgent.toLowerCase().includes('win')

      if (isWin) {
        const winTarget = targetDir.replace(/\//g, '\\')
        const winSub = subDir.path.replace(/\//g, '\\')
        const psScript = `Get-ChildItem -LiteralPath '${winSub.replace(/'/g, "''")}' -Force | Move-Item -Destination '${winTarget.replace(/'/g, "''")}' -Force; Remove-Item -LiteralPath '${winSub.replace(/'/g, "''")}' -Recurse -Force`
        await desktopProcess.execute(
          `powershell -NoProfile -NonInteractive -Command "${psScript}"`,
        )
      } else {
        const escSub = subDir.path.replace(/"/g, '\\"')
        const escTarget = targetDir.replace(/"/g, '\\"')
        await desktopProcess.execute(
          `sh -c "mv \\"${escSub}\\"/* \\"${escSub}\\"/.[!.]* \\"${escTarget}\\"/ 2>/dev/null; rmdir \\"${escSub}\\""`,
        )
      }
    }
  } catch (err) {
    console.warn('[DesktopHost] Folder flattening skipped:', err)
  }
}

export const desktopHost: HostAdapter = {
  platform: 'desktop',
  fs: desktopFileSystem,
  process: desktopProcess,

  async getDataPath(): Promise<string> {
    // 1. Prioritize %LOCALAPPDATA% on Windows where WeekBoxLibrary lives (e.g., C:/Users/<user>/AppData/Local)
    try {
      const local = await withTimeout(
        Neutralino.os.getEnv('LOCALAPPDATA'),
        2000,
      )
      if (local && local.trim()) return local.trim().replace(/\\/g, '/')
    } catch {
      // ignore
    }

    // 2. Fallback to dev server bridge if Neutralino WS isn't connected yet
    try {
      const bridgeRes = await callDevFsBridge<{ dataPath?: string }>(
        { action: 'getDataPath' },
        2000,
      )
      if (bridgeRes?.dataPath) {
        return bridgeRes.dataPath.trim().replace(/\\/g, '/')
      }
    } catch {
      // ignore
    }

    // 3. Fallback to Neutralino.os.getPath('data')
    try {
      const p = await withTimeout(Neutralino.os.getPath('data'), 2000)
      if (p && p.trim()) return p.trim().replace(/\\/g, '/')
    } catch {
      // ignore
    }

    // 4. Fallback to %APPDATA%
    try {
      const app = await withTimeout(Neutralino.os.getEnv('APPDATA'), 2000)
      if (app && app.trim()) return app.trim().replace(/\\/g, '/')
    } catch {
      // ignore
    }

    return ''
  },

  async getAppVersion(): Promise<string> {
    try {
      if (
        typeof window !== 'undefined' &&
        (window as unknown as { NL_APPVERSION?: string }).NL_APPVERSION
      ) {
        return (window as unknown as { NL_APPVERSION: string }).NL_APPVERSION
      }
      const config = await Neutralino.app.getConfig()
      return config?.version || '1.0.0'
    } catch {
      return '1.0.0'
    }
  },

  async openUrl(url: string): Promise<void> {
    try {
      await Neutralino.os.open(url)
    } catch {
      if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    }
  },

  async downloadFile(options: DownloadFileOptions): Promise<void> {
    // 1. If local Vite dev bridge is active, stream directly to disk in Node with real-time NDJSON progress
    try {
      const handledByBridge = await downloadViaDevBridge(options)
      if (handledByBridge) return
    } catch (bridgeErr) {
      if (
        (bridgeErr instanceof DOMException &&
          bridgeErr.name === 'AbortError') ||
        options.signal?.aborted
      ) {
        throw bridgeErr
      }
      console.warn(
        '[DesktopHost] Dev bridge download failed, trying native curl:',
        bridgeErr,
      )
    }

    // 2. Native desktop curl process via Neutralino
    try {
      await downloadViaNativeCurl(options)
      return
    } catch (curlErr) {
      if (
        (curlErr instanceof DOMException && curlErr.name === 'AbortError') ||
        options.signal?.aborted
      ) {
        throw curlErr
      }
      console.warn(
        '[DesktopHost] Native curl failed, falling back to fetch stream:',
        curlErr,
      )
    }

    // 3. Fallback to Fetch ReadableStream + writeBinaryFile
    await ensureParentDirectories(desktopFileSystem, options.destinationPath)
    await downloadViaFetchStream(options, async (destPath, bytes) => {
      await desktopFileSystem.writeBinaryFile(destPath, bytes)
    })
  },

  async extractArchive(options: ExtractArchiveOptions): Promise<void> {
    const {
      archivePath,
      destinationDir,
      removeArchive = true,
      flattenSingleRoot = true,
      onProgress,
    } = options

    onProgress?.({
      progress: 99,
      statusText: 'Extracting archive...',
      currentFile: archivePath.split('/').pop(),
    })

    // 1. Try local dev bridge extraction if available (handles portable UnRAR, 7za, node-unrar-js, and tar)
    const bridgeExtract = await callDevFsBridge<{
      ok?: boolean
      error?: string
    }>(
      {
        action: 'extractArchive',
        archivePath,
        destinationDir,
      },
      300000,
    )
    if (bridgeExtract?.ok) {
      return
    }
    if (bridgeExtract?.error) {
      throw new Error(bridgeExtract.error)
    }

    // 2. Native extraction via Neutralino process execution using portable binaries
    const isWin =
      typeof navigator !== 'undefined' &&
      navigator.userAgent.toLowerCase().includes('win')

    const lower = archivePath.toLowerCase()

    try {
      const exists = await desktopFileSystem.exists(destinationDir)
      if (!exists) {
        await ensureParentDirectories(
          desktopFileSystem,
          `${destinationDir}/.keep`,
        )
      }

      let extracted = false

      if (isWin) {
        const winArchive = archivePath.replace(/\//g, '\\')
        const winDest = destinationDir.replace(/\//g, '\\')
        const trailingDest = winDest.endsWith('\\') ? winDest : `${winDest}\\`

        if (lower.endsWith('.rar')) {
          const unrarCandidates = [
            '.\\bin\\unrar\\win\\UnRAR.exe',
            '.\\public\\bin\\unrar\\win\\UnRAR.exe',
            'bin\\unrar\\win\\UnRAR.exe',
          ]
          for (const uPath of unrarCandidates) {
            const res = await desktopProcess.execute(
              `"${uPath}" x -y -o+ "${winArchive}" "${trailingDest}"`,
            )
            if (res.exitCode === 0) {
              extracted = true
              break
            }
          }
          if (!extracted) {
            throw new Error(
              `No se pudo descomprimir el archivo RAR: ${archivePath.split('/').pop()}. Asegúrate de que el archivo no esté protegido o dañado.`,
            )
          }
        } else if (lower.endsWith('.7z')) {
          const sevenZipCandidates = [
            '.\\bin\\7z\\win\\x64\\7za.exe',
            '.\\public\\bin\\7z\\win\\x64\\7za.exe',
            'bin\\7z\\win\\x64\\7za.exe',
          ]
          for (const zPath of sevenZipCandidates) {
            const res = await desktopProcess.execute(
              `"${zPath}" x -y -o"${winDest}" "${winArchive}"`,
            )
            if (res.exitCode === 0) {
              extracted = true
              break
            }
          }
          if (!extracted) {
            const tarRes = await desktopProcess.execute(
              `tar.exe -xf "${winArchive}" -C "${winDest}"`,
            )
            if (tarRes.exitCode === 0) {
              extracted = true
            }
          }
          if (!extracted) {
            throw new Error(
              `No se pudo descomprimir el archivo 7z: ${archivePath.split('/').pop()}`,
            )
          }
        } else {
          // .zip, .tar, etc.
          const sevenZipCandidates = [
            '.\\bin\\7z\\win\\x64\\7za.exe',
            '.\\public\\bin\\7z\\win\\x64\\7za.exe',
          ]
          for (const zPath of sevenZipCandidates) {
            const res = await desktopProcess.execute(
              `"${zPath}" x -y -o"${winDest}" "${winArchive}"`,
            )
            if (res.exitCode === 0) {
              extracted = true
              break
            }
          }
          if (!extracted) {
            const tarRes = await desktopProcess.execute(
              `tar.exe -xf "${winArchive}" -C "${winDest}"`,
            )
            if (tarRes.exitCode === 0) {
              extracted = true
            }
          }
          if (!extracted && lower.endsWith('.zip')) {
            const psCmd = `powershell -NoProfile -NonInteractive -Command "Expand-Archive -LiteralPath '${winArchive.replace(/'/g, "''")}' -DestinationPath '${winDest.replace(/'/g, "''")}' -Force"`
            const psRes = await desktopProcess.execute(psCmd)
            if (psRes.exitCode === 0) {
              extracted = true
            } else {
              throw new Error(
                psRes.stdErr ||
                  `Failed to extract archive (exit code ${psRes.exitCode})`,
              )
            }
          }
        }
      } else {
        // Linux / macOS
        if (lower.endsWith('.rar')) {
          const unrarCandidates = [
            './bin/unrar/linux/unrar',
            './bin/unrar/mac/arm64/unrar',
            './bin/unrar/mac/x64/unrar',
            'unrar',
          ]
          for (const uPath of unrarCandidates) {
            const res = await desktopProcess.execute(
              `"${uPath}" x -y -o+ "${archivePath}" "${destinationDir}/"`,
            )
            if (res.exitCode === 0) {
              extracted = true
              break
            }
          }
          if (!extracted) {
            throw new Error(`Failed to extract RAR archive on Unix host.`)
          }
        } else if (lower.endsWith('.7z')) {
          const sevenZipCandidates = [
            './bin/7z/linux/x64/7za',
            './bin/7z/mac/x64/7za',
            './bin/7z/mac/arm64/7za',
            '7za',
            '7z',
          ]
          for (const zPath of sevenZipCandidates) {
            const res = await desktopProcess.execute(
              `"${zPath}" x -y -o"${destinationDir}" "${archivePath}"`,
            )
            if (res.exitCode === 0) {
              extracted = true
              break
            }
          }
          if (!extracted) {
            throw new Error(`Failed to extract 7z archive on Unix host.`)
          }
        } else {
          const escArchive = archivePath.replace(/"/g, '\\"')
          const escDest = destinationDir.replace(/"/g, '\\"')
          const tarRes = await desktopProcess.execute(
            `tar -xf "${escArchive}" -C "${escDest}" || unzip -o "${escArchive}" -d "${escDest}"`,
          )
          if (tarRes.exitCode !== 0) {
            throw new Error(tarRes.stdErr || 'Failed to extract archive')
          }
        }
      }

      onProgress?.({
        progress: 99,
        statusText: 'Organizing mod files...',
      })

      if (removeArchive) {
        try {
          await desktopFileSystem.remove(archivePath)
        } catch {
          // ignore
        }
      }

      if (flattenSingleRoot) {
        await flattenDesktopSubdirectory(destinationDir)
      }
    } catch (err) {
      if (removeArchive) {
        try {
          await desktopFileSystem.remove(archivePath)
        } catch {
          // ignore
        }
      }
      throw err
    }
  },
}
