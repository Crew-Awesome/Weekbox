import * as Neutralino from '@neutralinojs/lib'
import { callDevFsBridge } from './download-helper'
import { withTimeout } from './desktop-process'
import type { FileEntry, FileSystemHost } from './types'

// If Neutralino WebSocket isn't reachable (e.g. Vite browser dev with injected tokens),
// avoid stalling every FS call for 2.5-4s before falling back to `/api/wb-fs`.
const NEUTRALINO_RETRY_COOLDOWN_MS = 30000
let neutralinoFsUnavailableUntil = 0

function isNeutralinoFsAvailable(): boolean {
  return Date.now() >= neutralinoFsUnavailableUntil
}

function markNeutralinoFsResult(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err || '')
  if (msg.toLowerCase().includes('timed out')) {
    neutralinoFsUnavailableUntil = Date.now() + NEUTRALINO_RETRY_COOLDOWN_MS
  }
}

function getFsTimeout(fallbackMs: number): number {
  const isDev =
    typeof import.meta !== 'undefined' &&
    Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV)
  return isDev ? Math.min(fallbackMs, 450) : fallbackMs
}

export async function ensureParentDirectories(
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
    }
  }
}

export const desktopFileSystem: FileSystemHost = {
  async readTextFile(path: string): Promise<string> {
    if (isNeutralinoFsAvailable()) {
      try {
        return await withTimeout(
          Neutralino.filesystem.readFile(path),
          getFsTimeout(4000),
        )
      } catch (err) {
        markNeutralinoFsResult(err)
        const res = await callDevFsBridge<{ ok?: boolean; data?: string }>({
          action: 'readTextFile',
          path,
        })
        if (res && typeof res.data === 'string') return res.data
        throw err
      }
    }
    const res = await callDevFsBridge<{ ok?: boolean; data?: string }>({
      action: 'readTextFile',
      path,
    })
    if (res && typeof res.data === 'string') return res.data
    throw new Error(`File not found: ${path}`)
  },

  async writeTextFile(path: string, data: string): Promise<void> {
    if (isNeutralinoFsAvailable()) {
      try {
        await withTimeout(
          Neutralino.filesystem.writeFile(path, data),
          getFsTimeout(4000),
        )
        return
      } catch (err) {
        markNeutralinoFsResult(err)
        const res = await callDevFsBridge<{ ok?: boolean }>({
          action: 'writeTextFile',
          path,
          data,
        })
        if (res?.ok) return
        throw err
      }
    }
    const res = await callDevFsBridge<{ ok?: boolean }>({
      action: 'writeTextFile',
      path,
      data,
    })
    if (!res?.ok) {
      throw new Error(`Failed to write file: ${path}`)
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
    if (isNeutralinoFsAvailable()) {
      try {
        await withTimeout(
          Neutralino.filesystem.createDirectory(path),
          getFsTimeout(4000),
        )
        return
      } catch (err) {
        markNeutralinoFsResult(err)
      }
    }
    await callDevFsBridge({ action: 'createDirectory', path })
  },

  async move(sourcePath: string, destinationPath: string): Promise<void> {
    if (isNeutralinoFsAvailable()) {
      try {
        await withTimeout(
          Neutralino.filesystem.move(sourcePath, destinationPath),
          getFsTimeout(60000),
        )
        return
      } catch (err) {
        markNeutralinoFsResult(err)
        const res = await callDevFsBridge<{ ok?: boolean }>({
          action: 'move',
          sourcePath,
          destinationPath,
        })
        if (res?.ok) return
        throw err
      }
    }
    const res = await callDevFsBridge<{ ok?: boolean }>({
      action: 'move',
      sourcePath,
      destinationPath,
    })
    if (!res?.ok) {
      throw new Error(`Failed to move ${sourcePath} to ${destinationPath}`)
    }
  },

  async remove(path: string): Promise<void> {
    if (isNeutralinoFsAvailable()) {
      try {
        await withTimeout(
          Neutralino.filesystem.remove(path),
          getFsTimeout(4000),
        )
        return
      } catch (err) {
        markNeutralinoFsResult(err)
      }
    }
    await callDevFsBridge({ action: 'remove', path })
  },

  async readDirectory(path: string): Promise<FileEntry[]> {
    if (isNeutralinoFsAvailable()) {
      try {
        const entries = await withTimeout(
          Neutralino.filesystem.readDirectory(path),
          getFsTimeout(4000),
        )
        return entries
          .filter((item) => item.entry !== '.' && item.entry !== '..')
          .map((item) => ({
            name: item.entry,
            path: `${path}/${item.entry}`.replace(/\/+/g, '/'),
            isDirectory: String(item.type || '').toUpperCase() === 'DIRECTORY',
            size: Number((item as { size?: number }).size) || undefined,
          }))
      } catch (err) {
        markNeutralinoFsResult(err)
      }
    }
    const res = await callDevFsBridge<{
      ok?: boolean
      entries?: FileEntry[]
    }>({
      action: 'readDirectory',
      path,
    })
    return res?.entries || []
  },

  async exists(path: string): Promise<boolean> {
    if (isNeutralinoFsAvailable()) {
      try {
        await withTimeout(
          Neutralino.filesystem.getStats(path),
          getFsTimeout(2500),
        )
        return true
      } catch (err) {
        markNeutralinoFsResult(err)
      }
    }
    const res = await callDevFsBridge<{ exists?: boolean }>({
      action: 'exists',
      path,
    })
    return Boolean(res?.exists)
  },
}
