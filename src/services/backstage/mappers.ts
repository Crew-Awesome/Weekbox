import { FNF_GAME_ID } from '../gamebanana/constants'
import { getTimeAgo } from '../gamebanana/utils'
import { htmlToPlainText, sanitizeHtml } from '../gamebanana/sanitize'
import type { GameBananaFile, GameBananaMod, ModCreditGroup } from '../gamebanana/types'
import {
  BACKSTAGE_CATEGORIES,
  BACKSTAGE_ENGINES,
  type BackstageRawCredit,
  type BackstageRawMod,
} from './types'

export const BACKSTAGE_API_URL = 'https://api.funkinbackstage.net'

function mediaUrl(path?: string): string {
  if (!path) return ''
  try {
    return new URL(path, `${BACKSTAGE_API_URL}/`).href
  } catch {
    return ''
  }
}

function resolveBackstageEngine(rawEngine?: string) {
  const match = BACKSTAGE_ENGINES.find(
    (e) => e.id === rawEngine || e.mappedId === rawEngine,
  )
  return {
    engineId: match?.mappedId || 'unknown',
    engineName: match?.name || "Funkin' Backstage",
    engineIcon: match?.icon || '/imgs/icons/app/backstage.png',
  }
}

function resolveCategoryName(category?: string): string {
  if (!category) return ''
  return BACKSTAGE_CATEGORIES.find((c) => c.id === category)?.name || category
}

function toCredits(credits: BackstageRawCredit[] | undefined): ModCreditGroup[] {
  if (!Array.isArray(credits) || credits.length === 0) return []
  const groups = new Map<string, ModCreditGroup['authors']>()
  for (const credit of credits) {
    const roles =
      Array.isArray(credit.roles) && credit.roles.length > 0
        ? credit.roles
        : ['Contributors']
    for (const role of roles) {
      if (!groups.has(role)) groups.set(role, [])
      groups.get(role)!.push({
        id: typeof credit.userId === 'number' ? credit.userId : undefined,
        name: credit.name || 'Contributor',
      })
    }
  }
  return Array.from(groups.entries()).map(([groupName, authors]) => ({
    groupName,
    authors,
  }))
}

export function toBackstageGridMod(mod: BackstageRawMod): GameBananaMod {
  const author = mod.team?.name || mod.submitter?.username || mod.creator || 'Unknown Creator'
  const submittedMs = mod.uploaded ? Date.parse(mod.uploaded) : 0
  const submittedSeconds = submittedMs > 0 ? Math.floor(submittedMs / 1000) : 0
  const updatedMs = mod.updated ? Date.parse(mod.updated) : 0
  const updatedSeconds = updatedMs > 0 ? Math.floor(updatedMs / 1000) : submittedSeconds
  const thumb = mediaUrl(mod.thumbnail)
  const card = mediaUrl(mod.card)
  const { engineId, engineName, engineIcon } = resolveBackstageEngine(mod.engine)

  return {
    id: `backstage:${mod.id}`,
    gameId: FNF_GAME_ID,
    source: 'backstage',
    sourceId: String(mod.id),
    sourceUrl: `https://funkinbackstage.net/mods/${encodeURIComponent(String(mod.id))}`,
    title: mod.title || 'Untitled Mod',
    description: htmlToPlainText(mod.description || ''),
    htmlBody: sanitizeHtml(mod.description || ''),
    author,
    userId: Number(mod.submitter?.id) || 0,
    userPfp:
      mod.submitter?.id != null
        ? `${BACKSTAGE_API_URL}/users/${encodeURIComponent(String(mod.submitter.id))}/avatar`
        : '',
    authors: [author],
    likes: Number(mod.likes) || 0,
    views: Number(mod.views) || 0,
    downloads: Number(mod.downloads) || 0,
    submittedAt: submittedSeconds,
    updatedAt: updatedSeconds,
    timeAgo: submittedSeconds ? getTimeAgo(submittedSeconds) : "Funkin' Backstage",
    engineId,
    engineName,
    engineIcon,
    categoryName: resolveCategoryName(mod.category),
    thumbnail: thumb || card,
    previewMedia: [card, thumb].filter(
      (u, idx, all) => Boolean(u) && all.indexOf(u) === idx,
    ),
    isNsfw: false,
  }
}

export function toBackstageModDetails(mod: BackstageRawMod): GameBananaMod {
  const base = toBackstageGridMod(mod)
  const files: GameBananaFile[] = (Array.isArray(mod.files) ? mod.files : [])
    .map((f, index) => {
      const downloadUrl = mediaUrl(f.url)
      if (!downloadUrl) return null
      const baseName = f.name || f.version || `Download ${index + 1}`
      return {
        _idRow: index + 1,
        _sFile: f.version ? `${baseName} (${f.version})` : baseName,
        _nFilesize: Number(f.size) || 0,
        _sDescription: f.description || '',
        _sDownloadUrl: downloadUrl,
      }
    })
    .filter((f): f is NonNullable<typeof f> => f !== null)

  const screenshots = [
    mod.card,
    ...(Array.isArray(mod.screenshots) ? mod.screenshots : []),
  ]
    .map(mediaUrl)
    .filter((u, idx, all) => Boolean(u) && all.indexOf(u) === idx)

  return {
    ...base,
    description: htmlToPlainText(mod.description || '') || 'No description available.',
    htmlBody: sanitizeHtml(mod.description || '<p>No description available.</p>'),
    previewMedia: screenshots.length > 0 ? screenshots : base.previewMedia || [],
    credits: toCredits(mod.credits),
    files,
    updates: Array.isArray(mod.updates) ? mod.updates : [],
  }
}
