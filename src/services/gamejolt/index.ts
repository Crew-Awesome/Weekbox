import { providerFetchJson } from '../network/proxy-fetch'
import type { GameBananaMod } from '../gamebanana/types'
import { GAMEJOLT_SECTIONS, GAMEJOLT_OS_FILTERS, type GameJoltRawGame, type GameJoltSection } from './types'
import { extractGameJoltDownloadUrl, toGameJoltGridMod, toGameJoltModDetails } from './mappers'

export * from './types'

export const GAMEJOLT_API_URL = 'https://gamejolt.com/site-api'

const detailsCache = new Map<string, Promise<GameBananaMod>>()

/**
 * GameJolt's `/web/search/games` ignores `tag=fnf`, so append `#fnf` when
 * the query does not already reference FNF / Friday Night Funkin'.
 */
export function buildGameJoltFnfSearchQuery(query: string): string {
  const trimmed = query.trim()
  if (!trimmed) return ''
  if (/(?:^|\W)(?:#?fnf|friday\s+night\s+funkin)(?:\W|$)/i.test(trimmed)) {
    return trimmed
  }
  return `${trimmed} #fnf`
}

export interface FetchGameJoltModsParams {
  section?: GameJoltSection | string
  page?: number
  query?: string
  osFilters?: string[]
  signal?: AbortSignal
}

export async function getGameJoltMods({
  section = 'hot',
  page = 1,
  query = '',
  osFilters = [],
  signal,
}: FetchGameJoltModsParams = {}): Promise<{ mods: GameBananaMod[]; hasMore: boolean }> {
  const trimmedQuery = query.trim()
  const isSearch = trimmedQuery.length > 0
  const params = new URLSearchParams()

  if (isSearch) {
    params.set('q', buildGameJoltFnfSearchQuery(trimmedQuery))
    params.set('tag', 'fnf')
    params.set('post-feed-use-offset', '1')
    if (page > 1) params.set('page', String(page))
  } else {
    const validSection = GAMEJOLT_SECTIONS.some((s) => s.id === section)
      ? section
      : 'hot'
    params.set('section', validSection)
    params.set('tag', 'fnf')
    if (page > 1) params.set('page', String(page))
    for (const os of osFilters) {
      if (GAMEJOLT_OS_FILTERS.some((opt) => opt.id === os)) {
        params.append('f_os[]', os)
      }
    }
  }

  const endpoint = isSearch ? '/web/search/games' : '/web/discover/games'
  const res = await providerFetchJson<{
    payload?: {
      games?: GameJoltRawGame[]
      perPage?: number
      gamesCount?: number
    }
  }>(`${GAMEJOLT_API_URL}${endpoint}?${params}`, { signal })

  const payload = res?.payload || {}
  const games = Array.isArray(payload.games) ? payload.games : []
  const perPage = Math.max(1, Number(payload.perPage) || 36)
  const total = Math.max(0, Number(payload.gamesCount) || 0)

  return {
    mods: games.map(toGameJoltGridMod),
    hasMore: games.length >= perPage && (total === 0 || page * perPage < total),
  }
}

export async function getGameJoltModDetails(
  id: string | number,
): Promise<GameBananaMod | null> {
  const key = String(id).replace(/^gamejolt:/i, '').trim()
  if (!/^\d+$/.test(key)) return null

  const existing = detailsCache.get(key)
  if (existing) return existing

  const req = Promise.all([
    providerFetchJson<{ payload?: { game?: GameJoltRawGame } }>(
      `${GAMEJOLT_API_URL}/web/discover/games/${encodeURIComponent(key)}`,
    ),
    providerFetchJson<{
      payload?: {
        metaDescription?: string
        mediaItems?: unknown
        builds?: unknown
        releases?: unknown
      }
    }>(`${GAMEJOLT_API_URL}/web/discover/games/overview/${encodeURIComponent(key)}`).catch(
      () => null,
    ),
  ])
    .then(([detailRes, overviewRes]) => {
      const game = detailRes?.payload?.game
      if (!game) throw new Error('GameJolt game details unavailable')
      return toGameJoltModDetails(game, overviewRes?.payload || {})
    })
    .catch((err) => {
      detailsCache.delete(key)
      throw err
    })

  detailsCache.set(key, req)
  return req
}

export async function resolveGameJoltBuildDownloadUrl(
  buildId: string | number,
): Promise<string> {
  const cleanId = String(buildId).replace(/^gamejolt-build:\/\//i, '').trim()
  if (!/^\d+$/.test(cleanId)) {
    throw new Error('Invalid GameJolt build ID')
  }
  const response = await providerFetchJson<unknown>(
    `${GAMEJOLT_API_URL}/web/discover/games/builds/get-download-url/${encodeURIComponent(cleanId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    },
  )
  const url = extractGameJoltDownloadUrl(response)
  if (!url) {
    throw new Error('GameJolt did not return a downloadable file URL')
  }
  return url
}
