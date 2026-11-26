import { http } from '../http'
import { FNF_GAME_ID, GB_BASE_URL } from '../constants'
import {
  checkIsNsfw,
  extractAuthors,
  extractPreviewMedia,
  extractThumbnail,
  extractUserId,
  extractUserPfp,
  getEngineIcon,
  getEngineId,
  getTimeAgo,
  isExcluded,
  upgradeGameBananaImageUrl,
} from '../utils'
import { sanitizeHtml, htmlToPlainText } from '../sanitize'
import type { GameBananaMod, GameBananaRawRecord } from '../types'
import type { GameBananaFeaturingEntry } from './types'
import { getMods } from '../api/getMods'

export const GB_FEATURED_API_URL = `${GB_BASE_URL}/Util/List/Featured?_idGameRow=${FNF_GAME_ID}&_nPerpage=25`

type FeaturedRawEntry = GameBananaRawRecord & {
  _sModelName?: string
  _sProfileUrl?: string
  _aFeaturings?: GameBananaFeaturingEntry[]
}

function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
}

export function computeFeaturedSignature(mods: GameBananaMod[]): string {
  return mods
    .map((m) => `${m.id}:${m.updatedAt ?? m.submittedAt ?? 0}:${m.__featuredLabel ?? ''}`)
    .join('|')
}

function mapFeaturedRecord(raw: FeaturedRawEntry): GameBananaMod {
  const engineId = getEngineId(raw)
  const submittedAt = raw._tsDateAdded || 0
  const updatedAt = raw._tsDateUpdated || raw._tsDateModified || submittedAt
  const thumb = upgradeGameBananaImageUrl(extractThumbnail(raw))
  const previews = extractPreviewMedia(raw).map((u) => upgradeGameBananaImageUrl(u))
  const label = raw._aFeaturings?.[0]?._sTitle?.trim() || 'Featured'

  return {
    id: raw._idRow,
    gameId: FNF_GAME_ID,
    source: 'gamebanana',
    sourceId: String(raw._idRow),
    sourceUrl: raw._sProfileUrl || `https://gamebanana.com/mods/${raw._idRow}`,
    title: raw._sName || 'Featured Mod',
    description: htmlToPlainText(raw._sDescription || raw._sText || '') || label,
    htmlBody: sanitizeHtml(raw._sText || raw._sDescription || label),
    author: raw._aSubmitter?._sName || 'Unknown Creator',
    userId: extractUserId(raw),
    userPfp: extractUserPfp(raw),
    authors: extractAuthors(raw._aCredits),
    likes: raw._nLikeCount || 0,
    views: raw._nViewCount || 0,
    downloads: raw._nDownloadCount || 0,
    submittedAt,
    updatedAt,
    timeAgo: getTimeAgo(submittedAt),
    engineId,
    engineIcon: getEngineIcon(engineId),
    thumbnail: thumb,
    previewMedia: previews.length > 0 ? previews : thumb ? [thumb] : [],
    isNsfw: checkIsNsfw(raw),
    categoryId: raw._aCategory?._idRow || raw._aSubCategory?._idRow || raw._aRootCategory?._idRow,
    categoryName: raw._aCategory?._sName || raw._aSubCategory?._sName || raw._aRootCategory?._sName,
    __featuredLabel: label,
  }
}

/**
 * Fetches featured FNF mods directly from GameBanana's Featured API,
 * backfilling with popular FNF mods if fewer than 4 entries are returned.
 */
export class FeaturedService {
  private url: string

  constructor(url: string = GB_FEATURED_API_URL) {
    this.url = url
  }

  public async getCarousel(): Promise<GameBananaMod[]> {
    try {
      const response = await http.fetchJson<{ _aRecords?: FeaturedRawEntry[] }>(this.url)
      const records = Array.isArray(response?._aRecords) ? response._aRecords : []

      let mods = records
        .filter((r) => r && r._idRow && r._sModelName === 'Mod' && !isExcluded(r))
        .map(mapFeaturedRecord)

      if (isMobile()) {
        mods = mods.filter((m) => {
          const eid = String(m.engineId || '').toLowerCase()
          const title = String(m.title || '').toLowerCase()
          return eid !== 'executable' && eid !== '3827' && !title.endsWith('.exe')
        })
      }

      if (mods.length < 4) {
        try {
          const fallbackMods = await getMods('popular', 1, 20)
          const existingIds = new Set(mods.map((m) => String(m.id)))
          for (const cand of fallbackMods) {
            if (isMobile()) {
              const eid = String(cand.engineId || '').toLowerCase()
              const title = String(cand.title || '').toLowerCase()
              if (eid === 'executable' || eid === '3827' || title.endsWith('.exe')) {
                continue
              }
            }
            if (!existingIds.has(String(cand.id))) {
              existingIds.add(String(cand.id))
              mods.push({
                ...cand,
                __isCommunityPick: true,
                __featuredLabel: cand.__featuredLabel || 'Popular',
              })
              if (mods.length >= 8) break
            }
          }
        } catch (e) {
          console.warn('Could not backfill featured mods:', e)
        }
      }

      return mods
    } catch (error) {
      console.warn('GameBanana FeaturedService error:', error)
      return []
    }
  }
}
