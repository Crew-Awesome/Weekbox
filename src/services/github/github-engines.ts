import type { GitHubRelease, GitHubReleaseAsset, GitHubCacheEntry } from './types'

const GITHUB_CACHE_PREFIX = 'wbr:gh_releases:'
const CACHE_TTL_MS = 20 * 60 * 1000

const memoryCache = new Map<string, GitHubCacheEntry>()

interface RawGitHubAsset {
  id: number
  name: string
  size: number
  browser_download_url: string
  content_type: string
  download_count?: number
  updated_at?: string
}

interface RawGitHubRelease {
  id: number
  tag_name: string
  name: string | null
  body: string | null
  published_at: string
  prerelease: boolean
  draft: boolean
  html_url: string
  assets: RawGitHubAsset[]
}

function parseRelease(raw: RawGitHubRelease): GitHubRelease {
  const assets: GitHubReleaseAsset[] = (raw.assets || []).map((a) => ({
    id: a.id,
    name: a.name,
    size: a.size,
    downloadUrl: a.browser_download_url,
    contentType: a.content_type,
    downloadCount: a.download_count,
    updatedAt: a.updated_at,
  }))

  return {
    id: raw.id,
    tagName: raw.tag_name || '',
    name: raw.name || raw.tag_name || 'Release',
    body: raw.body || '',
    publishedAt: raw.published_at,
    prerelease: Boolean(raw.prerelease),
    draft: Boolean(raw.draft),
    assets,
    htmlUrl: raw.html_url,
  }
}

export async function fetchEngineReleases(
  repo: string,
  forceRefresh = false,
): Promise<GitHubRelease[]> {
  const now = Date.now()
  const cacheKey = `${GITHUB_CACHE_PREFIX}${repo}`

  if (!forceRefresh) {
    const mem = memoryCache.get(repo)
    if (mem && now - mem.timestamp < CACHE_TTL_MS) {
      return mem.releases
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(cacheKey)
        if (stored) {
          const parsed = JSON.parse(stored) as GitHubCacheEntry
          if (parsed?.releases && now - parsed.timestamp < CACHE_TTL_MS) {
            memoryCache.set(repo, parsed)
            return parsed.releases
          }
        }
      } catch {
      }
    }
  }

  const url = `https://api.github.com/repos/${repo}/releases?per_page=30`

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!res.ok) {
      if (res.status === 403) {
        const mem = memoryCache.get(repo)
        if (mem) {
          console.warn(`[GitHub] Rate limited for ${repo}. Returning cached releases.`)
          return mem.releases
        }
        throw new Error('GitHub API rate limit reached. Please wait before refreshing.')
      }
      if (res.status === 404) {
        throw new Error(`Repository ${repo} not found on GitHub.`)
      }
      throw new Error(`GitHub error (${res.status}): ${res.statusText}`)
    }

    const data = (await res.json()) as RawGitHubRelease[]
    if (!Array.isArray(data)) {
      throw new Error(`Invalid response structure from GitHub for ${repo}`)
    }

    const parsedReleases = data
      .filter((r) => !r.draft)
      .map(parseRelease)

    const entry: GitHubCacheEntry = {
      timestamp: now,
      releases: parsedReleases,
    }
    memoryCache.set(repo, entry)

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(entry))
      } catch {
      }
    }

    return parsedReleases
  } catch (err) {
    const mem = memoryCache.get(repo)
    if (mem && mem.releases.length > 0) {
      console.warn(`[GitHub] Failed to fetch live releases for ${repo}, using cache:`, err)
      return mem.releases
    }
    throw err
  }
}
