import * as Neutralino from '@neutralinojs/lib'
import { Capacitor } from '@capacitor/core'
import { desktopHost } from './desktop'
import { mobileHost } from './mobile'
import { webHost } from './web'
import type { HostAdapter, PlatformType } from './types'

export * from './types'
export * from './download-helper'
export { desktopHost } from './desktop'
export { mobileHost } from './mobile'
export { webHost } from './web'

let neutralinoInitialized = false

export function ensureNeutralinoInit(): void {
  if (neutralinoInitialized || typeof window === 'undefined') return
  if (isNeutralino()) {
    neutralinoInitialized = true
    try {
      Neutralino.init()
    } catch {
      // ignore if already initialized
    }
  }
}

export function isNeutralino(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as {
    NL_PORT?: unknown
    NL_TOKEN?: unknown
    NL_APPID?: unknown
    NL_MODE?: unknown
  }
  return Boolean(w.NL_PORT || w.NL_TOKEN || w.NL_APPID)
}

export function isCapacitor(): boolean {
  return Capacitor.isNativePlatform()
}

export function detectPlatform(): PlatformType {
  if (isNeutralino()) {
    return 'desktop'
  }
  if (isCapacitor()) {
    return 'mobile'
  }
  return 'web'
}

export function createHostAdapter(): HostAdapter {
  const platform = detectPlatform()
  switch (platform) {
    case 'desktop':
      ensureNeutralinoInit()
      return desktopHost
    case 'mobile':
      return mobileHost
    default:
      return webHost
  }
}

export function initHost(): HostAdapter {
  if (typeof window !== 'undefined') {
    if (!window.host) {
      window.host = createHostAdapter()
      console.log(`[WeekBox] Host platform initialized: ${window.host.platform}`)
    } else if (window.host.platform === 'desktop') {
      ensureNeutralinoInit()
    }
    return window.host
  }
  return webHost
}

export const host = initHost()
