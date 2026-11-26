import { initHost } from '@/core/host'
import { ensureWeekBoxLibrary } from '@/core/storage/weekbox-library'
import { readV2SettingsFromLibrary } from '@/core/storage/v2-storage-compat'
import {
  BOOKMARKS_CHANGED_EVENT,
  FAVORITES_CHANGED_EVENT,
  emitEvent,
} from './mod-registry-helpers'
import { getInstalledMods } from './mod-registry-scanner'

const FAVORITES_STORAGE_KEY = 'wbr:favorite_mods'

export interface V2BookmarkEntry {
  id: string
  source: string
  title: string
  author?: string
  image?: string | null
  engineId?: string | null
  likes?: number
  views?: number
  downloads?: number
  followers?: number
  timeAgo?: string
  sourceUrl?: string | null
}

function extractBookmarkId(entry: unknown): string | number | null {
  if (typeof entry === 'string' || typeof entry === 'number') {
    const str = String(entry).trim()
    return str ? entry : null
  }
  if (entry && typeof entry === 'object' && 'id' in entry) {
    const rawId = (entry as { id?: unknown }).id
    if (typeof rawId === 'string' || typeof rawId === 'number') {
      return String(rawId).trim() ? rawId : null
    }
  }
  return null
}

async function readRawBookmarkEntries(): Promise<unknown[]> {
  const host = initHost()
  try {
    const { basePath, paths } = await ensureWeekBoxLibrary()
    if (await host.fs.exists(paths.bookmarks)) {
      const raw = await host.fs.readTextFile(paths.bookmarks)
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    }

    const v2Settings = await readV2SettingsFromLibrary(host, basePath)
    const rawBookmarksSetting = v2Settings?.rawSettings?.modBookmarks?.value
    if (typeof rawBookmarksSetting === 'string' && rawBookmarksSetting.trim()) {
      const parsed = JSON.parse(rawBookmarksSetting)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
  }
  return []
}

/**
 * Reads bookmarked mod IDs, supporting both WeekBox v2 (`main`) object entries
 * and legacy primitive ID arrays.
 */
export async function getBookmarkedMods(): Promise<Array<string | number>> {
  const rawEntries = await readRawBookmarkEntries()
  const ids: Array<string | number> = []
  const seen = new Set<string>()
  for (const entry of rawEntries) {
    const id = extractBookmarkId(entry)
    if (id !== null) {
      const key = String(id)
      if (!seen.has(key)) {
        seen.add(key)
        ids.push(id)
      }
    }
  }
  return ids
}

export async function toggleModBookmark(
  modId: string | number,
): Promise<boolean> {
  const host = initHost()
  const { paths } = await ensureWeekBoxLibrary()
  const rawEntries = await readRawBookmarkEntries()
  const target = String(modId)
  const exists = rawEntries.some(
    (entry) => String(extractBookmarkId(entry) ?? '') === target,
  )

  let nextEntries: unknown[]
  if (exists) {
    nextEntries = rawEntries.filter(
      (entry) => String(extractBookmarkId(entry) ?? '') !== target,
    )
  } else {
    const installed = await getInstalledMods({ persistChanges: false }).catch(
      () => [],
    )
    const matched = installed.find(
      (m) => String(m.id) === target || String(m.modId ?? '') === target,
    )
    const newEntry: V2BookmarkEntry = matched
      ? {
          id: target,
          source: matched.source || 'gamebanana',
          title: matched.title || matched.name || target,
          author: matched.author || '',
          image: matched.thumbnail || matched.image || null,
          engineId: matched.engineId || null,
          likes: Number(matched.likes) || 0,
          views: Number(matched.views) || 0,
          downloads: Number(matched.downloads) || 0,
          sourceUrl: matched.sourceUrl || null,
        }
      : {
          id: target,
          source: 'gamebanana',
          title: target,
        }
    nextEntries = [newEntry, ...rawEntries]
  }

  await host.fs.writeTextFile(paths.bookmarks, JSON.stringify(nextEntries, null, 2))
  const nextIds = nextEntries
    .map(extractBookmarkId)
    .filter((id): id is string | number => id !== null)
  emitEvent(BOOKMARKS_CHANGED_EVENT, nextIds)
  return !exists
}

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
  }
  return new Set()
}

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
  }
  emitEvent(FAVORITES_CHANGED_EVENT, [...current])
  return nextState
}
