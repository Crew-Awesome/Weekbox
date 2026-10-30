import type { DownloadFileOptions, DownloadProgress } from './types'
import { formatBytesCompact, formatDownloadSpeed } from './download-helper'

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

  if (!response) {
    try {
      response = await fetch(url, {
        signal,
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })
    } catch (err) {
      if (
        (err instanceof DOMException && err.name === 'AbortError') ||
        signal?.aborted
      ) {
        throw new DOMException('Download canceled', 'AbortError')
      }
      throw new Error(
        `Failed to start download stream: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const headerLen = Number(response.headers.get('content-length') || 0)
  const totalBytes = headerLen > 0 ? headerLen : expectedSize

  if (!response.body) {
    const buf = await response.arrayBuffer()
    if (writeBinary) {
      await writeBinary(destinationPath, new Uint8Array(buf))
    }
    onProgress?.({
      progress: 98,
      downloaded: buf.byteLength,
      total: totalBytes || buf.byteLength,
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
