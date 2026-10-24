import {
  callDevFsBridge,
  downloadViaDevBridge,
  downloadViaFetchStream,
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

const webFileSystem: FileSystemHost = {
  async readTextFile(path: string): Promise<string> {
    const bridgeRes = await callDevFsBridge<{ ok?: boolean; data?: string }>({
      action: 'readTextFile',
      path,
    })
    if (bridgeRes && typeof bridgeRes.data === 'string') {
      return bridgeRes.data
    }

    const data = localStorage.getItem(`fs:${path}`)
    if (data === null) {
      throw new Error(`[WebHost] File not found: ${path}`)
    }
    return data
  },

  async writeTextFile(path: string, data: string): Promise<void> {
    const bridgeRes = await callDevFsBridge<{ ok?: boolean }>({
      action: 'writeTextFile',
      path,
      data,
    })
    if (bridgeRes?.ok) {
      return
    }
    localStorage.setItem(`fs:${path}`, data)
  },

  async readBinaryFile(path: string): Promise<ArrayBuffer> {
    const data = localStorage.getItem(`fs:${path}`)
    if (!data) return new ArrayBuffer(0)
    return new TextEncoder().encode(data).buffer
  },

  async writeBinaryFile(
    path: string,
    data: ArrayBuffer | Uint8Array,
  ): Promise<void> {
    try {
      const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
      if (bytes.byteLength < 512 * 1024) {
        const text = new TextDecoder().decode(bytes)
        localStorage.setItem(`fs:${path}`, text)
      }
    } catch {
      // Ignore quota errors on web preview mock
    }
  },

  async createDirectory(path: string): Promise<void> {
    await callDevFsBridge({ action: 'createDirectory', path })
  },

  async remove(path: string): Promise<void> {
    const bridgeRes = await callDevFsBridge<{ ok?: boolean }>({
      action: 'remove',
      path,
    })
    if (bridgeRes?.ok) return
    localStorage.removeItem(`fs:${path}`)
  },

  async readDirectory(path: string): Promise<FileEntry[]> {
    const bridgeRes = await callDevFsBridge<{
      ok?: boolean
      entries?: FileEntry[]
    }>({
      action: 'readDirectory',
      path,
    })
    if (bridgeRes?.entries) {
      return bridgeRes.entries
    }

    const prefix = `fs:${path}/`
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix))
    return keys.map((k) => ({
      name: k.replace(prefix, ''),
      path: k.replace(/^fs:/, ''),
      isDirectory: false,
    }))
  },

  async exists(path: string): Promise<boolean> {
    const bridgeRes = await callDevFsBridge<{ exists?: boolean }>({
      action: 'exists',
      path,
    })
    if (bridgeRes && typeof bridgeRes.exists === 'boolean') {
      return bridgeRes.exists
    }
    return localStorage.getItem(`fs:${path}`) !== null
  },
}

const webProcess: ProcessHost = {
  async spawn(command: string, _options?: SpawnProcessOptions) {
    console.warn(
      `[WebHost] Process spawning is not available in browser: ${command}`,
    )
    return { id: 0, pid: 0 }
  },

  async execute(command: string, _options?: SpawnProcessOptions) {
    console.warn(
      `[WebHost] Process execution is not available in browser: ${command}`,
    )
    return {
      stdOut: '',
      stdErr: 'Process execution is unavailable in web browser environment.',
      exitCode: 1,
    }
  },
}

export const webHost: HostAdapter = {
  platform: 'web',
  fs: webFileSystem,
  process: webProcess,

  async getDataPath(): Promise<string> {
    const bridgeRes = await callDevFsBridge<{ dataPath?: string }>(
      { action: 'getDataPath' },
      2000,
    )
    if (bridgeRes?.dataPath) {
      return bridgeRes.dataPath.trim().replace(/\\/g, '/')
    }
    return ''
  },

  async getAppVersion(): Promise<string> {
    return '1.0.0'
  },

  async openUrl(url: string): Promise<void> {
    window.open(url, '_blank', 'noopener,noreferrer')
  },

  async downloadFile(options: DownloadFileOptions): Promise<void> {
    // 1. Try local dev bridge to write directly to WeekBoxLibrary on disk
    const handledByBridge = await downloadViaDevBridge(options)
    if (handledByBridge) return

    // 2. Fallback to browser Fetch ReadableStream
    await downloadViaFetchStream(options, async (destPath, bytes) => {
      await webFileSystem.writeBinaryFile(destPath, bytes)
    })
  },

  async extractArchive(options: ExtractArchiveOptions): Promise<void> {
    const {
      archivePath,
      destinationDir,
      removeArchive = true,
      onProgress,
    } = options

    onProgress?.({
      progress: 99,
      statusText: 'Extracting archive...',
      currentFile: archivePath.split('/').pop(),
    })

    // 1. Try local dev bridge extraction if running on local dev server
    const bridgeRes = await callDevFsBridge<{ ok?: boolean; error?: string }>(
      {
        action: 'extractArchive',
        archivePath,
        destDir: destinationDir,
      },
      300000,
    )
    if (bridgeRes?.ok) {
      return
    }

    // 2. Static web environment cleanup
    if (removeArchive) {
      try {
        await webFileSystem.remove(archivePath)
      } catch {
        // ignore
      }
    }
  },
}
