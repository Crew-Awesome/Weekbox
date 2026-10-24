import { http } from '../http'
import { GB_BASE_URL, FNF_GAME_ID } from '../constants'
import type { GameBananaRawRecord } from '../types'

/**
 * Searches GameBanana mods using the official Util/Search/Results API endpoint.
 */
export async function fetchSearchRecords(
  query: string,
  _engineIds: string[] = ['all'],
  sortFilter = 'popular',
  page = 1,
  perPage = 15,
): Promise<GameBananaRawRecord[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const order = sortFilter === 'new' ? 'date' : 'popularity'

  try {
    const url = `${GB_BASE_URL}/Util/Search/Results?_sSearchString=${encodeURIComponent(
      trimmed,
    )}&_idGameRow=${FNF_GAME_ID}&_sModelName=Mod&_sOrder=${order}&_nPage=${page}&_nPerpage=${perPage}`

    const res = await http.fetchJson<{ _aRecords?: GameBananaRawRecord[] }>(url)
    return res?._aRecords || []
  } catch (err) {
    console.error('fetchSearchRecords error:', err)
    return []
  }
}
