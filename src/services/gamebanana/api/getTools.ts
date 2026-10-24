import { http } from '../http'
import { GB_BASE_URL, FNF_GAME_ID } from '../constants'
import type { GameBananaTool, GameBananaRawRecord } from '../types'
import {
  getTimeAgo,
  extractAuthors,
  extractCreditGroups,
  extractThumbnail,
  extractPreviewMedia,
  extractUserId,
  extractUserPfp,
  checkIsNsfw,
} from '../utils'
import { sanitizeHtml, htmlToPlainText } from '../sanitize'

/**
 * Fetches FNF modding tools from GameBanana.
 */
export async function getTools(page = 1, perPage = 15): Promise<GameBananaTool[]> {
  const url = `${GB_BASE_URL}/Tool/Index?_aFilters[Generic_Game]=${FNF_GAME_ID}&_nPerpage=${perPage}&_nPage=${page}`
  try {
    const res = await http.fetchJson<{ _aRecords?: GameBananaRawRecord[] }>(url)
    const records = res?._aRecords || []

    return records.map((tool) => {
      const submittedAt = tool._tsDateAdded || 0
      return {
        id: tool._idRow,
        gameId: FNF_GAME_ID,
        title: tool._sName || 'Unknown Tool',
        description: htmlToPlainText(tool._sDescription || tool._sText || ''),
        htmlBody: sanitizeHtml(tool._sText || tool._sDescription || ''),
        author: tool._aSubmitter?._sName || 'Unknown Creator',
        userId: extractUserId(tool),
        userPfp: extractUserPfp(tool),
        authors: extractAuthors(tool._aCredits),
        credits: extractCreditGroups(tool._aCredits),
        likes: tool._nLikeCount || 0,
        views: tool._nViewCount || 0,
        downloads: tool._nDownloadCount || 0,
        submittedAt,
        updatedAt: tool._tsDateUpdated || submittedAt,
        timeAgo: getTimeAgo(submittedAt),
        thumbnail: extractThumbnail(tool),
        previewMedia: extractPreviewMedia(tool),
        isNsfw: checkIsNsfw(tool),
      }
    })
  } catch (err) {
    console.error('Failed to fetch tools:', err)
    return []
  }
}
