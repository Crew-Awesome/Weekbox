import { initHost } from '@/core/host'
import type { HostAdapter } from '@/core/host'
import { WEEKBOX_LIBRARY_DIR_NAME } from './constants'

export interface V2SettingEntry {
  type?: string
  value?: unknown
}

export interface V2SettingsDocument {
  version?: number
  settings?: Record<string, V2SettingEntry>
}

export interface ParsedV2Settings {
  storagePath?: string
  language?: string
  theme?: 'light' | 'dark'
  rawSettings?: Record<string, V2SettingEntry>
}

const V2_SETTINGS_PATH_KEY = 'weekbox-settings-data-path-v2'
const V2_LEGACY_SETTINGS_PATH_KEY = 'weekbox-settings-data-path'

export function isAbsolutePath(p: string | null | undefined): boolean {
  if (!p || typeof p !== 'string') return false
  const clean = p.replace(/\\/g, '/').trim()
  return /^[a-zA-Z]:\//i.test(clean) || clean.startsWith('/')
}

export function joinPaths(base: string, ...parts: string[]): string {
  let result = base.replace(/[/\\]+$/, '')
  for (const part of parts) {
    const clean = part.replace(/^[/\\]+/, '').replace(/[/\\]+$/, '')
    if (clean) {
      result = `${result}/${clean}`
    }
  }
  return result.replace(/\/+/g, '/')
}

/**
 * Normalizes a v2 settings directory path (which may point to `/config` or `/data`)
 * back to the root `WeekBoxLibrary` directory.
 */
export function getStorageRootFromV2SettingsPath(settingsDirPath: string): string {
  const clean = settingsDirPath.trim().replace(/\\/g, '/').replace(/\/+$/, '')
  return /\/(?:config|data)$/i.test(clean)
    ? clean.slice(0, clean.lastIndexOf('/'))
    : clean
}

/**
 * Extracts normalized preferences from a WeekBox v2 (`main`) typed settings document.
 */
export function parseV2SettingsDocument(rawText: string): ParsedV2Settings | null {
  if (!rawText || !rawText.trim()) return null
  try {
    const parsed = JSON.parse(rawText) as V2SettingsDocument
    if (!parsed || typeof parsed !== 'object' || !parsed.settings) return null
    const map = parsed.settings
    const storageVal = map.storagePath?.value
    const languageVal = map.language?.value
    const darkModeVal = map.darkMode?.value

    return {
      storagePath:
        typeof storageVal === 'string' && storageVal.trim()
          ? storageVal.trim().replace(/\\/g, '/').replace(/\/+$/, '')
          : undefined,
      language:
        typeof languageVal === 'string' && languageVal.trim()
          ? languageVal.trim()
          : undefined,
      theme:
        typeof darkModeVal === 'boolean'
          ? darkModeVal
            ? 'dark'
            : 'light'
          : undefined,
      rawSettings: map,
    }
  } catch {
    return null
  }
}

export async function readV2SettingsFromLibrary(
  host: HostAdapter,
  libraryRoot: string,
): Promise<ParsedV2Settings | null> {
  const configSettingsPath = joinPaths(libraryRoot, 'config/settings.json')
  try {
    if (await host.fs.exists(configSettingsPath)) {
      const raw = await host.fs.readTextFile(configSettingsPath)
      return parseV2SettingsDocument(raw)
    }
  } catch {
  }
  return null
}

/**
 * Mirrors WeekBox v2 `isCompleteStorage`: verifies core `data`, `mods`, `engines`
 * directories plus at least one identity marker (`storage-manifest.json`, `config/settings.json`,
 * or an installed-mods manifest).
 */
export async function isCompleteV2Storage(
  host: HostAdapter,
  rootPath: string,
): Promise<boolean> {
  const clean = rootPath.trim().replace(/\\/g, '/').replace(/\/+$/, '')
  if (!clean || !isAbsolutePath(clean)) return false

  try {
    const entries = await host.fs.readDirectory(clean)
    if (!entries || entries.length === 0) return false
    const names = new Set(entries.map((e) => e.name.toLowerCase()))
    const dirs = new Set(
      entries.filter((e) => e.isDirectory).map((e) => e.name.toLowerCase()),
    )
    if (!dirs.has('data') || !dirs.has('mods') || !dirs.has('engines')) {
      return false
    }
    if (
      names.has('storage-manifest.json') ||
      names.has('settings.json') ||
      dirs.has('config')
    ) {
      return true
    }
    const dataEntries = await host.fs.readDirectory(joinPaths(clean, 'data'))
    return dataEntries.some((e) =>
      ['installed-mods.json', 'installedmods.json'].includes(
        e.name.toLowerCase(),
      ),
    )
  } catch {
    return false
  }
}

async function readNeutralinoSavedV2StorageRoot(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const nl = (
    window as unknown as {
      Neutralino?: {
        storage?: { getData?: (key: string) => Promise<string> }
      }
    }
  ).Neutralino
  if (!nl?.storage?.getData) return null

  const withShortTimeout = <T>(p: Promise<T>): Promise<T | null> =>
    Promise.race([
      p,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 300)),
    ])

  for (const key of [V2_SETTINGS_PATH_KEY, V2_LEGACY_SETTINGS_PATH_KEY]) {
    try {
      const value = await withShortTimeout(nl.storage.getData(key))
      if (value === null) return null
      if (value && value.trim()) {
        const root = getStorageRootFromV2SettingsPath(value)
        if (isAbsolutePath(root)) return root
      }
    } catch {
    }
  }
  return null
}

/**
 * Resolves the active `WeekBoxLibrary` root with full WeekBox v2 fallback compatibility:
 * 1. Reads `<defaultDataPath>/WeekBoxLibrary/config/settings.json` -> `storagePath`
 * 2. Reads Neutralino's v2 `weekbox-settings-data-path-v2` storage key
 * 3. Falls back to `<defaultDataPath>/WeekBoxLibrary` if it exists or v2 alternative folders
 */
export async function resolveV2CompatibleLibraryPath(
  defaultDataPath: string,
): Promise<string> {
  const host = initHost()
  const cleanDataPath = defaultDataPath.trim().replace(/\\/g, '/').replace(/\/+$/, '')
  const primaryCandidate = cleanDataPath
    ? joinPaths(cleanDataPath, WEEKBOX_LIBRARY_DIR_NAME)
    : ''

  if (primaryCandidate && isAbsolutePath(primaryCandidate)) {
    const v2Prefs = await readV2SettingsFromLibrary(host, primaryCandidate)
    if (
      v2Prefs?.storagePath &&
      v2Prefs.storagePath.toLowerCase() !== primaryCandidate.toLowerCase() &&
      (await isCompleteV2Storage(host, v2Prefs.storagePath))
    ) {
      return v2Prefs.storagePath
    }
  }

  const nlRoot = await readNeutralinoSavedV2StorageRoot()
  if (nlRoot) {
    const nlPrefs = await readV2SettingsFromLibrary(host, nlRoot)
    if (nlPrefs?.storagePath && (await isCompleteV2Storage(host, nlPrefs.storagePath))) {
      return nlPrefs.storagePath
    }
    if (await isCompleteV2Storage(host, nlRoot)) {
      return nlRoot
    }
  }

  if (primaryCandidate && (await isCompleteV2Storage(host, primaryCandidate))) {
    return primaryCandidate
  }

  if (cleanDataPath && isAbsolutePath(cleanDataPath)) {
    const parentDir = cleanDataPath.slice(0, cleanDataPath.lastIndexOf('/'))
    const fallbackCandidates = [
      joinPaths(cleanDataPath, 'WeekBoxLibrary-storage'),
      joinPaths(cleanDataPath, 'WeekBoxData/WeekBox'),
      joinPaths(cleanDataPath, 'WeekBox'),
      parentDir ? joinPaths(parentDir, 'Roaming/WeekBoxLibrary') : '',
      parentDir ? joinPaths(parentDir, 'Roaming/WeekBox') : '',
    ].filter(Boolean)

    for (const candidate of fallbackCandidates) {
      if (await isCompleteV2Storage(host, candidate)) {
        return candidate
      }
    }
  }

  return primaryCandidate
}

/**
 * Ensures v2 layout manifests coexist cleanly without overwriting existing v2 state.
 */
export async function syncV2ManifestLayout(
  host: HostAdapter,
  basePath: string,
  installedModsPath: string,
  legacyInstalledModsPath: string,
): Promise<void> {
  try {
    const manifestPath = joinPaths(basePath, 'storage-manifest.json')
    const [hasNew, hasLegacy] = await Promise.all([
      host.fs.exists(installedModsPath),
      host.fs.exists(legacyInstalledModsPath),
    ])

    if (!hasNew && hasLegacy) {
      const legacyRaw = await host.fs.readTextFile(legacyInstalledModsPath)
      if (legacyRaw && legacyRaw.trim()) {
        await host.fs.writeTextFile(installedModsPath, legacyRaw)
      }
    } else if (!hasNew && !hasLegacy) {
      await host.fs.writeTextFile(installedModsPath, '[]')
    }

    if (!(await host.fs.exists(manifestPath))) {
      await host.fs.writeTextFile(
        manifestPath,
        JSON.stringify({ version: 2 }, null, 2),
      )
    }
  } catch (err) {
    console.warn('[WeekBox] Failed to synchronize v2 storage layout:', err)
  }
}
