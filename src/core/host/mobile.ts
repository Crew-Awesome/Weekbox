import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { App } from '@capacitor/app'
import { downloadViaFetchStream } from './download-helper'
import type {
  DownloadFileOptions,
  ExtractArchiveOptions,
  FileEntry,
  FileSystemHost,
  HostAdapter,
  ProcessHost,
  SpawnProcessOptions,
} from './types'

function parseMobilePath(path: string): { path: string; directory?: Directory } {
  const normalized = path.replace(/\\/g, '/')
  if (normalized.startsWith('file://')) {
    return { path: normalized }
  }
  return { path: normalized.replace(/^\/+/, ''), directory: Directory.Data }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000
  const chunks: string[] = []
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize)
    chunks.push(String.fromCharCode(...slice))
  }
  return btoa(chunks.join(''))
}

const mobileFileSystem: FileSystemHost = {
  async readTextFile(path: string): Promise<string> {
    const opts = parseMobilePath(path)
    const res = await Filesystem.readFile({
      ...opts,
      encoding: Encoding.UTF8,
    })
    return typeof res.data === 'string' ? res.data : ''
  },

  async writeTextFile(path: string, data: string): Promise<void> {
    const opts = parseMobilePath(path)
    await Filesystem.writeFile({
      ...opts,
      data,
      encoding: Encoding.UTF8,
      recursive: true,
    })
  },

  async readBinaryFile(path: string): Promise<ArrayBuffer> {
    const opts = parseMobilePath(path)
    const res = await Filesystem.readFile(opts)
    if (typeof res.data === 'string') {
      const binaryString = atob(res.data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      return bytes.buffer
    }
    return new ArrayBuffer(0)
  },

  async writeBinaryFile(
    path: string,
    data: ArrayBuffer | Uint8Array,
  ): Promise<void> {
    const opts = parseMobilePath(path)
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
    const base64 = uint8ArrayToBase64(bytes)
    await Filesystem.writeFile({
      ...opts,
      data: base64,
      recursive: true,
    })
  },

  async createDirectory(path: string): Promise<void> {
    const opts = parseMobilePath(path)
    await Filesystem.mkdir({
      ...opts,
      recursive: true,
    })
  },

  async move(sourcePath: string, destinationPath: string): Promise<void> {
    const source = parseMobilePath(sourcePath)
    const destination = parseMobilePath(destinationPath)
    await Filesystem.rename({
      from: source.path,
      to: destination.path,
      directory: source.directory || destination.directory,
    })
  },

  async remove(path: string): Promise<void> {
    const opts = parseMobilePath(path)
    try {
      await Filesystem.deleteFile(opts)
    } catch {
      await Filesystem.rmdir({
        ...opts,
        recursive: true,
      })
    }
  },

  async readDirectory(path: string): Promise<FileEntry[]> {
    const opts = parseMobilePath(path)
    const res = await Filesystem.readdir(opts)
    return res.files.map((file) => ({
      name: file.name,
      path: file.uri || `${path}/${file.name}`,
      isDirectory: file.type === 'directory',
      size: file.size,
    }))
  },

  async exists(path: string): Promise<boolean> {
    try {
      const opts = parseMobilePath(path)
      await Filesystem.stat(opts)
      return true
    } catch {
      return false
    }
  },
}

const mobileProcess: ProcessHost = {
  async spawn(command: string, _options?: SpawnProcessOptions) {
    console.warn(
      `[MobileHost] spawnProcess is restricted on mobile devices: ${command}`,
    )
    return { id: 0, pid: 0 }
  },

  async execute(command: string, _options?: SpawnProcessOptions) {
    console.warn(
      `[MobileHost] execCommand is restricted on mobile devices: ${command}`,
    )
    return {
      stdOut: '',
      stdErr: 'Process execution is restricted on mobile sandbox.',
      exitCode: 1,
    }
  },
}

export const mobileHost: HostAdapter = {
  platform: 'mobile',
  fs: mobileFileSystem,
  process: mobileProcess,

  async getDataPath(): Promise<string> {
    try {
      const res = await Filesystem.getUri({
        directory: Directory.Data,
        path: '',
      })
      if (res && res.uri) {
        return res.uri.replace(/\\/g, '/').replace(/\/+$/, '')
      }
    } catch (err) {
      console.warn('[MobileHost] Failed to get Directory.Data URI:', err)
    }
    return ''
  },

  async getAppVersion(): Promise<string> {
    try {
      const info = await App.getInfo()
      return info.version || '1.0.0'
    } catch {
      return '1.0.0'
    }
  },

  async openUrl(url: string): Promise<void> {
    try {
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      window.location.href = url
    }
  },

  async downloadFile(options: DownloadFileOptions): Promise<void> {
    await downloadViaFetchStream(options, async (destPath, bytes) => {
      await mobileFileSystem.writeBinaryFile(destPath, bytes)
    })
  },

  async extractArchive(options: ExtractArchiveOptions): Promise<void> {
    const { archivePath, onProgress } = options

    onProgress?.({
      progress: 99,
      statusText: 'Extracting archive...',
      currentFile: archivePath.split('/').pop(),
    })

    throw new Error(
      `Archive extraction is not supported on mobile yet; the archive was kept at ${archivePath}.`,
    )
  },
}
