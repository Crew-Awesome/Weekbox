import { providerFetchJson } from '../network/proxy-fetch'
import type { GameBananaMod } from '../gamebanana/types'
import {
  BACKSTAGE_CATEGORIES,
  BACKSTAGE_ENGINES,
  BACKSTAGE_SORTS,
  type BackstageRawMod,
  type BackstageSort,
} from './types'
import { BACKSTAGE_API_URL, toBackstageGridMod, toBackstageModDetails } from './mappers'

export * from './types'

const detailsCache = new Map<string, Promise<GameBananaMod>>()
const sortKeySet = new Set<string>(BACKSTAGE_SORTS.map((s) => s.id))
const engineKeySet = new Set<string>(BACKSTAGE_ENGINES.map((e) => e.id))
const categoryKeySet = new Set<string>(BACKSTAGE_CATEGORIES.map((c) => c.id))

export interface FetchBackstageModsParams {
  query?: string
  sort?: BackstageSort | string
  reverse?: boolean
  engine?: string
  category?: string
  page?: number
  limit?: number
  signal?: AbortSignal
}

export async function getBackstageMods({
  query = '',
  sort = 'activity',
  reverse = false,
  engine = '',
  category = '',
  page = 1,
  limit = 24,
  signal,
}: FetchBackstageModsParams = {}): Promise<{ mods: GameBananaMod[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sort: sortKeySet.has(sort) ? sort : 'activity',
  })
  if (query.trim()) params.set('q', query.trim())
  if (reverse) params.set('reverse', '1')
  if (engineKeySet.has(engine)) params.set('engine', engine)
  if (categoryKeySet.has(category)) params.set('category', category)

  const data = await providerFetchJson<
    BackstageRawMod[] | { mods?: BackstageRawMod[]; pages?: number }
  >(`${BACKSTAGE_API_URL}/mods?${params}`, { signal })

  const records = Array.isArray(data) ? data : data?.mods || []
  const pages = Number(!Array.isArray(data) ? data?.pages : undefined)
  const mods = records.map(toBackstageGridMod)

  return {
    mods,
    hasMore: Number.isFinite(pages) && pages > 0 ? page < pages : mods.length >= limit,
  }
}

export async function getBackstageModDetails(
  id: string | number,
): Promise<GameBananaMod | null> {
  const key = String(id).replace(/^backstage:/i, '').trim()
  if (!key) return null

  const existing = detailsCache.get(key)
  if (existing) return existing

  const req = providerFetchJson<BackstageRawMod>(
    `${BACKSTAGE_API_URL}/mods/${encodeURIComponent(key)}`,
  )
    .then(toBackstageModDetails)
    .catch((err) => {
      detailsCache.delete(key)
      throw err
    })

  detailsCache.set(key, req)
  return req
}
