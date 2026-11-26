import { initHost, callDevFsBridge } from '@/core/host'
import {
  WEEKBOX_LIBRARY_DIR_NAME,
  WEEKBOX_CUSTOM_PATH_STORAGE_KEY,
  DEFAULT_LIBRARY_DIRECTORIES,
  DEFAULT_LIBRARY_FILE_CONTENTS,
} from './constants'
import {
  isAbsolutePath,
  joinPaths,
  resolveV2CompatibleLibraryPath,
  syncV2ManifestLayout,
} from './v2-storage-compat'
import type { WeekBoxLibraryPaths, LibraryInitializeResult } from './types'

export * from './constants'
export * from './types'
export { isAbsolutePath, joinPaths } from './v2-storage-compat'

let cachedDefaultDataPath: string | null = null
const ensuredLibraryCache = new Map<string, LibraryInitializeResult>()
const inFlightLibraryInit = new Map<string, Promise<LibraryInitializeResult>>()
let lastEnsuredLibrary: LibraryInitializeResult | null = null

export function getCachedWeekBoxLibrary(): LibraryInitializeResult | null {
  return lastEnsuredLibrary
}

export function getSavedCustomLibraryPath(): string | null {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(WEEKBOX_CUSTOM_PATH_STORAGE_KEY)
      if (!saved || !saved.trim()) return null
      const clean = saved.trim().replace(/\\/g, '/')

      if (
        !isAbsolutePath(clean) ||
        clean === WEEKBOX_LIBRARY_DIR_NAME ||
        clean.includes('/wb-rew')
      ) {
        console.warn('[WeekBox] Purging invalid custom library path from localStorage:', saved)
        localStorage.removeItem(WEEKBOX_CUSTOM_PATH_STORAGE_KEY)
        return null
      }
      return clean
    }
  } catch {
  }
  return null
}

export function setSavedCustomLibraryPath(path: string | null): void {
  try {
    if (typeof window !== 'undefined') {
      if (path && path.trim().length > 0 && isAbsolutePath(path.trim())) {
        localStorage.setItem(WEEKBOX_CUSTOM_PATH_STORAGE_KEY, path.trim())
      } else {
        localStorage.removeItem(WEEKBOX_CUSTOM_PATH_STORAGE_KEY)
      }
    }
  } catch (err) {
    console.warn('[WeekBox] Failed to save custom library path:', err)
  }
}

export async function resolveDefaultLibraryPath(): Promise<string> {
  if (cachedDefaultDataPath && isAbsolutePath(cachedDefaultDataPath)) {
    return joinPaths(cachedDefaultDataPath, WEEKBOX_LIBRARY_DIR_NAME)
  }

  try {
    const bridgeRes = await callDevFsBridge<{ dataPath?: string }>(
      { action: 'getDataPath' },
      500,
    )
    if (bridgeRes?.dataPath && isAbsolutePath(bridgeRes.dataPath)) {
      cachedDefaultDataPath = bridgeRes.dataPath.trim().replace(/\\/g, '/')
      return joinPaths(cachedDefaultDataPath, WEEKBOX_LIBRARY_DIR_NAME)
    }
  } catch {
  }

  const hostAdapter = initHost()
  try {
    const dataPath = await Promise.race([
      hostAdapter.getDataPath(),
      new Promise<string>((resolve) => setTimeout(() => resolve(''), 2000)),
    ])
    if (dataPath && isAbsolutePath(dataPath)) {
      cachedDefaultDataPath = dataPath.trim().replace(/\\/g, '/')
      return joinPaths(cachedDefaultDataPath, WEEKBOX_LIBRARY_DIR_NAME)
    }
  } catch (err) {
    console.warn('[WeekBox] hostAdapter.getDataPath() failed:', err)
  }

  const nlData =
    typeof window !== 'undefined'
      ? (window as unknown as { NL_DATAPATH?: string }).NL_DATAPATH
      : undefined
  if (nlData && isAbsolutePath(nlData)) {
    return joinPaths(nlData.trim().replace(/\\/g, '/'), WEEKBOX_LIBRARY_DIR_NAME)
  }

  return cachedDefaultDataPath
    ? joinPaths(cachedDefaultDataPath, WEEKBOX_LIBRARY_DIR_NAME)
    : ''
}

export async function resolveActiveLibraryPath(): Promise<string> {
  const custom = getSavedCustomLibraryPath()
  if (custom && isAbsolutePath(custom)) {
    return custom.replace(/\\/g, '/')
  }
  const defaultPath = await resolveDefaultLibraryPath()
  if (defaultPath && isAbsolutePath(defaultPath)) {
    const dataRoot = defaultPath.slice(0, defaultPath.lastIndexOf('/'))
    const compatible = await resolveV2CompatibleLibraryPath(dataRoot)
    if (compatible && isAbsolutePath(compatible)) {
      return compatible
    }
  }
  return defaultPath
}

export function getWeekBoxLibraryPaths(basePath: string): WeekBoxLibraryPaths {
  return {
    root: basePath,
    settings: joinPaths(basePath, 'settings.json'),
    configDir: joinPaths(basePath, 'config'),
    configSettings: joinPaths(basePath, 'config/settings.json'),
    stateDir: joinPaths(basePath, 'state'),
    runtimeDir: joinPaths(basePath, 'runtime'),
    storageManifest: joinPaths(basePath, 'storage-manifest.json'),
    modsDir: joinPaths(basePath, 'mods'),
    enginesDir: joinPaths(basePath, 'engines'),
    dataDir: joinPaths(basePath, 'data'),
    modCoversDir: joinPaths(basePath, 'data/mod-covers'),
    modAvatarsDir: joinPaths(basePath, 'data/mod-avatars'),
    bookmarks: joinPaths(basePath, 'data/bookmarks.json'),
    customEngines: joinPaths(basePath, 'data/custom-engines.json'),
    engineUpdateState: joinPaths(basePath, 'data/engineupdatestate.json'),
    v2EngineUpdateState: joinPaths(basePath, 'state/engine-updates.json'),
    playtimeDatabase: joinPaths(basePath, 'data/playtime.json'),
    installedMods: joinPaths(basePath, 'data/installed-mods.json'),
    legacyInstalledMods: joinPaths(basePath, 'data/installedmods.json'),
    featuredCache: joinPaths(basePath, 'data/featured-mods.json'),
    dataSettings: joinPaths(basePath, 'data/settings.json'),
  }
}

export async function ensureWeekBoxLibrary(
  targetBasePath?: string,
): Promise<LibraryInitializeResult> {
  const hostAdapter = initHost()
  let basePath = (
    targetBasePath || (await resolveActiveLibraryPath())
  ).replace(/\\/g, '/')

  if (!basePath || !isAbsolutePath(basePath) || basePath === WEEKBOX_LIBRARY_DIR_NAME) {
    basePath = await resolveDefaultLibraryPath()
  }

  const cached = ensuredLibraryCache.get(basePath)
  if (cached && isAbsolutePath(basePath)) {
    lastEnsuredLibrary = cached
    return cached
  }

  const existingFlight = inFlightLibraryInit.get(basePath)
  if (existingFlight) {
    return existingFlight
  }

  const initPromise = (async (): Promise<LibraryInitializeResult> => {
    const paths = getWeekBoxLibraryPaths(basePath)

    if (!isAbsolutePath(basePath) || basePath === WEEKBOX_LIBRARY_DIR_NAME || basePath === '.') {
      console.warn(
        '[WeekBox] Library base path is relative or not yet resolved to AppData. Skipping local directory creation.',
      )
      return {
        basePath,
        paths,
        createdDirectories: [],
        existingDirectories: [],
        createdFiles: [],
        existingFiles: [],
      }
    }

    const createdDirectories: string[] = []
    const existingDirectories: string[] = []
    const createdFiles: string[] = []
    const existingFiles: string[] = []

    for (const relativeDir of DEFAULT_LIBRARY_DIRECTORIES) {
      const fullDirPath = relativeDir
        ? joinPaths(basePath, relativeDir)
        : basePath
      try {
        const exists = await hostAdapter.fs.exists(fullDirPath)
        if (!exists) {
          await hostAdapter.fs.createDirectory(fullDirPath)
          createdDirectories.push(fullDirPath)
        } else {
          existingDirectories.push(fullDirPath)
        }
      } catch (err) {
        console.warn(
          `[WeekBox] Directory check/creation warning for "${fullDirPath}":`,
          err,
        )
      }
    }

    for (const [relativeFilePath, defaultData] of Object.entries(
      DEFAULT_LIBRARY_FILE_CONTENTS,
    )) {
      const fullFilePath = joinPaths(basePath, relativeFilePath)
      try {
        const exists = await hostAdapter.fs.exists(fullFilePath)
        if (!exists) {
          const content = JSON.stringify(defaultData, null, 2)
          await hostAdapter.fs.writeTextFile(fullFilePath, content)
          createdFiles.push(fullFilePath)
        } else {
          existingFiles.push(fullFilePath)
        }
      } catch (err) {
        console.error(
          `[WeekBox] File creation failed for "${fullFilePath}":`,
          err,
        )
      }
    }

    await syncV2ManifestLayout(
      hostAdapter,
      basePath,
      paths.installedMods,
      paths.legacyInstalledMods,
    )

    const result: LibraryInitializeResult = {
      basePath,
      paths,
      createdDirectories,
      existingDirectories,
      createdFiles,
      existingFiles,
    }

    if (isAbsolutePath(basePath) && basePath !== WEEKBOX_LIBRARY_DIR_NAME) {
      ensuredLibraryCache.set(basePath, result)
      lastEnsuredLibrary = result
    }

    return result
  })().finally(() => {
    inFlightLibraryInit.delete(basePath)
  })

  inFlightLibraryInit.set(basePath, initPromise)
  return initPromise
}
