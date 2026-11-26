import { initHost } from '@/core/host'
import { ensureWeekBoxLibrary, isAbsolutePath } from './weekbox-library'
import { readV2SettingsFromLibrary } from './v2-storage-compat'

export type UiStyle = 'default' | 'home'
export type SidebarStyle = UiStyle

export const UI_STYLE_LABELS: Record<UiStyle, string> = {
  default: 'WeekBox Style',
  home: 'WeekBox Home',
}

export interface WeekBoxSettingsJson {
  version?: string
  theme?: 'light' | 'dark' | 'system'
  language?: string
  uiScale?: number
  uiStyle?: UiStyle
  sidebarStyle?: UiStyle
  setupCompleted?: boolean
  autoUpdate?: boolean
  registerProtocolLinks?: boolean
  [key: string]: unknown
}

const touchedKeysThisSession = new Set<string>()
let pendingPatch: Record<string, unknown> = {}
let flushTimer: number | null = null
let writeChain: Promise<WeekBoxSettingsJson | null> = Promise.resolve(null)
let flushWaiters: Array<(result: WeekBoxSettingsJson | null) => void> = []

export function normalizeUiStyle(value: unknown): UiStyle | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'default' || normalized === 'home') {
    return normalized
  }
  return null
}

export function hasTouchedSettingsKey(key: string): boolean {
  return touchedKeysThisSession.has(key)
}

/**
 * Reads WeekBox's persisted settings JSON (`WeekBoxLibrary/settings.json`).
 */
export async function readWeekBoxSettingsJson(): Promise<WeekBoxSettingsJson | null> {
  try {
    const lib = await ensureWeekBoxLibrary()
    if (!lib.basePath || !isAbsolutePath(lib.basePath)) return null

    const host = initHost()
    if (await host.fs.exists(lib.paths.settings)) {
      const raw = await host.fs.readTextFile(lib.paths.settings)
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw) as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as WeekBoxSettingsJson
        }
      }
    }

    // Fallback: WeekBox v2 (`main`) stores preferences inside `config/settings.json`
    // and removes root `settings.json` during initialization.
    const v2 = await readV2SettingsFromLibrary(host, lib.basePath)
    if (v2) {
      const protoVal = v2.rawSettings?.registerProtocolLinks?.value
      return {
        ...(v2.theme ? { theme: v2.theme } : {}),
        ...(v2.language ? { language: v2.language } : {}),
        ...(typeof protoVal === 'boolean' ? { registerProtocolLinks: protoVal } : {}),
      }
    }
  } catch (err) {
    console.warn('[WeekBox] Failed to read settings.json:', err)
  }
  return null
}

async function commitSettingsPatch(
  patchToCommit: Record<string, unknown>,
): Promise<WeekBoxSettingsJson | null> {
  try {
    const lib = await ensureWeekBoxLibrary()
    if (!lib.basePath || !isAbsolutePath(lib.basePath)) return null

    const host = initHost()
    let current: WeekBoxSettingsJson = {}

    if (await host.fs.exists(lib.paths.settings)) {
      try {
        const raw = await host.fs.readTextFile(lib.paths.settings)
        if (raw && raw.trim()) {
          const parsed = JSON.parse(raw) as unknown
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            current = parsed as WeekBoxSettingsJson
          }
        }
      } catch {
        current = {}
      }
    }

    const nextSettings: WeekBoxSettingsJson = {
      version: '1.0.0',
      ...current,
      ...patchToCommit,
    }

    await host.fs.writeTextFile(
      lib.paths.settings,
      JSON.stringify(nextSettings, null, 2),
    )
    return nextSettings
  } catch (err) {
    console.warn('[WeekBox] Failed to update settings.json:', err)
    return null
  }
}

function flushPendingPatch(): void {
  flushTimer = null
  const snapshot = pendingPatch
  const waiters = flushWaiters
  pendingPatch = {}
  flushWaiters = []

  writeChain = writeChain
    .catch(() => null)
    .then(() => commitSettingsPatch(snapshot))
    .then((res) => {
      for (const resolve of waiters) {
        resolve(res)
      }
      return res
    })
}

/**
 * Queues a coalesced read-merge-write patch into `WeekBoxLibrary/settings.json`.
 */
export function patchWeekBoxSettingsJson(
  patch: Partial<WeekBoxSettingsJson>,
): Promise<WeekBoxSettingsJson | null> {
  for (const key of Object.keys(patch)) {
    touchedKeysThisSession.add(key)
  }
  pendingPatch = { ...pendingPatch, ...patch }

  return new Promise((resolve) => {
    flushWaiters.push(resolve)
    if (flushTimer !== null) {
      window.clearTimeout(flushTimer)
    }
    flushTimer = window.setTimeout(flushPendingPatch, 60)
  })
}
