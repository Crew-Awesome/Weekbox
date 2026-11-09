import type {
  TwitterNewsSource,
  TwitterNewsPost,
  FetchSourceResult,
} from './types'
import {
  DEFAULT_TWITTER_NEWS_SOURCES,
  FX_TWITTER_PROFILE_API,
  FX_TWITTER_STATUS_API,
  NEWS_SOURCE_CONCURRENCY,
  NEWS_SOURCE_MAX_ATTEMPTS,
  NEWS_SOURCE_RETRY_DELAY,
} from './constants'
import { nativeFetch } from './native-fetch'
import {
  safeNewsUrl,
  toSafeExternalUrl,
  normalizePublishedAt,
  mediaIdentity,
  uniqueMediaUrls,
  normalizeFxVideos,
  isRetweet,
  normalizePostLink,
  normalizeNewsStatus,
  hasNewsContent,
  type FxStatusPayload,
} from './twitter-normalizer'

export {
  safeNewsUrl,
  toSafeExternalUrl,
  normalizePublishedAt,
  mediaIdentity,
  uniqueMediaUrls,
  normalizeFxVideos,
  isRetweet,
  normalizePostLink,
  normalizeNewsStatus,
  hasNewsContent,
  type FxStatusPayload,
}

export async function fetchNewsSource(
  source: TwitterNewsSource,
  signal?: AbortSignal,
  page: { cursor?: string } = {},
): Promise<FetchSourceResult> {
  for (let attempt = 0; attempt < NEWS_SOURCE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const url = new URL(
        `${FX_TWITTER_PROFILE_API}/${encodeURIComponent(source.username)}/statuses`,
      )
      if (page.cursor) {
        url.searchParams.set('cursor', page.cursor)
      }
      url.searchParams.set('_t', `${Date.now()}_${attempt}`)

      const response = await nativeFetch(url.href, {
        headers: { Accept: 'application/json' },
        signal,
      })

      if (!response.ok) {
        throw new Error(`${source.name} returned HTTP ${response.status}`)
      }

      const payload = (await response.json()) as {
        code?: number
        results?: FxStatusPayload[]
        cursor?: { bottom?: string }
      }

      if (payload?.code && payload.code !== 200) {
        throw new Error(`${source.name} returned code ${payload.code}`)
      }

      const results = Array.isArray(payload?.results) ? payload.results : []
      const posts = results
        .filter(
          (status) =>
            status?.type === 'status' &&
            (source.includeReposts || !isRetweet(status)),
        )
        .filter((status) => {
          if (!status.replying_to) return true
          const replyTarget =
            typeof status.replying_to === 'object' && status.replying_to !== null
              ? (status.replying_to as { screen_name?: string }).screen_name
              : String(status.replying_to)
          return (
            replyTarget &&
            (replyTarget.toLowerCase() === source.username.toLowerCase() ||
              replyTarget.toLowerCase() === status.author?.screen_name?.toLowerCase())
          )
        })
        .map((status) => normalizeNewsStatus(status, source))
        .filter(hasNewsContent)

      const cursor = payload?.cursor?.bottom || ''
      return { cursor, posts }
    } catch (error: unknown) {
      if ((error as { name?: string })?.name === 'AbortError') {
        return { cursor: '', posts: [] }
      }
      if (attempt === NEWS_SOURCE_MAX_ATTEMPTS - 1) {
        console.warn(
          `[WeekBox News] Failed to load ${source.name} after ${NEWS_SOURCE_MAX_ATTEMPTS} attempts:`,
          error,
        )
        return { cursor: '', posts: [] }
      }
      await new Promise((resolve) =>
        setTimeout(resolve, NEWS_SOURCE_RETRY_DELAY * 2 ** attempt),
      )
    }
  }

  return { cursor: '', posts: [] }
}

export async function fetchPostDetails(
  postId: string,
  signal?: AbortSignal,
): Promise<FxStatusPayload | null> {
  try {
    const response = await nativeFetch(
      `${FX_TWITTER_STATUS_API}/${encodeURIComponent(postId)}?_t=${Date.now()}`,
      { signal },
    )
    if (!response.ok) return null
    const payload = (await response.json()) as {
      code?: number
      status?: FxStatusPayload
    }
    if (payload?.code && payload.code !== 200) return null
    return payload?.status || null
  } catch {
    return null
  }
}

export async function fetchTwitterNewsFeed(
  sources: TwitterNewsSource[] = DEFAULT_TWITTER_NEWS_SOURCES,
  signal?: AbortSignal,
  onBatch?: (batchPosts: TwitterNewsPost[]) => void,
): Promise<{
  posts: TwitterNewsPost[]
  availableSources: Set<string>
  sourcePages: Map<string, { cursor?: string; page: number }>
}> {
  const postsById = new Map<string, TwitterNewsPost>()
  const availableSources = new Set<string>()
  const sourcePages = new Map<string, { cursor?: string; page: number }>()

  const emitBatch = () => {
    if (onBatch) {
      const current = [...postsById.values()].sort(
        (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
      )
      onBatch(current)
    }
  }

  for (let i = 0; i < sources.length; i += NEWS_SOURCE_CONCURRENCY) {
    if (signal?.aborted) break
    const batch = sources.slice(i, i + NEWS_SOURCE_CONCURRENCY)

    await Promise.allSettled(
      batch.map(async (source) => {
        if (signal?.aborted) return
        const res = await fetchNewsSource(source, signal)
        if (res.posts.length > 0) {
          availableSources.add(source.username)
          sourcePages.set(source.username, {
            cursor: res.cursor,
            page: 1,
          })
          res.posts.forEach((post) => postsById.set(post.id, post))
          emitBatch()
        }
      }),
    )

    if (i + NEWS_SOURCE_CONCURRENCY < sources.length && !signal?.aborted) {
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
  }

  const finalPosts = [...postsById.values()].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  )

  return {
    posts: finalPosts,
    availableSources,
    sourcePages,
  }
}
