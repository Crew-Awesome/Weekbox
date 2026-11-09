import { initHost } from '@/core/host'
import { ensureWeekBoxLibrary } from '@/core/storage/weekbox-library'
import {
  BOOKMARKS_CHANGED_EVENT,
  FAVORITES_CHANGED_EVENT,
  emitEvent,
} from './mod-registry-helpers'

const FAVORITES_STORAGE_KEY = 'wbr:favorite_mods'

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
