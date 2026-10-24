import { http } from '../http'
import { GB_BASE_URL, FNF_GAME_ID, ENGINE_CATEGORIES } from '../constants'
import type { GameBananaRawRecord } from '../types'

/**
 * Fetches a discovery pool of recent and liked records across supported engine categories.
 */
export async function fetchDiscoveryRecords(
  targetEngineId: string | null = null,
): Promise<GameBananaRawRecord[]> {
  let categoryIds = Object.keys(ENGINE_CATEGORIES).map(Number)
  if (targetEngineId && targetEngineId !== 'all') {
    const match = Object.entries(ENGINE_CATEGORIES).find(
      ([, cat]) => cat.id === targetEngineId,
    )
    if (match) categoryIds = [Number(match[0])]
    else return []
  }

  const sources = [
    { sort: 'Generic_Newest', pages: 4 },
    { sort: 'Generic_MostLiked', pages: 1 },
  ]

  const requests: Promise<GameBananaRawRecord[]>[] = []

  for (const source of sources) {
    for (let page = 1; page <= source.pages; page++) {
      for (const catId of categoryIds) {
        requests.push(
          (async () => {
            const url = `${GB_BASE_URL}/Mod/Index?_nPage=${page}&_nPerpage=15&_aFilters[Generic_Game]=${FNF_GAME_ID}&_aFilters[Generic_Category]=${catId}&_sSort=${source.sort}`
            try {
              const res = await http.fetchJson<{ _aRecords?: GameBananaRawRecord[] }>(url)
              const records = res?._aRecords || []
              return records.map((r) => ({
                ...r,
                __injectedCategoryId: catId,
              }))
            } catch {
              return []
            }
          })(),
        )
      }
    }
  }

  const results = await Promise.all(requests)
  const flattened = results.flat()

  const unique = new Map<number, GameBananaRawRecord>()
  for (const r of flattened) {
    if (r && r._idRow && !unique.has(r._idRow)) {
      unique.set(r._idRow, r)
    }
  }

  return Array.from(unique.values())
}
