import * as Neutralino from '@neutralinojs/lib'
import { callDevFsBridge } from './download-helper'
import { withTimeout } from './desktop-process'
import type { FileEntry, FileSystemHost } from './types'

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
