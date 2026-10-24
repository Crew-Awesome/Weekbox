import type { DownloadFileOptions, DownloadProgress } from './types'

export const DEFAULT_DOWNLOAD_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 WeekBox/1.0'

export function formatDownloadSpeed(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return '0 KB/s'
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
  }
  return `${Math.max(1, Math.round(bytesPerSec / 1024))} KB/s`
}

export function formatBytesCompact(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(
    sizes.length - 1,
    Math.floor(Math.log(bytes) / Math.log(k)),
  )
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Calls the local Vite dev server filesystem bridge (`/api/wb-fs`) if available.
 * Returns `null` when not running under the dev server or if the bridge is unreachable.
 */
export async function callDevFsBridge<T = Record<string, unknown>>(
  payload: Record<string, unknown>,
  timeoutMs = 15000,
): Promise<T | null> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch('/api/wb-fs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) return null
    return (await res.json()) as T
  } catch {
    clearTimeout(timer)
    return null
  }
}

/**
 * Downloads a file directly to disk via the local Node/Vite bridge (`/api/wb-download`),
 * streaming live NDJSON progress events back to `options.onProgress`.
 * Returns `true` if completed via the bridge, or `false` if the endpoint is unavailable.
 */
export async function downloadViaDevBridge(
  options: DownloadFileOptions,
): Promise<boolean> {
  const { url, destinationPath, expectedSize = 0, signal, onProgress } = options
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return false
  }

  if (signal?.aborted) {
    throw new DOMException('Download canceled', 'AbortError')
  }

  let response: Response
  try {
    response = await fetch('/api/wb-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        destinationPath,
        expectedSize,
      }),
      signal,
    })
  } catch (err) {
    if (
      (err instanceof DOMException && err.name === 'AbortError') ||
      signal?.aborted
    ) {
      throw new DOMException('Download canceled', 'AbortError')
    }
    return false
  }

  const contentType = response.headers.get('content-type') || ''
  if (!response.ok || !contentType.includes('application/x-ndjson')) {
    return false
  }

  if (!response.body) {
    return false
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let completedOk = false

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel()
        throw new DOMException('Download canceled', 'AbortError')
      }

      const { done, value } = await reader.read()
      if (done) break

      if (value) {
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const rawLine of lines) {
          const line = rawLine.trim()
          if (!line) continue

          let event: {
            type?: string
            progress?: number
            downloaded?: number
            total?: number
            speed?: string
            statusText?: string
            message?: string
            error?: string
            done?: boolean
          }
          try {
            event = JSON.parse(line)
          } catch {
            continue
          }

          if (event.type === 'error' || event.error) {
            throw new Error(event.message || event.error || 'Download stream failed')
          }

          if (typeof event.progress === 'number' || event.done) {
            onProgress?.({
              progress: Number(event.progress ?? 0),
              downloaded: Number(event.downloaded ?? 0),
              total: Number(event.total ?? expectedSize),
              speed: event.speed || '0 KB/s',
              statusText: event.statusText || 'Downloading...',
            })
          }

          if (event.type === 'done' || event.done) {
            completedOk = true
          }
        }
      }
    }
  } catch (err) {
    if (
      (err instanceof DOMException && err.name === 'AbortError') ||
      signal?.aborted
    ) {
      throw new DOMException('Download canceled', 'AbortError')
    }
    throw err
  }

  return completedOk
}

/**
 * Downloads a file using standard Fetch `ReadableStream` (using `/api/proxy-download`
 * automatically when available to bypass multi-hop redirect CORS restrictions),
 * reporting live progress and writing binary data via `writeBinary`.
 */
export async function downloadViaFetchStream(
  options: DownloadFileOptions,
  writeBinary?: (path: string, data: Uint8Array) => Promise<void>,
): Promise<void> {
  const { url, destinationPath, expectedSize = 0, signal, onProgress } = options

  if (signal?.aborted) {
    throw new DOMException('Download canceled', 'AbortError')
  }

  onProgress?.({
    progress: 0,
    downloaded: 0,
    total: expectedSize,
    speed: 'Starting...',
    statusText: 'Starting download...',
  })

  let response: Response | null = null

  // 1. Try CORS-safe proxy route if available on local dev server
  try {
    const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(url)}`
    const proxyRes = await fetch(proxyUrl, { signal })
    const proxyType = proxyRes.headers.get('content-type') || ''
    if (proxyRes.ok && !proxyType.includes('text/html')) {
      response = proxyRes
    }
  } catch (err) {
    if (
      (err instanceof DOMException && err.name === 'AbortError') ||
      signal?.aborted
    ) {
      throw new DOMException('Download canceled', 'AbortError')
    }
  }

  // 2. Fallback to direct fetch
  if (!response) {
    response = await fetch(url, { signal })
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const contentLength = Number(response.headers.get('content-length') || 0)
  const totalBytes = contentLength > 0 ? contentLength : expectedSize

  onProgress?.({
    progress: 2,
    downloaded: 0,
    total: totalBytes,
    speed: 'Connecting...',
    statusText: 'Connecting to server...',
  })

  if (!response.body) {
    const arrayBuffer = await response.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    if (writeBinary) {
      await writeBinary(destinationPath, bytes)
    }
    onProgress?.({
      progress: 98,
      downloaded: bytes.byteLength,
      total: totalBytes || bytes.byteLength,
      speed: '',
      statusText: 'Download finished',
    })
    return
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let receivedLength = 0
  let lastBytes = 0
  let lastTick = performance.now()
  let smoothedSpeed = 0

  while (true) {
    if (signal?.aborted) {
      await reader.cancel()
      throw new DOMException('Download canceled', 'AbortError')
    }

    const { done, value } = await reader.read()
    if (done) break

    if (value) {
      chunks.push(value)
      receivedLength += value.byteLength

      const now = performance.now()
      const elapsedSec = (now - lastTick) / 1000
      const isFirstChunk = chunks.length === 1

      if (elapsedSec >= 0.1 || isFirstChunk) {
        const instantSpeed =
          elapsedSec > 0 ? (receivedLength - lastBytes) / elapsedSec : 0
        smoothedSpeed =
          smoothedSpeed === 0
            ? instantSpeed
            : smoothedSpeed * 0.65 + instantSpeed * 0.35
        lastBytes = receivedLength
        lastTick = now

        const effectiveTotal =
          totalBytes > 0 ? Math.max(totalBytes, receivedLength) : 0
        const percent =
          effectiveTotal > 0
            ? Math.min(
                98,
                Math.max(2, Math.floor((receivedLength / effectiveTotal) * 98)),
              )
            : Math.min(
                95,
                Math.max(2, Math.floor(receivedLength / (1024 * 512))),
              )

        const update: DownloadProgress = {
          progress: percent,
          downloaded: receivedLength,
          total: effectiveTotal,
          speed: formatDownloadSpeed(smoothedSpeed),
          statusText: `Downloading (${formatBytesCompact(receivedLength)})...`,
        }
        onProgress?.(update)
      }
    }
  }

  const finalTotal =
    totalBytes > 0 ? Math.max(totalBytes, receivedLength) : receivedLength

  onProgress?.({
    progress: 98,
    downloaded: receivedLength,
    total: finalTotal,
    speed: formatDownloadSpeed(smoothedSpeed),
    statusText: `Downloaded (${formatBytesCompact(receivedLength)})`,
  })

  if (writeBinary) {
    const combined = new Uint8Array(receivedLength)
    let offset = 0
    for (const chunk of chunks) {
      combined.set(chunk, offset)
      offset += chunk.byteLength
    }
    await writeBinary(destinationPath, combined)
  }
}
