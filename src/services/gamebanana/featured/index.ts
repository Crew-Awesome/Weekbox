export * from './types'
export * from './featured'

import { initHost } from '@/core/host'
import { ensureWeekBoxLibrary, isAbsolutePath } from '@/core/storage/weekbox-library'
import type { GameBananaMod } from '../types'
import { FeaturedService, computeFeaturedSignature } from './featured'
import type { StoredFeaturedCache } from './types'

export const FEATURED_UPDATED_EVENT = 'wb:featured-mods-updated'
const FEATURED_STORAGE_KEY = 'wbr:featured_mods_cache'

const featuredServiceInstance = new FeaturedService()

let featuredModsCache: GameBananaMod[] | null = null
let featuredSignatureCache = ''
let inFlightFeaturedMods: Promise<GameBananaMod[]> | null = null

function readLocalStorageFeaturedCache(): StoredFeaturedCache | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = window.localStorage.getItem(FEATURED_STORAGE_KEY)
    if (!raw || !raw.trim()) return null
    const parsed = JSON.parse(raw) as StoredFeaturedCache
    if (parsed && Array.isArray(parsed.mods) && parsed.mods.length > 0) {
      return parsed
    }
  } catch {
  }
  return null
}

async function readDiskFeaturedCache(): Promise<StoredFeaturedCache | null> {
  try {
    const lib = await ensureWeekBoxLibrary()
    if (!lib.basePath || !isAbsolutePath(lib.basePath)) return null
    const host = initHost()
    if (!(await host.fs.exists(lib.paths.featuredCache))) return null
    const raw = await host.fs.readTextFile(lib.paths.featuredCache)
    if (!raw || !raw.trim()) return null
    const parsed = JSON.parse(raw) as StoredFeaturedCache
    if (parsed && Array.isArray(parsed.mods) && parsed.mods.length > 0) {
      return parsed
    }
  } catch {
  }
  return null
}

async function writeLocalFeaturedCache(
  mods: GameBananaMod[],
  signature: string,
): Promise<void> {
  const payload: StoredFeaturedCache = {
    version: 1,
    signature,
    updatedAt: Date.now(),
    mods,
  }
  const json = JSON.stringify(payload, null, 2)

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(FEATURED_STORAGE_KEY, json)
    }
  } catch {
  }

  try {
    const lib = await ensureWeekBoxLibrary()
    if (lib.basePath && isAbsolutePath(lib.basePath)) {
      await initHost().fs.writeTextFile(lib.paths.featuredCache, json)
    }
  } catch {
  }
}

function emitFeaturedUpdated(mods: GameBananaMod[]): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(FEATURED_UPDATED_EVENT, { detail: mods }))
  }
}

export function getCachedFeaturedMods(): GameBananaMod[] | null {
  if (featuredModsCache && featuredModsCache.length > 0) {
    return featuredModsCache
  }
  const lsCache = readLocalStorageFeaturedCache()
  if (lsCache && lsCache.mods.length > 0) {
    featuredModsCache = lsCache.mods
    featuredSignatureCache = lsCache.signature || computeFeaturedSignature(lsCache.mods)
    return featuredModsCache
  }
  return null
}

/**
 * Loads locally persisted featured mods immediately and checks GameBanana's
 * Featured API for updates, persisting and broadcasting changes automatically.
 */
export const getFeaturedMods = async (
  forceRefresh = false,
): Promise<GameBananaMod[]> => {
  if (!featuredModsCache || featuredModsCache.length === 0) {
    const lsCache = readLocalStorageFeaturedCache()
    if (lsCache) {
      featuredModsCache = lsCache.mods
      featuredSignatureCache = lsCache.signature || computeFeaturedSignature(lsCache.mods)
    } else {
      const diskCache = await readDiskFeaturedCache()
      if (diskCache) {
        featuredModsCache = diskCache.mods
        featuredSignatureCache =
          diskCache.signature || computeFeaturedSignature(diskCache.mods)
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(
              FEATURED_STORAGE_KEY,
              JSON.stringify(diskCache),
            )
          }
        } catch {
        }
        emitFeaturedUpdated(diskCache.mods)
      }
    }
  }

  if (!forceRefresh && inFlightFeaturedMods) {
    return inFlightFeaturedMods
  }

  const req = featuredServiceInstance
    .getCarousel()
    .then(async (liveMods) => {
      if (liveMods && liveMods.length > 0) {
        const nextSig = computeFeaturedSignature(liveMods)
        if (nextSig !== featuredSignatureCache || !featuredModsCache) {
          featuredModsCache = liveMods
          featuredSignatureCache = nextSig
          await writeLocalFeaturedCache(liveMods, nextSig)
          emitFeaturedUpdated(liveMods)
        }
        return featuredModsCache
      }
      return featuredModsCache ?? []
    })
    .catch(() => featuredModsCache ?? [])
    .finally(() => {
      if (inFlightFeaturedMods === req) {
        inFlightFeaturedMods = null
      }
    })

  inFlightFeaturedMods = req
  if (!forceRefresh && featuredModsCache && featuredModsCache.length > 0) {
    return featuredModsCache
  }
  return req
}
