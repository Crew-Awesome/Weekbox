import type { InstalledModRecord } from '@/core/mods'
import type { ModItem } from '@/ui/mod-details-modal/types'
import type { LibrarySortOption } from './types'

export function resolveModThumbnail(
  mod?: Partial<InstalledModRecord> | Partial<ModItem> | null,
): string {
  if (!mod) return '/imgs/images/placeholder-mini.webp'

  const candidates = [
    mod.thumbnail,
    mod.image,
    (mod as ModItem).img,
    mod.coverPath,
    mod.localCoverPath,
  ].filter(
    (url): url is string =>
      Boolean(url && typeof url === 'string' && url.trim().length > 0),
  )

  const remote = candidates.find((url) => /^https?:\/\//i.test(url.trim()))
  if (remote) return remote.trim()

  const dataOrBlob = candidates.find((url) => /^(data|blob):/i.test(url.trim()))
  if (dataOrBlob) return dataOrBlob.trim()

  for (const raw of candidates) {
    const trimmed = raw.trim().replace(/\\/g, '/')
    if (trimmed.includes('mod-covers/')) {
      const fileName = trimmed.split('mod-covers/').pop()
      if (fileName) {
        return `/mod-covers/${fileName}`
      }
    }
    if (trimmed.startsWith('/')) {
      return trimmed
    }
  }

  return '/imgs/images/placeholder-mini.webp'
}

export function installedRecordToModItem(record: InstalledModRecord): ModItem {
  const title = record.title || record.name || 'Unnamed Mod'
  const imgUrl = resolveModThumbnail(record)
  const remoteThumbnail =
    (record.thumbnail && record.thumbnail.startsWith('http')
      ? record.thumbnail
      : undefined) ||
    (record.image && record.image.startsWith('http')
      ? record.image
      : undefined) ||
    imgUrl

  return {
    id: record.id,
    title,
    name: record.name || title,
    description: record.description || '',
    htmlBody: record.htmlBody,
    author: record.author || 'Unknown Author',
    userPfp: record.userPfp,
    image: remoteThumbnail,
    img: imgUrl,
    thumbnail: remoteThumbnail,
    icon: record.icon,
    engineId: record.engineId,
    engineName: record.engineName,
    previewMedia:
      record.previewMedia && record.previewMedia.length > 0
        ? record.previewMedia
        : imgUrl
          ? [imgUrl]
          : [],
    installedAt: record.installedAt,
    updatedAt: record.updatedAt,
    submittedAt: record.submittedAt,
    downloadedFileId: record.downloadedFileId,
    installedFileId: record.installedFileId,
    downloadUrl: record.downloadUrl,
    categoryName: record.categoryName,
    views: record.views,
    likes: record.likes,
    downloads: record.downloads,
    coverPath: record.coverPath,
    localCoverPath: record.localCoverPath,
    isInstalled: Boolean(record.installPath),
  }
}

function matchesEngineFilter(m: InstalledModRecord, filterStr: string): boolean {
  const filterLower = filterStr.toLowerCase()
  const isFilterVSlice =
    filterLower === 'vslice' ||
    filterLower === 'v-slice' ||
    filterLower === 'base' ||
    filterLower === 'basegame' ||
    filterLower === 'base game' ||
    filterLower === 'juego base'

  const eId = (m.engineId || '').toLowerCase()
  const eName = (m.engineName || '').toLowerCase()
  const defId = (m.defaultEngineId || '').toLowerCase()
  const defName = (m.defaultEngineName || '').toLowerCase()
  const catName = (m.categoryName || '').toLowerCase()

  if (isFilterVSlice) {
    if (
      m.categoryId === 43777 ||
      m.categoryId === 29202 ||
      eId === 'vslice' ||
      eId === 'v-slice' ||
      eId === 'base' ||
      eId === 'basegame' ||
      defId === 'vslice' ||
      eName.includes('v-slice') ||
      eName.includes('vslice') ||
      eName.includes('base game') ||
      eName.includes('basegame') ||
      eName.includes('juego base') ||
      eName.includes('(base)') ||
      catName.includes('base') ||
      catName.includes('vslice')
    ) {
      return true
    }
  }

  return (
    eId === filterLower ||
    eName === filterLower ||
    defId === filterLower ||
    defName === filterLower
  )
}

export function filterAndSortInstalledMods(
  mods: InstalledModRecord[],
  query: string,
  engineFilter: string | string[],
  sortBy: LibrarySortOption,
  favoriteIds: Set<string>,
  bookmarkIds: Set<string>,
  filterFavorites: boolean,
  filterBookmarks: boolean,
): InstalledModRecord[] {
  let list = [...mods]

  const cleanQuery = query.trim().toLowerCase()
  if (cleanQuery) {
    list = list.filter((m) => {
      const title = (m.title || m.name || '').toLowerCase()
      const author = (m.author || '').toLowerCase()
      const engine = (m.engineName || m.engineId || '').toLowerCase()
      const defaultEng = (m.defaultEngineName || m.defaultEngineId || '').toLowerCase()
      const desc = (m.description || '').toLowerCase()
      const folder = (m.folderName || '').toLowerCase()
      return (
        title.includes(cleanQuery) ||
        author.includes(cleanQuery) ||
        engine.includes(cleanQuery) ||
        defaultEng.includes(cleanQuery) ||
        desc.includes(cleanQuery) ||
        folder.includes(cleanQuery)
      )
    })
  }

  const engines = Array.isArray(engineFilter) ? engineFilter : [engineFilter]
  const isAllEngines =
    engines.length === 0 || (engines.length === 1 && engines[0] === 'all')

  if (!isAllEngines) {
    list = list.filter((m) =>
      engines.some((eng) => matchesEngineFilter(m, eng)),
    )
  }

  if (filterFavorites && filterBookmarks) {
    list = list.filter((m) => {
      const isFav =
        favoriteIds.has(String(m.id)) ||
        (m.modId !== undefined && favoriteIds.has(String(m.modId)))
      const isBm =
        bookmarkIds.has(String(m.id)) ||
        (m.modId !== undefined && bookmarkIds.has(String(m.modId)))
      return isFav || isBm
    })
  } else if (filterFavorites) {
    list = list.filter(
      (m) =>
        favoriteIds.has(String(m.id)) ||
        (m.modId !== undefined && favoriteIds.has(String(m.modId))),
    )
  } else if (filterBookmarks) {
    list = list.filter(
      (m) =>
        bookmarkIds.has(String(m.id)) ||
        (m.modId !== undefined && bookmarkIds.has(String(m.modId))),
    )
  }

  list.sort((a, b) => {
    switch (sortBy) {
      case 'recent': {
        const dateA = a.installedAt || 0
        const dateB = b.installedAt || 0
        return dateB - dateA
      }
      case 'name': {
        const nameA = (a.title || a.name || '').toLowerCase()
        const nameB = (b.title || b.name || '').toLowerCase()
        return nameA.localeCompare(nameB)
      }
      case 'size': {
        const sizeA = a.fileSize || 0
        const sizeB = b.fileSize || 0
        return sizeB - sizeA
      }
      case 'engine': {
        const engA = (a.engineName || a.engineId || '').toLowerCase()
        const engB = (b.engineName || b.engineId || '').toLowerCase()
        return engA.localeCompare(engB)
      }
      default:
        return 0
    }
  })

  return list
}
