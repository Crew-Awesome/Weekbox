import type {
  TwitterNewsSource,
  TwitterNewsPost,
  TwitterMediaVideo,
  TwitterStats,
} from './types'
import { FX_TWITTER_VIDEO_HOST } from './constants'

export interface FxFormat {
  container?: string
  url?: string
  bitrate?: number
}

export interface FxVideo {
  url?: string
  thumbnail_url?: string
  transcode_url?: string
  formats?: FxFormat[]
}

export interface FxMedia {
  photos?: Array<{ url?: string }>
  videos?: FxVideo[]
}

export interface FxAuthor {
  name?: string
  screen_name?: string
  avatar_url?: string
}

export interface FxStatusPayload {
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
