import { initHost } from '@/core/host'
import {
  WEEKBOX_LIBRARY_DIR_NAME,
  WEEKBOX_CUSTOM_PATH_STORAGE_KEY,
  DEFAULT_LIBRARY_DIRECTORIES,
  DEFAULT_LIBRARY_FILE_CONTENTS,
} from './constants'
import type { WeekBoxLibraryPaths, LibraryInitializeResult } from './types'

let cachedDefaultDataPath: string | null = null
const ensuredLibraryCache = new Map<string, LibraryInitializeResult>()

/**
 * Joins path segments into a clean path with forward slashes.
 */
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
 * Retrieves the currently saved custom library path from localStorage, if any.
 */
export function getSavedCustomLibraryPath(): string | null {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(WEEKBOX_CUSTOM_PATH_STORAGE_KEY)
      return saved && saved.trim().length > 0 ? saved.trim() : null
    }
  } catch {
    // ignore
  }
  return null
}

/**
 * Saves or removes the custom library path in localStorage.
 */
export function setSavedCustomLibraryPath(path: string | null): void {
  try {
    if (typeof window !== 'undefined') {
      if (path && path.trim().length > 0) {
        localStorage.setItem(WEEKBOX_CUSTOM_PATH_STORAGE_KEY, path.trim())
      } else {
        localStorage.removeItem(WEEKBOX_CUSTOM_PATH_STORAGE_KEY)
      }
    }
  } catch (err) {
    console.warn('[WeekBox] Failed to save custom library path:', err)
  }
}

/**
 * Resolves the default base library path:
 * Uses hostAdapter.getDataPath() (Neutralino %LOCALAPPDATA% on desktop, Capacitor Directory.Data on mobile).
 * Returns `${dataPath}/${WEEKBOX_LIBRARY_DIR_NAME}`, or fallback WEEKBOX_LIBRARY_DIR_NAME.
 */
export async function resolveDefaultLibraryPath(): Promise<string> {
  if (cachedDefaultDataPath) {
    return joinPaths(cachedDefaultDataPath, WEEKBOX_LIBRARY_DIR_NAME)
  }

  const hostAdapter = initHost()
  try {
    const dataPath = await Promise.race([
      hostAdapter.getDataPath(),
      new Promise<string>((resolve) => setTimeout(() => resolve(''), 3000)),
    ])
    if (dataPath && dataPath.trim()) {
      cachedDefaultDataPath = dataPath.trim()
      return joinPaths(cachedDefaultDataPath, WEEKBOX_LIBRARY_DIR_NAME)
    }
  } catch (err) {
    console.warn('[WeekBox] hostAdapter.getDataPath() failed:', err)
  }

  return WEEKBOX_LIBRARY_DIR_NAME
}

/**
 * Resolves the active library base path.
 * Prioritizes custom user-configured path, falling back to default %LOCALAPPDATA%/WeekBoxLibrary.
 */
export async function resolveActiveLibraryPath(): Promise<string> {
  const custom = getSavedCustomLibraryPath()
  if (custom) {
    return custom.replace(/\\/g, '/')
  }
  return await resolveDefaultLibraryPath()
}

/**
 * Generates an object with all absolute/full paths inside the library given a base path.
 */
export function getWeekBoxLibraryPaths(basePath: string): WeekBoxLibraryPaths {
  return {
    root: basePath,
    settings: joinPaths(basePath, 'settings.json'),
    storageManifest: joinPaths(basePath, 'storage-manifest.json'),
    modsDir: joinPaths(basePath, 'mods'),
    enginesDir: joinPaths(basePath, 'engines'),
    dataDir: joinPaths(basePath, 'data'),
    modCoversDir: joinPaths(basePath, 'data/mod-covers'),
    bookmarks: joinPaths(basePath, 'data/bookmarks.json'),
    engineUpdateState: joinPaths(basePath, 'data/engineupdatestate.json'),
    installedMods: joinPaths(basePath, 'data/installedmods.json'),
    dataSettings: joinPaths(basePath, 'data/settings.json'),
  }
}

/**
 * Ensures that the complete WeekBoxLibrary directory and file structure exists.
 * Creates folders and files only if they do not already exist.
 */
export async function ensureWeekBoxLibrary(
  targetBasePath?: string,
): Promise<LibraryInitializeResult> {
  const hostAdapter = initHost()
  const basePath = (
    targetBasePath || (await resolveActiveLibraryPath())
  ).replace(/\\/g, '/')

  const cached = ensuredLibraryCache.get(basePath)
  if (cached && basePath !== WEEKBOX_LIBRARY_DIR_NAME) {
    return cached
  }

  const paths = getWeekBoxLibraryPaths(basePath)

  const createdDirectories: string[] = []
  const existingDirectories: string[] = []
  const createdFiles: string[] = []
  const existingFiles: string[] = []

  // 1. Ensure all directories exist in hierarchical order
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

  // 2. Ensure all default JSON files exist
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

  const result: LibraryInitializeResult = {
    basePath,
    paths,
    createdDirectories,
    existingDirectories,
    createdFiles,
    existingFiles,
  }

  if (basePath !== WEEKBOX_LIBRARY_DIR_NAME) {
    ensuredLibraryCache.set(basePath, result)
  }

  return result
}
