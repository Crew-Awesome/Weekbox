import type {
  TwitterNewsSource,
  TwitterNewsPost,
  TwitterMediaVideo,
  TwitterStats,
  FetchSourceResult,
} from './types'
import {
  DEFAULT_TWITTER_NEWS_SOURCES,
  FX_TWITTER_PROFILE_API,
  FX_TWITTER_STATUS_API,
  FX_TWITTER_VIDEO_HOST,
  NEWS_SOURCE_CONCURRENCY,
  NEWS_SOURCE_MAX_ATTEMPTS,
  NEWS_SOURCE_RETRY_DELAY,
} from './constants'
import { nativeFetch } from './native-fetch'

export function safeNewsUrl(value: unknown, baseUrl = 'https://x.com/'): string {
  try {
    const rawValue = String(value || '').trim()
    const relativeValue = rawValue.startsWith('/') ? rawValue.slice(1) : rawValue
    const url = new URL(relativeValue, baseUrl)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  } catch {
    return ''
  }
}

export function toSafeExternalUrl(value: unknown, baseUrl?: string): string {
  const url = safeNewsUrl(value, baseUrl)
  return url.startsWith('https://') ? url : ''
}

export function normalizePublishedAt(value: unknown): string {
  if (!value) return ''
  const date = new Date(value as string | number)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

export function mediaIdentity(value: string): string {
  try {
    const url = new URL(value)
    return `${url.hostname}${url.pathname}`.toLowerCase()
  } catch {
    return String(value || '').toLowerCase()
  }
}

export function uniqueMediaUrls(values: string[]): string[] {
  const seen = new Set<string>()
  return values.filter((value) => {
    const identity = mediaIdentity(value)
    if (!identity || seen.has(identity)) return false
    seen.add(identity)
    return true
  })
}

interface FxFormat {
  container?: string
  url?: string
  bitrate?: number
}

interface FxVideo {
  url?: string
  thumbnail_url?: string
  transcode_url?: string
  formats?: FxFormat[]
}

interface FxMedia {
  photos?: Array<{ url?: string }>
  videos?: FxVideo[]
}

interface FxAuthor {
  name?: string
  screen_name?: string
  avatar_url?: string
}

interface FxStatusPayload {
  type?: string
  id?: string | number
  text?: string
  title?: string
  url?: string
  created_at?: string
  created_timestamp?: number | string
  author?: FxAuthor
  reposted_by?: FxAuthor
  repostedBy?: FxAuthor
  isRetweet?: boolean
  replying_to?: unknown
  media?: FxMedia
  likes?: number
  reposts?: number
  replies?: number
  quotes?: number
  views?: number
  quote?: FxStatusPayload
}

export function normalizeFxVideos(media?: FxMedia): TwitterMediaVideo[] {
  if (!Array.isArray(media?.videos)) return []

  return media.videos
    .map((video) => {
      const rawFormats = (Array.isArray(video?.formats) ? video.formats : [])
        .filter((format): format is FxFormat & { url: string } => {
          return format.container === 'mp4' && Boolean(format.url)
        })
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
        .map((format) => toSafeExternalUrl(format.url))
        .filter(Boolean)

      const directUrl = toSafeExternalUrl(video?.url)
      const transcodeUrl = toSafeExternalUrl(video?.transcode_url)

      const fxUrls = rawFormats
        .map((url) => {
          try {
            const parsed = new URL(url)
            return `${FX_TWITTER_VIDEO_HOST}${parsed.pathname}${parsed.search}`
          } catch {
            return ''
          }
        })
        .filter(Boolean)

      const sources = [
        ...new Set([
          ...(directUrl ? [directUrl] : []),
          ...rawFormats,
          ...(transcodeUrl ? [transcodeUrl] : []),
          ...fxUrls,
        ]),
      ]

      return {
        thumbnailUrl: toSafeExternalUrl(video?.thumbnail_url),
        url: sources[0] || '',
        sources,
      }
    })
    .filter((video) => video.url || video.thumbnailUrl)
}

export function isRetweet(post: FxStatusPayload): boolean {
  return Boolean(
    post?.isRetweet ||
      post?.reposted_by ||
      post?.repostedBy ||
      /^RT(?:\s+by)?\s+@/i.test(String(post?.text || post?.title || '').trim()),
  )
}

export function normalizePostLink(value: unknown): string {
  const link = toSafeExternalUrl(value)
  if (!link) return ''
  try {
    return new URL(link).href
  } catch {
    return ''
  }
}

export function normalizeNewsStatus(
  status: FxStatusPayload,
  source: TwitterNewsSource,
  nested = false,
): TwitterNewsPost {
  const author =
    !nested && source.includeReposts && status?.reposted_by
      ? status.reposted_by
      : status?.author || {}

  const timestamp =
    status?.created_timestamp != null
      ? normalizePublishedAt(Number(status.created_timestamp) * 1000)
      : ''

  const rawPhotos = (
    Array.isArray(status?.media?.photos) ? status.media.photos : []
  )
    .map((photo) => toSafeExternalUrl(photo?.url))
    .filter(Boolean)

  const videos = normalizeFxVideos(status?.media)
  const videoThumbnailIdentities = new Set(
    videos
      .map((v) => v.thumbnailUrl)
      .filter(Boolean)
      .map(mediaIdentity),
  )

  const images = uniqueMediaUrls(rawPhotos).filter(
    (url) => !videoThumbnailIdentities.has(mediaIdentity(url)),
  )

  const authorName = author.name || author.screen_name
  const stats: TwitterStats = {
    likes: status?.likes,
    reposts: status?.reposts,
    replies: status?.replies,
    quotes: status?.quotes,
    views: status?.views,
  }

  const normalized: TwitterNewsPost = {
    id: String(status?.id || ''),
    text: String(status?.text || '').trim(),
    sourceName: authorName || (nested ? 'Quoted post' : source.name),
    username: author.screen_name || (nested ? '' : source.username),
    sourceUsername: source.username,
    avatarUrl: toSafeExternalUrl(author.avatar_url),
    publishedAt: timestamp || normalizePublishedAt(status?.created_at),
    link: normalizePostLink(status?.url),
    images,
    videos,
    stats,
    quote: null,
    isRetweet: Boolean(status?.reposted_by || status?.repostedBy || status?.isRetweet),
  }

  if (!nested && status?.quote) {
    normalized.quote = normalizeNewsStatus(status.quote, source, true)
  }

  return normalized
}

export function hasNewsContent(post: TwitterNewsPost): boolean {
  return Boolean(
    post?.id &&
      (post.text.trim().length > 0 || post.quote?.id || post.images.length > 0 || post.videos.length > 0) &&
      post.publishedAt &&
      !Number.isNaN(Date.parse(post.publishedAt)),
  )
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
      // Cache buster to bypass stale Cloudflare / reverse proxy 404 cache
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
          // Allow thread continuations from the same author
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

  // Fetch sources in small concurrent batches to respect FxTwitter rate limits
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

    // Jitter delay between batches
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
