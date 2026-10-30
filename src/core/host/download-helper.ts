import type { DownloadFileOptions } from './types'

export { extractViaDevBridge } from './extract-helper'
export { downloadViaFetchStream } from './fetch-stream-downloader'

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
      if (!value) continue

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
          error?: string
          done?: boolean
        }
        try {
          event = JSON.parse(line)
        } catch {
          continue
        }

        if (event.error) {
          throw new Error(event.error)
        }

        if (
          typeof event.progress === 'number' ||
          typeof event.downloaded === 'number'
        ) {
          onProgress?.({
            progress: Number(event.progress ?? 0),
            downloaded: Number(event.downloaded ?? 0),
            total: Number(event.total ?? expectedSize),
            speed: event.speed ?? '0 B/s',
            statusText: event.statusText,
          })
        }

        if (event.type === 'done' || event.done) {
          completedOk = true
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
