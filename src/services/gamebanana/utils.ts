import {
  ENGINE_CATEGORIES,
  EXCLUDED_CATEGORIES,
  ALLOW_NSFW,
} from './constants'
import type {
  GameBananaRawRecord,
  GameBananaCategoryNode,
  ModCreditAuthor,
  ModCreditGroup,
} from './types'

export type { ModCreditAuthor, ModCreditGroup }

export function getTimeAgo(timestamp?: number): string {
  if (!timestamp) return 'Unknown'
  const seconds = Math.floor(Date.now() / 1000) - timestamp
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(days / 365)
  return `${years}y ago`
}

export function getEngineId(record?: GameBananaRawRecord | null): string {
  if (!record) return 'unknown'

  const directId = record.engineId || record.engine?.id
  if (typeof directId === 'string' && directId !== 'unknown') {
    const directMatch = Object.values(ENGINE_CATEGORIES).find(
      (c) => c.id.toLowerCase() === directId.toLowerCase(),
    )
    if (directMatch) return directMatch.id
  }

  const extractId = (cat?: GameBananaCategoryNode) => {
    if (!cat) return null
    if (cat._idRow) return cat._idRow
    if (cat._sProfileUrl) {
      return parseInt(cat._sProfileUrl.split('/').pop() || '0', 10)
    }
    return null
  }

  const ids = [
    extractId(record._aCategory),
    extractId(record._aSuperCategory),
    extractId(record._aRootCategory),
    extractId(record._aSubCategory),
    record.__injectedCategoryId,
  ]

  for (const id of ids) {
    if (id && ENGINE_CATEGORIES[id]) {
      return ENGINE_CATEGORIES[id].id
    }
  }

  const names = [
    record._aCategory?._sName,
    record._aSuperCategory?._sName,
    record._aRootCategory?._sName,
    record._aSubCategory?._sName,
    record.categoryName,
    record.engine?.name,
  ]
    .filter((s): s is string => Boolean(s))
    .map((s) => s.toLowerCase())

  for (const name of names) {
    if (
      name.includes('v-slice') ||
      name.includes('vslice') ||
      name.includes('base game') ||
      name.includes('basegame') ||
      name.includes('juego base') ||
      name.includes('(base)') ||
      name.includes('base /') ||
      name.includes('/ base') ||
      name.split(/\s+/).includes('base')
    ) {
      return 'vslice'
    }
    if (name.includes('psych online')) return 'psychonline'
    if (name.includes('psych')) return 'psych'
    if (name.includes('codename')) return 'codename'
    if (name.includes('p-slice') || name.includes('pslice')) return 'pslice'
    if (name.includes('fps plus') || name.includes('fpsplus')) return 'fpsplus'
    if (name.includes('executable')) return 'executable'
  }

  return 'unknown'
}

export function getEngineIcon(engineId: string): string | undefined {
  const match = Object.values(ENGINE_CATEGORIES).find((c) => c.id === engineId)
  return match?.icon
}

export function checkIsNsfw(record: GameBananaRawRecord): boolean {
  if (record._bIsNsfw || record._bContainsNsfw) return true

  const ids = [
    record._aCategory?._idRow,
    record._aSuperCategory?._idRow,
    record._aRootCategory?._idRow,
    record._aSubCategory?._idRow,
  ]
  return ids.includes(43772)
}

export function isExcluded(record: GameBananaRawRecord): boolean {
  if (!ALLOW_NSFW && checkIsNsfw(record)) return true

  const ids = [
    record._aCategory?._idRow,
    record._aSuperCategory?._idRow,
    record._aRootCategory?._idRow,
    record._aSubCategory?._idRow,
  ]
  for (const id of ids) {
    if (id && EXCLUDED_CATEGORIES.has(id)) {
      if (ALLOW_NSFW && id === 43772) continue
      return true
    }
  }
  return false
}

export function extractAuthors(metaCredits: unknown): string[] {
  const authors: string[] = []
  if (metaCredits && typeof metaCredits === 'object') {
    for (const group of Object.values(metaCredits)) {
      if (Array.isArray(group)) {
        for (const credit of group) {
          if (Array.isArray(credit) && typeof credit[0] === 'string') {
            authors.push(credit[0])
          }
        }
      }
    }
  }
  return Array.from(new Set(authors))
}

export function extractCreditGroups(rawCredits: unknown): ModCreditGroup[] {
  if (!rawCredits) return []
  const groups: ModCreditGroup[] = []

  const parseAuthor = (item: unknown): ModCreditAuthor | null => {
    if (!item) return null
    if (typeof item === 'string') {
      const trimmed = item.trim()
      return trimmed ? { name: trimmed } : null
    }
    if (Array.isArray(item)) {
      const name = item[0] ? String(item[0]).trim() : ''
      if (!name) return null
      return {
        name,
        role: item[1] ? String(item[1]).trim() : undefined,
        id: typeof item[2] === 'number' ? item[2] : undefined,
      }
    }
    if (typeof item === 'object') {
      const obj = item as Record<string, unknown>
      const name = obj._sName || obj.name || obj._sMemberName
      if (!name) return null
      const roleVal = obj._sRole || obj.role
      const avatarVal = obj._sAvatarUrl || obj.avatarUrl || obj._sMemberAvatarUrl
      const idVal = obj._idRow || obj.id || obj._nMemberId
      return {
        name: String(name).trim(),
        role: roleVal ? String(roleVal).trim() : undefined,
        avatarUrl: typeof avatarVal === 'string' ? avatarVal : undefined,
        id: typeof idVal === 'number' ? idVal : undefined,
      }
    }
    return null
  }

  if (Array.isArray(rawCredits)) {
    for (const group of rawCredits) {
      if (!group || typeof group !== 'object') {
        const parsed = parseAuthor(group)
        if (parsed) {
          let defaultGroup = groups.find((g) => g.groupName === 'Contributors')
          if (!defaultGroup) {
            defaultGroup = { groupName: 'Contributors', authors: [] }
            groups.push(defaultGroup)
          }
          defaultGroup.authors.push(parsed)
        }
        continue
      }

      const grp = group as Record<string, unknown>
      if (grp._sGroupName || grp.groupName || grp._aAuthors || grp.authors) {
        const groupName = String(grp._sGroupName || grp.groupName || 'Contributors')
        const rawAuthors = grp._aAuthors || grp.authors || []
        const authors: ModCreditAuthor[] = []
        if (Array.isArray(rawAuthors)) {
          for (const a of rawAuthors) {
            const parsed = parseAuthor(a)
            if (parsed) authors.push(parsed)
          }
        }
        if (authors.length > 0) {
          groups.push({ groupName, authors })
        }
      } else {
        const parsed = parseAuthor(group)
        if (parsed) {
          let defaultGroup = groups.find((g) => g.groupName === 'Contributors')
          if (!defaultGroup) {
            defaultGroup = { groupName: 'Contributors', authors: [] }
            groups.push(defaultGroup)
          }
          defaultGroup.authors.push(parsed)
        }
      }
    }
  } else if (typeof rawCredits === 'object') {
    for (const [key, val] of Object.entries(rawCredits)) {
      if (!val) continue
      const authors: ModCreditAuthor[] = []
      if (Array.isArray(val)) {
        for (const a of val) {
          const parsed = parseAuthor(a)
          if (parsed) authors.push(parsed)
        }
      } else {
        const parsed = parseAuthor(val)
        if (parsed) authors.push(parsed)
      }
      if (authors.length > 0) {
        groups.push({ groupName: key, authors })
      }
    }
  }

  return groups
}

export function upgradeGameBananaImageUrl(url?: string): string {
  if (!url) return ''
  return url.replace(/_220\.(webp|png|jpe?g)$/i, '_800.$1')
}

export function extractPreviewMedia(record?: GameBananaRawRecord | null): string[] {
  if (!record) return []

  if (Array.isArray(record.previewMedia) && record.previewMedia.length > 0) {
    const valid = record.previewMedia
      .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
      .map((url) => upgradeGameBananaImageUrl(url))
    if (valid.length > 0) return valid
  }

  const images = record._aPreviewMedia?._aImages || record._aImages
  if (Array.isArray(images)) {
    return images
      .filter(
        (img) =>
          img &&
          typeof img === 'object' &&
          Boolean(img._sBaseUrl) &&
          Boolean(img._sFile800 || img._sFile || img._sFile530 || img._sFile220),
      )
      .map(
        (img) =>
          `${img._sBaseUrl}/${img._sFile800 || img._sFile || img._sFile530 || img._sFile220}`,
      )
  }
  return []
}

export function extractThumbnail(record?: GameBananaRawRecord | null): string {
  const images = record?._aPreviewMedia?._aImages
  if (Array.isArray(images) && images.length > 0) {
    const first = images[0]
    if (first?._sBaseUrl) {
      const file =
        first._sFile800 || first._sFile || first._sFile530 || first._sFile220
      if (file) {
        return `${first._sBaseUrl}/${file}`
      }
    }
  }
  return '/imgs/images/placeholder-mini.webp'
}

export function extractUserId(record?: GameBananaRawRecord | null): number {
  return record?._aSubmitter?._idRow || 0
}

export function extractUserPfp(record?: GameBananaRawRecord | null): string {
  if (!record) return ''
  let url = ''
  if (record._aSubmitter?._sAvatarUrl) {
    url = record._aSubmitter._sAvatarUrl
  } else if (
    record._aSubmitter?._aAvatar?._sBaseUrl &&
    record._aSubmitter?._aAvatar?._sFile
  ) {
    url = `${record._aSubmitter._aAvatar._sBaseUrl}/${record._aSubmitter._aAvatar._sFile}`
  }

  if (!url) return ''

  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('default') || lowerUrl.includes('avatar.png')) {
    return ''
  }

  return url
}
