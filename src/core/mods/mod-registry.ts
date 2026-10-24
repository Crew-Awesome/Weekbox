import { initHost, callDevFsBridge } from '@/core/host'
import { ensureWeekBoxLibrary, joinPaths } from '@/core/storage'
import { extractBaseModId } from './mod-filesystem'
import type { InstalledModRecord } from './types'

const FAVORITES_STORAGE_KEY = 'wbr:favorite_mods'

export const MODS_CHANGED_EVENT = 'wb:mods-changed'
export const BOOKMARKS_CHANGED_EVENT = 'wb:bookmarks-changed'
export const FAVORITES_CHANGED_EVENT = 'wb:favorites-changed'

function emitEvent(name: string, detail?: unknown): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name, { detail }))
  }
}

export function matchesModId(
  item: InstalledModRecord,
  targetModId: string | number,
): boolean {
  const targetStr = String(targetModId)
  const targetBase = extractBaseModId(targetModId)
  const itemStr = String(item.id)
  const itemBase = extractBaseModId(item.id)

  if (itemStr === targetStr || itemBase === targetBase) {
    return true
  }
  if (item.modId !== undefined && String(item.modId) === targetBase) {
    return true
  }
  if (item.sourceUrl && item.sourceUrl.endsWith(`/${targetBase}`)) {
    return true
  }
  return false
}

/**
 * Reads all installed mods from `WeekBoxLibrary/data/installedmods.json`.
 */
export async function getInstalledMods(): Promise<InstalledModRecord[]> {
  const host = initHost()
  try {
    const { paths } = await ensureWeekBoxLibrary()
    const exists = await host.fs.exists(paths.installedMods)
    if (!exists) return []
    const raw = await host.fs.readTextFile(paths.installedMods)
    if (!raw || !raw.trim()) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return (parsed as InstalledModRecord[]).map((item) => ({
      ...item,
      title: item.title || item.name,
      installPath:
        item.installPath ||
        (item.folderName ? joinPaths(paths.modsDir, item.folderName) : ''),
    }))
  } catch (err) {
    console.warn('[WeekBox] Failed to read installedmods.json:', err)
    return []
  }
}

/**
 * Finds an installed mod record by its GameBanana / internal mod ID.
 */
export async function getInstalledModById(
  modId: string | number | undefined | null,
): Promise<InstalledModRecord | null> {
  if (modId === undefined || modId === null) return null
  const list = await getInstalledMods()
  return list.find((item) => matchesModId(item, modId)) || null
}

/**
 * Saves the complete array of installed mods to `WeekBoxLibrary/data/installedmods.json`.
 */
export async function saveInstalledMods(
  records: InstalledModRecord[],
): Promise<void> {
  const host = initHost()
  const { paths } = await ensureWeekBoxLibrary()
  await host.fs.writeTextFile(
    paths.installedMods,
    JSON.stringify(records, null, 2),
  )
  emitEvent(MODS_CHANGED_EVENT, records)
}

/**
 * Optionally downloads and caches the mod's cover image into `WeekBoxLibrary/data/mod-covers`.
 */
export async function cacheModCoverImage(
  compositeId: string | number,
  imageUrl?: string,
): Promise<{ fullPath: string; relativeCoverPath: string } | undefined> {
  if (!imageUrl || !imageUrl.startsWith('http')) return undefined
  const host = initHost()

  try {
    const { paths } = await ensureWeekBoxLibrary()
    // Cover resolution requirement: always store as .webp
    const fileName = `${String(compositeId)}.webp`
    const fullPath = joinPaths(paths.modCoversDir, fileName)
    const relativeCoverPath = `mod-covers/${fileName}`

    const bridgeRes = await callDevFsBridge<{ ok?: boolean }>({
      action: 'cacheCover',
      url: imageUrl,
      imageUrl,
      destPath: fullPath,
    })
    if (bridgeRes?.ok) {
      return { fullPath, relativeCoverPath }
    }

    if (host.platform === 'desktop') {
      await host.downloadFile({
        url: imageUrl,
        destinationPath: fullPath,
      })
      return { fullPath, relativeCoverPath }
    }
  } catch {
    // Non-fatal: keep remote cover URL
  }
  return undefined
}

/**
 * Registers or updates an installed mod in `WeekBoxLibrary/data/installedmods.json`
 * and writes `mod_url.txt` and `mod.json` inside its installation directory.
 */
export async function registerInstalledMod(
  record: InstalledModRecord,
): Promise<InstalledModRecord> {
  const host = initHost()
  const currentList = await getInstalledMods()

  const cachedCover = await cacheModCoverImage(
    record.id,
    record.image || record.thumbnail,
  )
  const enrichedRecord: InstalledModRecord = {
    ...record,
    coverPath: cachedCover?.relativeCoverPath || record.coverPath,
    localCoverPath: cachedCover?.fullPath || record.localCoverPath,
  }

  const existingIdx = currentList.findIndex((item) =>
    matchesModId(item, record.id),
  )
  let nextList: InstalledModRecord[]
  if (existingIdx >= 0) {
    nextList = [...currentList]
    nextList[existingIdx] = {
      ...currentList[existingIdx],
      ...enrichedRecord,
    }
  } else {
    nextList = [enrichedRecord, ...currentList]
  }

  await saveInstalledMods(nextList)

  // Also persist `mod_url.txt` and `mod.json` inside WeekBoxLibrary/mods/<folderName>/
  try {
    if (enrichedRecord.installPath) {
      const dirExists = await host.fs.exists(enrichedRecord.installPath)
      if (!dirExists) {
        await host.fs.createDirectory(enrichedRecord.installPath)
      }
      if (enrichedRecord.downloadUrl) {
        const modUrlPath = joinPaths(enrichedRecord.installPath, 'mod_url.txt')
        await host.fs.writeTextFile(modUrlPath, enrichedRecord.downloadUrl)
      }
      const modJsonPath = joinPaths(enrichedRecord.installPath, 'mod.json')
      await host.fs.writeTextFile(
        modJsonPath,
        JSON.stringify(enrichedRecord, null, 2),
      )
    }
  } catch (err) {
    console.warn('[WeekBox] Could not write per-folder mod metadata:', err)
  }

  return enrichedRecord
}

/**
 * Updates metadata fields (such as custom title, description, or selected engine) for an installed mod.
 */
export async function updateInstalledModMetadata(
  modId: string | number,
  updates: Partial<InstalledModRecord>,
): Promise<InstalledModRecord | null> {
  const host = initHost()
  const list = await getInstalledMods()
  const index = list.findIndex((item) => matchesModId(item, modId))

  if (index === -1) return null

  const updatedRecord: InstalledModRecord = {
    ...list[index],
    ...updates,
  }
  const nextList = [...list]
  nextList[index] = updatedRecord
  await saveInstalledMods(nextList)

  try {
    if (updatedRecord.installPath) {
      const modJsonPath = joinPaths(updatedRecord.installPath, 'mod.json')
      await host.fs.writeTextFile(
        modJsonPath,
        JSON.stringify(updatedRecord, null, 2),
      )
    }
  } catch {
    // ignore
  }

  return updatedRecord
}

/**
 * Uninstalls a mod by removing its directory inside `WeekBoxLibrary/mods` and removing its entry
 * from `WeekBoxLibrary/data/installedmods.json`.
 */
export async function uninstallModById(
  modId: string | number,
): Promise<boolean> {
  const host = initHost()
  const list = await getInstalledMods()
  const existing = list.find((item) => matchesModId(item, modId))
  const { paths } = await ensureWeekBoxLibrary()
  const baseId = extractBaseModId(modId)

  // 1. Remove mod installation directory on disk
  if (existing?.installPath) {
    try {
      const dirExists = await host.fs.exists(existing.installPath)
      if (dirExists) {
        await host.fs.remove(existing.installPath)
      }
    } catch (err) {
      console.warn('[WeekBox] Failed to remove mod directory on disk:', err)
    }
  }

  // 2. Remove mod cover thumbnail(s)
  const candidateCovers: string[] = []
  if (existing?.coverPath) {
    candidateCovers.push(joinPaths(paths.root, 'data', existing.coverPath))
    candidateCovers.push(
      joinPaths(
        paths.modCoversDir,
        existing.coverPath.replace(/^mod-covers[/\\]/, ''),
      ),
    )
  }
  if (existing?.localCoverPath) {
    candidateCovers.push(existing.localCoverPath)
  }
  if (existing?.id) {
    candidateCovers.push(
      joinPaths(paths.modCoversDir, `${String(existing.id)}.webp`),
    )
  }
  candidateCovers.push(joinPaths(paths.modCoversDir, `${baseId}.webp`))
  candidateCovers.push(joinPaths(paths.modCoversDir, `mod_${baseId}.webp`))

  for (const coverPath of candidateCovers) {
    try {
      const exists = await host.fs.exists(coverPath)
      if (exists) {
        await host.fs.remove(coverPath)
      }
    } catch {
      // ignore
    }
  }

  // Also sweep modCoversDir for any files associated with this mod ID
  try {
    const coverEntries = await host.fs.readDirectory(paths.modCoversDir)
    for (const entry of coverEntries) {
      const lower = entry.name.toLowerCase()
      if (
        lower.startsWith(`${baseId}.`) ||
        lower.startsWith(`${baseId}--`) ||
        lower.startsWith(`mod_${baseId}.`) ||
        (existing?.id &&
          lower.startsWith(String(existing.id).toLowerCase()))
      ) {
        try {
          await host.fs.remove(entry.path)
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  // 3. Remove entry from installedmods.json
  const nextList = list.filter((item) => !matchesModId(item, modId))
  await saveInstalledMods(nextList)
  return true
}

/**
 * Reads bookmarked mods from `WeekBoxLibrary/data/bookmarks.json`.
 */
export async function getBookmarkedMods(): Promise<Array<string | number>> {
  const host = initHost()
  try {
    const { paths } = await ensureWeekBoxLibrary()
    const exists = await host.fs.exists(paths.bookmarks)
    if (!exists) return []
    const raw = await host.fs.readTextFile(paths.bookmarks)
    if (!raw || !raw.trim()) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Toggles a mod ID in `WeekBoxLibrary/data/bookmarks.json` and returns the new bookmarked state.
 */
export async function toggleModBookmark(
  modId: string | number,
): Promise<boolean> {
  const host = initHost()
  const { paths } = await ensureWeekBoxLibrary()
  const current = await getBookmarkedMods()
  const target = String(modId)
  const exists = current.some((id) => String(id) === target)

  const next = exists
    ? current.filter((id) => String(id) !== target)
    : [...current, modId]

  await host.fs.writeTextFile(paths.bookmarks, JSON.stringify(next, null, 2))
  emitEvent(BOOKMARKS_CHANGED_EVENT, next)
  return !exists
}

/**
 * Reads favorite mod IDs from localStorage.
 */
export function getFavoriteModIds(): Set<string> {
  try {
    if (typeof window === 'undefined') return new Set()
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return new Set(parsed.map((id) => String(id)))
    }
  } catch {
    // ignore
  }
  return new Set()
}

/**
 * Toggles a mod ID in favorites and returns the new favorited state.
 */
export function toggleModFavoriteId(modId: string | number): boolean {
  const current = getFavoriteModIds()
  const target = String(modId)
  const nextState = !current.has(target)
  if (nextState) {
    current.add(target)
  } else {
    current.delete(target)
  }
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...current]))
  } catch {
    // ignore
  }
  emitEvent(FAVORITES_CHANGED_EVENT, [...current])
  return nextState
}
