import * as Neutralino from '@neutralinojs/lib'
import {
  callDevFsBridge,
  downloadViaDevBridge,
  downloadViaFetchStream,
} from './download-helper'
import { desktopFileSystem } from './desktop-fs'
import { desktopProcess, withTimeout } from './desktop-process'
import { downloadViaNativeCurl } from './desktop-downloader'
import { extractDesktopArchive } from './desktop-archive'
import type {
  DownloadFileOptions,
  ExtractArchiveOptions,
  HostAdapter,
} from './types'

export const desktopHost: HostAdapter = {
  platform: 'desktop',
  fs: desktopFileSystem,
  process: desktopProcess,

  async getDataPath(): Promise<string> {
    try {
      const bridgeRes = await callDevFsBridge<{ dataPath?: string }>(
        { action: 'getDataPath' },
        300,
      )
      if (bridgeRes?.dataPath && bridgeRes.dataPath.trim()) {
        return bridgeRes.dataPath.trim().replace(/\\/g, '/')
      }
    } catch {
    }

    try {
      const local = await withTimeout(
        Neutralino.os.getEnv('LOCALAPPDATA'),
        1500,
      )
      if (local && local.trim()) return local.trim().replace(/\\/g, '/')
    } catch {
    }

    try {
      const p = await withTimeout(Neutralino.os.getPath('data'), 1500)
      if (p && p.trim()) return p.trim().replace(/\\/g, '/')
    } catch {
    }

    if (typeof window !== 'undefined') {
      const nlData = (window as unknown as { NL_DATAPATH?: string }).NL_DATAPATH
      if (nlData && nlData.trim()) {
        return nlData.trim().replace(/\\/g, '/')
      }
    }

    try {
      const app = await withTimeout(Neutralino.os.getEnv('APPDATA'), 1000)
      if (app && app.trim()) return app.trim().replace(/\\/g, '/')
    } catch {
    }

    return ''
  },

  async getAppVersion(): Promise<string> {
    try {
      if (typeof window !== 'undefined') {
        const win = window as unknown as { NL_APPVERSION?: string }
        if (win.NL_APPVERSION) return win.NL_APPVERSION
      }
      return '1.0.0'
    } catch {
      return '1.0.0'
    }
  },

  async openUrl(url: string): Promise<void> {
    try {
      await withTimeout(Neutralino.os.open(url))
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  },

  async downloadFile(options: DownloadFileOptions): Promise<void> {
    const handledByBridge = await downloadViaDevBridge(options)
    if (handledByBridge) {
      options.onProgress?.({
        progress: 100,
        downloaded: options.expectedSize || 0,
        total: options.expectedSize || 0,
        speed: '',
        statusText: 'Download finished',
      })
      return
    }

    try {
      await downloadViaNativeCurl(options)
      options.onProgress?.({
        progress: 100,
        downloaded: options.expectedSize || 0,
        total: options.expectedSize || 0,
        speed: '',
        statusText: 'Download finished',
      })
      return
    } catch {
      if (options.signal?.aborted) {
        throw new DOMException('Download canceled', 'AbortError')
      }

      await downloadViaFetchStream(options, async (destPath, data) => {
        await desktopFileSystem.writeBinaryFile(destPath, data)
      })

      options.onProgress?.({
        progress: 100,
        downloaded: options.expectedSize || 0,
        total: options.expectedSize || 0,
        speed: '',
        statusText: 'Download finished',
      })
    }
  },

  async extractArchive(options: ExtractArchiveOptions): Promise<void> {
    await extractDesktopArchive(options)
  },
}
