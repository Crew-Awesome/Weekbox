import { http } from '../http'
import { GB_BASE_URL, FNF_GAME_ID, ENGINE_CATEGORIES } from '../constants'
import type { GameBananaRawRecord } from '../types'

const popularCache = new Map<
  string,
  {
    records: GameBananaRawRecord[]
    sourcePage: number
    modIds: Set<number>
    isComplete: boolean
  }
>()
const MAX_CACHE_SIZE = 20

/**
 * Fetches and caches most-downloaded records with LRU eviction.
 */
export async function fetchPopularRecords(
  targetEngineIds: string[] | null = null,
  maxPages = 4,
  maxRecords = 30,
): Promise<GameBananaRawRecord[]> {
  const isAll =
    !targetEngineIds ||
    targetEngineIds.length === 0 ||
    (targetEngineIds.length === 1 && targetEngineIds[0] === 'all')
  const cacheKey = isAll ? 'all' : targetEngineIds.slice().sort().join(',')

  if (!popularCache.has(cacheKey)) {
    if (popularCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = popularCache.keys().next().value
      if (oldestKey) popularCache.delete(oldestKey)
    }

    popularCache.set(cacheKey, {
      records: [],
      sourcePage: 1,
      modIds: new Set(),
      isComplete: false,
    })
  } else {
    const val = popularCache.get(cacheKey)!
    popularCache.delete(cacheKey)
    popularCache.set(cacheKey, val)
  }

  const state = popularCache.get(cacheKey)!

  if (state.records.length >= maxRecords || state.isComplete) {
    return state.records.slice(0, maxRecords)
  }

  const indexUrl = `${GB_BASE_URL}/Mod/Index`

  let categoryIds = Object.keys(ENGINE_CATEGORIES).map(Number)
  if (!isAll) {
    categoryIds = targetEngineIds
      .map((id) => {
        const match = Object.entries(ENGINE_CATEGORIES).find(
          ([, cat]) => cat.id === id,
        )
        return match ? Number(match[0]) : -1
      })
      .filter((id) => id !== -1)
  }

  while (
    !state.isComplete &&
    state.records.length < maxRecords &&
    state.sourcePage <= maxPages
  ) {
    try {
      let allFetched: GameBananaRawRecord[] = []

      if (isAll) {
        const perPageToFetch = Math.max(15, Math.min(30, maxRecords))
        const url = `${indexUrl}?_aFilters[Generic_Game]=${FNF_GAME_ID}&_sSort=Generic_MostDownloaded&_nPerpage=${perPageToFetch}&_nPage=${state.sourcePage}`
        try {
          const res = await http.fetchJson<{ _aRecords?: GameBananaRawRecord[] }>(url)
          allFetched = res?._aRecords || []
        } catch (err) {
          console.warn('fetchPopularRecords failed for all engines:', err)
          allFetched = []
        }
      } else {
        const perCatPerPage = Math.max(10, Math.ceil(maxRecords / categoryIds.length))
        const requests = categoryIds.map(async (catId) => {
          const url = `${indexUrl}?_aFilters[Generic_Game]=${FNF_GAME_ID}&_aFilters[Generic_Category]=${catId}&_sSort=Generic_MostDownloaded&_nPerpage=${perCatPerPage}&_nPage=${state.sourcePage}`
          try {
            const res = await http.fetchJson<{ _aRecords?: GameBananaRawRecord[] }>(url)
            const records = res?._aRecords || []
            return records.map((r) => ({
              ...r,
              __resolvedEngineId: ENGINE_CATEGORIES[catId]?.id,
            }))
          } catch {
            return []
          }
        })

        const results = await Promise.all(requests)
        allFetched = results.flat()
      }

      if (allFetched.length === 0) {
        state.isComplete = true
        break
      }

      for (const rec of allFetched) {
        if (!state.modIds.has(rec._idRow)) {
          state.modIds.add(rec._idRow)
          state.records.push(rec)
        }
      }

      state.sourcePage++
    } catch {
      state.isComplete = true
      break
    }
  }

  return state.records.slice(0, maxRecords)
}
