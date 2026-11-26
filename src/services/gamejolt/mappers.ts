import { FNF_GAME_ID } from '../gamebanana/constants'
import { getTimeAgo } from '../gamebanana/utils'
import { htmlToPlainText, sanitizeHtml } from '../gamebanana/sanitize'
import type { GameBananaFile, GameBananaMod } from '../gamebanana/types'
import type { GameJoltRawBuild, GameJoltRawGame, GameJoltRawMedia } from './types'

function absoluteUrl(value: unknown): string {
  if (!value || typeof value !== 'string') return ''
  try {
    return new URL(value, 'https://gamejolt.com').href
  } catch {
    return ''
  }
}

function getGameUrl(game: GameJoltRawGame): string {
  const slug = game.slug || game.path
  return slug
    ? `https://gamejolt.com/games/${encodeURIComponent(slug)}/${encodeURIComponent(String(game.id))}`
    : `https://gamejolt.com/games/${encodeURIComponent(String(game.id))}`
}

function getThumbnail(game: GameJoltRawGame): string {
  return absoluteUrl(
    game.thumbnail_media_item?.img_url ||
      game.header_media_item?.img_url ||
      game.img_thumbnail ||
      game.thumbnail_media_item?.mediaserver_url ||
      game.thumbnail_media_item?.img_thumbnail,
  )
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch),
  )
}

interface TipTapNode {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>
  content?: TipTapNode[]
}

function renderDescriptionText(node: TipTapNode): string {
  let text = escapeHtml(node.text || '')
  for (const mark of Array.isArray(node.marks) ? node.marks : []) {
    const tags: Record<string, string> = {
      strong: 'strong',
      em: 'em',
      strike: 'del',
      code: 'code',
    }
    if (mark.type && tags[mark.type]) {
      text = `<${tags[mark.type]}>${text}</${tags[mark.type]}>`
    }
    if (mark.type === 'link') {
      const href = absoluteUrl(mark.attrs?.href)
      if (href) text = `<a href="${escapeHtml(href)}">${text}</a>`
    }
  }
  return text
}

function renderDescriptionMedia(
  node: TipTapNode,
  media: Map<string, GameJoltRawMedia>,
): string {
  const item = media.get(String(node.attrs?.id ?? ''))
  const src = absoluteUrl(item?.img_url || item?.mediaserver_url)
  if (!src) return ''
  const caption = String(node.attrs?.caption || '')
  const image = `<img src="${escapeHtml(src)}" alt="${escapeHtml(caption)}">`
  const href = absoluteUrl(node.attrs?.href)
  return href ? `<p><a href="${escapeHtml(href)}">${image}</a></p>` : `<p>${image}</p>`
}

function renderDescriptionNode(
  node: TipTapNode,
  media: Map<string, GameJoltRawMedia>,
): string {
  if (!node || typeof node !== 'object') return ''
  if (node.type === 'text') return renderDescriptionText(node)
  if (node.type === 'mediaItem') return renderDescriptionMedia(node, media)
  if (node.type === 'hardBreak') return '<br>'
  if (node.type === 'hr' || node.type === 'horizontalRule') return '<hr>'
  if (node.type === 'heading') {
    const level = Math.max(1, Math.min(6, Number(node.attrs?.level) || 2))
    const inner = (Array.isArray(node.content) ? node.content : [])
      .map((child) =>
        child.type === 'paragraph'
          ? (Array.isArray(child.content) ? child.content : [])
              .map((item) => renderDescriptionNode(item, media))
              .join('')
          : renderDescriptionNode(child, media),
      )
      .join('')
    return `<h${level}>${inner}</h${level}>`
  }
  const tags: Record<string, string> = {
    paragraph: 'p',
    bulletList: 'ul',
    orderedList: 'ol',
    listItem: 'li',
    blockquote: 'blockquote',
    codeBlock: 'pre',
  }
  const content = (Array.isArray(node.content) ? node.content : [])
    .map((child) => renderDescriptionNode(child, media))
    .join('')
  const tag = node.type ? tags[node.type] : undefined
  return tag ? `<${tag}>${content}</${tag}>` : content
}

function getFullDescriptionHtml(game: GameJoltRawGame): string {
  const raw = game.description_content
  let doc: { content?: TipTapNode[]; hydration?: Array<{ source?: string; data?: GameJoltRawMedia }> } | null = null
  try {
    doc = typeof raw === 'string' ? JSON.parse(raw) : (raw as typeof doc)
  } catch {
    doc = null
  }
  if (!doc || !Array.isArray(doc.content)) {
    return sanitizeHtml(game.description || '')
  }
  const media = new Map(
    (Array.isArray(doc.hydration) ? doc.hydration : [])
      .filter((entry) => entry?.source && entry?.data)
      .map((entry) => [String(entry.source), entry.data!]),
  )
  const html = doc.content.map((node) => renderDescriptionNode(node, media)).join('')
  return sanitizeHtml(html)
}

export function extractGameJoltImages(mediaItems: unknown): string[] {
  return (Array.isArray(mediaItems) ? (mediaItems as GameJoltRawMedia[]) : [])
    .filter((item) => /image|screenshot/i.test(`${item.media_type || ''} ${item.type || ''}`))
    .map((item) =>
      absoluteUrl(
        item.media_item?.img_url ||
          item.img_url ||
          item.url ||
          item.media_item?.mediaserver_url ||
          item.img_thumbnail ||
          item.thumbnail_media_item?.img_url ||
          item.thumbnail_media_item?.mediaserver_url,
      ),
    )
    .filter((url, idx, all) => Boolean(url) && all.indexOf(url) === idx)
}

export function buildGameJoltFiles(
  builds: unknown,
  releases: unknown,
): GameBananaFile[] {
  const releaseList = Array.isArray(releases)
    ? (releases as Array<{ id?: number | string; version_number?: string }>)
    : []
  return (Array.isArray(builds) ? (builds as GameJoltRawBuild[]) : [])
    .filter((b) => b?.type === 'downloadable' && b?.id && b?.primary_file)
    .map((b) => {
      const f = b.primary_file!
      const fileName =
        f.file_name || f.filename || f.name || f.file?.name || `build-${b.id}.zip`
      const size = Number(f.file_size || f.filesize || f.size || f.file?.size) || 0
      const rel = releaseList.find((r) => String(r.id) === String(b.game_release_id))
      const version = rel?.version_number ? `GameJolt build v${rel.version_number}` : 'GameJolt downloadable build'

      return {
        _idRow: Number(b.id) || 0,
        _sFile: fileName,
        _nFilesize: size,
        _sDescription: version,
        _sDownloadUrl: `gamejolt-build://${b.id}`,
      }
    })
}

export function toGameJoltGridMod(game: GameJoltRawGame): GameBananaMod {
  const author =
    game.developer?.display_name ||
    game.developer?.name ||
    game.developer?.username ||
    'Unknown Creator'
  const rawTs = Number(game.published_on || game.posted_on || 0)
  const submittedSeconds = rawTs > 10_000_000_000 ? Math.floor(rawTs / 1000) : rawTs
  const thumb = getThumbnail(game)
  const header = absoluteUrl(game.header_media_item?.img_url)
  const followers = Number(game.follower_count) || 0
  const likes =
    typeof game.like_count === 'number' && Number.isFinite(game.like_count)
      ? Number(game.like_count)
      : undefined

  return {
    id: `gamejolt:${game.id}`,
    gameId: FNF_GAME_ID,
    source: 'gamejolt',
    sourceId: String(game.id),
    sourceUrl: getGameUrl(game),
    title: game.title || 'Untitled Game',
    description: '',
    htmlBody: '',
    author,
    userId: 0,
    userPfp: absoluteUrl(game.developer?.img_avatar),
    authors: [author],
    likes,
    followers,
    views: undefined,
    downloads: undefined,
    submittedAt: submittedSeconds,
    timeAgo: submittedSeconds ? getTimeAgo(submittedSeconds) : 'GameJolt',
    engineId: 'executable',
    engineIcon: '/imgs/icons/app/gamejolt.png',
    engineName: 'GameJolt',
    categoryName: "Friday Night Funkin'",
    thumbnail: thumb || header,
    previewMedia: [header, thumb].filter(
      (u, idx, all) => Boolean(u) && all.indexOf(u) === idx,
    ),
    isNsfw: false,
  }
}

export function toGameJoltModDetails(
  game: GameJoltRawGame,
  overview: {
    metaDescription?: string
    mediaItems?: unknown
    builds?: unknown
    releases?: unknown
  },
): GameBananaMod {
  const base = toGameJoltGridMod(game)
  const htmlBody =
    getFullDescriptionHtml(game) ||
    sanitizeHtml(overview?.metaDescription || '<p>No description available.</p>')
  const description = htmlToPlainText(htmlBody) || overview?.metaDescription || ''
  const images = extractGameJoltImages(overview?.mediaItems)
  const previewMedia =
    images.length > 0
      ? [base.thumbnail, ...images].filter(
          (u, idx, all) => Boolean(u) && all.indexOf(u) === idx,
        )
      : base.previewMedia || []
  const files = buildGameJoltFiles(overview?.builds, overview?.releases)

  return {
    ...base,
    description,
    htmlBody,
    previewMedia,
    files,
  }
}

export function extractGameJoltDownloadUrl(value: unknown, depth = 0): string {
  if (depth > 4 || value == null) return ''
  if (typeof value === 'string') {
    const url = absoluteUrl(value)
    return url && /^https?:\/\//i.test(url) ? url : ''
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = extractGameJoltDownloadUrl(entry, depth + 1)
      if (found) return found
    }
    return ''
  }
  if (typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  for (const key of ['url', 'downloadUrl', 'download_url', 'redirectUrl', 'redirect_url']) {
    if (typeof record[key] === 'string') {
      const found = extractGameJoltDownloadUrl(record[key], depth + 1)
      if (found) return found
    }
  }
  for (const key of ['payload', 'data', 'download', 'file']) {
    const found = extractGameJoltDownloadUrl(record[key], depth + 1)
    if (found) return found
  }
  return ''
}
