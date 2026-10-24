import { http } from '../http'
import { GB_BASE_URL, FNF_GAME_ID, ENGINE_CATEGORIES } from '../constants'
import type { GameBananaMod, GameBananaRawRecord } from '../types'
import {
  getTimeAgo,
  getEngineId,
  getEngineIcon,
  isExcluded,
  extractAuthors,
  extractCreditGroups,
  extractThumbnail,
  extractPreviewMedia,
  extractUserId,
  extractUserPfp,
  checkIsNsfw,
} from '../utils'
import { sanitizeHtml, htmlToPlainText } from '../sanitize'
import {
  fetchRipeRecords,
  fetchPopularRecords,
  fetchSearchRecords,
} from '../algorithms'
import { getModById } from './getModById'

export type ModFilter = 'popular' | 'new' | 'ripe' | 'updated'

function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
}

/**
 * Fetches a paginated list of mods filtered by sort type, engine categories, or search query.
 */
export async function getMods(
  filter: ModFilter = 'ripe',
  page = 1,
  perPage = 16,
  engineIds: string[] | string | null = null,
  searchQuery = '',
): Promise<GameBananaMod[]> {
  let rawRecords: GameBananaRawRecord[] = []

  const enginesArray = Array.isArray(engineIds)
    ? engineIds
    : engineIds
      ? [engineIds]
      : ['all']
  const isAll =
    enginesArray.length === 0 ||
    (enginesArray.length === 1 && enginesArray[0] === 'all')

  if (searchQuery.trim().length > 0) {
    const rawIdMatch = searchQuery
      .trim()
      .match(/^(?:https?:\/\/gamebanana\.com\/mods\/|mods\/)?(\d+)(?:[/?#]|$)/i)

    if (rawIdMatch) {
      if (page === 1) {
        const modId = Number(rawIdMatch[1])
        const singleMod = await getModById(modId)
        if (
          singleMod &&
          (isAll ||
            (singleMod.engineId && enginesArray.includes(singleMod.engineId)))
        ) {
          return [singleMod]
        }
      } else {
        return []
      }
    }

    rawRecords = await fetchSearchRecords(
      searchQuery,
      enginesArray,
      filter,
      page,
      perPage,
    )
  } else if (filter === 'popular') {
    rawRecords = await fetchPopularRecords(
      isAll ? null : enginesArray,
      9999,
      page * perPage,
    )
  } else if (filter === 'ripe') {
    rawRecords = await fetchRipeRecords(
      isAll ? null : enginesArray,
      9999,
      page * perPage,
    )
  } else if (filter === 'new' || filter === 'updated') {
    let categoryIds = Object.keys(ENGINE_CATEGORIES).map(Number)
    if (!isAll) {
      categoryIds = enginesArray
        .map((id) => {
          const match = Object.entries(ENGINE_CATEGORIES).find(
            ([, cat]) => cat.id === id,
          )
          return match ? Number(match[0]) : -1
        })
        .filter((id) => id !== -1)
    }

    const sortStr =
      filter === 'updated' ? 'Generic_LatestUpdated' : 'Generic_Newest'

    const requests = categoryIds.map(async (catId) => {
      const url = `${GB_BASE_URL}/Mod/Index?_nPage=${page}&_nPerpage=${perPage}&_aFilters[Generic_Game]=${FNF_GAME_ID}&_aFilters[Generic_Category]=${catId}&_sSort=${sortStr}`
      try {
        const res = await http.fetchJson<{ _aRecords?: GameBananaRawRecord[] }>(url)
        const records = res?._aRecords || []
        return records.map((r) => ({ ...r, __injectedCategoryId: catId }))
      } catch {
        return []
      }
    })

    const allRecords = (await Promise.all(requests)).flat()

    const uniqueRecords = Array.from(
      new Map(allRecords.map((r) => [r._idRow, r])).values(),
    )

    rawRecords = uniqueRecords
      .filter((r) => !isExcluded(r))
      .sort((a, b) => {
        const timeA =
          filter === 'updated'
            ? a._tsDateUpdated || a._tsDateModified || a._tsDateAdded || 0
            : a._tsDateAdded || 0
        const timeB =
          filter === 'updated'
            ? b._tsDateUpdated || b._tsDateModified || b._tsDateAdded || 0
            : b._tsDateAdded || 0
        return Number(timeB) - Number(timeA)
      })
  }

  if (searchQuery.trim().length === 0) {
    if (filter === 'new' || filter === 'updated') {
      rawRecords = rawRecords.slice(0, perPage)
    } else {
      rawRecords = rawRecords.slice((page - 1) * perPage, page * perPage)
    }
  }

  if (rawRecords.length === 0) return []

  const CHUNK_SIZE = 15
  let multiData: GameBananaRawRecord[] = []

  try {
    const chunkPromises: Promise<GameBananaRawRecord[]>[] = []
    for (let i = 0; i < rawRecords.length; i += CHUNK_SIZE) {
      const chunk = rawRecords.slice(i, i + CHUNK_SIZE)
      const modIds = chunk.map((r) => r._idRow).join(',')
      const multiUrl = `${GB_BASE_URL}/Mod/Multi?_csvRowIds=${modIds}&_csvProperties=_idRow,_sName,_nLikeCount,_nViewCount,_nDownloadCount,_sDescription,_sText,_aCredits,_aCategory,_aSuperCategory,_aRootCategory,_aPreviewMedia`

      chunkPromises.push(http.fetchJson<GameBananaRawRecord[]>(multiUrl))
    }

    const chunkResults = await Promise.all(chunkPromises)
    multiData = chunkResults.flat()
  } catch (e) {
    console.error('GameBanana Mod/Multi failed:', e)
  }

  const multiMap = new Map<number, GameBananaRawRecord>()
  for (const d of multiData) {
    if (d && d._idRow) {
      multiMap.set(d._idRow, d)
    }
  }

  let finalMods: GameBananaMod[] = rawRecords.map((mod) => {
    const meta = multiMap.get(mod._idRow)
    let finalEngineId = mod.__resolvedEngineId || getEngineId(mod)
    if (finalEngineId === 'unknown') finalEngineId = getEngineId(meta)
    const submittedAt = mod._tsDateAdded || 0

    return {
      id: mod._idRow,
      gameId: FNF_GAME_ID,
      title: mod._sName || 'Unknown Mod',
      description: htmlToPlainText(
        meta?._sDescription || meta?._sText || '',
      ),
      htmlBody: sanitizeHtml(
        meta?._sText || meta?._sDescription || '',
      ),
      author: mod._aSubmitter?._sName || 'Unknown Creator',
      userId: extractUserId(mod),
      userPfp: extractUserPfp(mod),
      authors: extractAuthors(meta?._aCredits),
      credits: extractCreditGroups(meta?._aCredits),
      likes: mod._nLikeCount || meta?._nLikeCount || 0,
      views: mod._nViewCount || meta?._nViewCount || 0,
      downloads: meta?._nDownloadCount || 0,
      submittedAt,
      updatedAt: mod._tsDateUpdated || submittedAt,
      timeAgo: getTimeAgo(submittedAt),
      engineId: finalEngineId,
      engineIcon: getEngineIcon(finalEngineId),
      thumbnail: extractThumbnail(mod),
      previewMedia: extractPreviewMedia(meta),
      isNsfw: checkIsNsfw(mod),
    }
  })

  if (searchQuery.trim().length > 0 && !isAll) {
    finalMods = finalMods.filter(
      (m) => m.engineId && enginesArray.includes(m.engineId),
    )
  }

  if (isMobile()) {
    finalMods = finalMods.filter((m) => {
      const eid = String(m.engineId || '').toLowerCase()
      const title = String(m.title || '').toLowerCase()
      return eid !== 'executable' && eid !== '3827' && !title.endsWith('.exe')
    })
  }

  return finalMods
}
