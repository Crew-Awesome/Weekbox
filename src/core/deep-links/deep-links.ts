import { focusWeekBoxWindow } from './windows-protocol'

export type DeepLinkProvider = 'gamebanana' | 'gamejolt' | 'backstage'

export interface WeekBoxDeepLinkTarget {
  provider: DeepLinkProvider
  id: string
  modId: string
  fileId?: string
  rawLink: string
}

export const WEEKBOX_DEEP_LINK_EVENT = 'wb:open-deep-link'

let pendingDeepLinkTarget: WeekBoxDeepLinkTarget | null = null

export function stripSurroundingQuotes(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/^"+|"+$/g, '')
}

export function getWeekBoxLinkFromArgs(
  args: unknown = typeof window === 'undefined' ? [] : (window as unknown as { NL_ARGS?: unknown }).NL_ARGS,
): string | null {
  if (!Array.isArray(args)) return null
  for (const arg of args) {
    if (typeof arg !== 'string') continue
    const clean = stripSurroundingQuotes(arg)
    if (clean.toLowerCase().startsWith('weekbox:')) {
      return clean
    }
  }
  return null
}

/**
 * Parses `weekbox://` deep-link URLs including GameBanana one-click installer
 * formats (`weekbox://mod/<id>`, `weekbox://mod,<id>`, `weekbox://mods/<id>`),
 * plus provider links (`weekbox://gamejolt/<id>`, `weekbox://backstage/<slug>`).
 */
export function parseWeekBoxLink(value: unknown): WeekBoxDeepLinkTarget | null {
  const link = stripSurroundingQuotes(value)
  if (!link || !/^weekbox:/i.test(link)) return null

  const modMatch = link.match(
    /^weekbox:\/\/mods?(?:\/|,)(\d+)(?:,(\d+))?(?:[/?#].*)?$/i,
  )
  if (modMatch) {
    return {
      provider: 'gamebanana',
      id: modMatch[1],
      modId: modMatch[1],
      ...(modMatch[2] ? { fileId: modMatch[2] } : {}),
      rawLink: link,
    }
  }

  const gjMatch = link.match(/^weekbox:\/\/gamejolt(?:\/|,)(\d+)(?:[/?#].*)?$/i)
  if (gjMatch) {
    return {
      provider: 'gamejolt',
      id: gjMatch[1],
      modId: `gamejolt:${gjMatch[1]}`,
      rawLink: link,
    }
  }

  const bsMatch = link.match(
    /^weekbox:\/\/backstage(?:\/|,)([^/?#]+)(?:[/?#].*)?$/i,
  )
  if (bsMatch) {
    const cleanId = decodeURIComponent(bsMatch[1]).trim()
    if (!cleanId) return null
    return {
      provider: 'backstage',
      id: cleanId,
      modId: `backstage:${cleanId}`,
      rawLink: link,
    }
  }

  const bareNumMatch = link.match(/^weekbox:\/\/(\d+)(?:[/?#].*)?$/i)
  if (bareNumMatch) {
    return {
      provider: 'gamebanana',
      id: bareNumMatch[1],
      modId: bareNumMatch[1],
      rawLink: link,
    }
  }

  try {
    const url = new URL(link)
    if (url.protocol !== 'weekbox:') return null
    const host = url.hostname.toLowerCase()
    const pathSegment = decodeURIComponent(url.pathname.replace(/^\/+|\/+$/g, '')).split('/')[0]

    if ((host === 'mod' || host === 'mods') && /^\d+$/.test(pathSegment)) {
      return {
        provider: 'gamebanana',
        id: pathSegment,
        modId: pathSegment,
        rawLink: link,
      }
    }
    if (host === 'gamejolt' && /^\d+$/.test(pathSegment)) {
      return {
        provider: 'gamejolt',
        id: pathSegment,
        modId: `gamejolt:${pathSegment}`,
        rawLink: link,
      }
    }
    if (host === 'backstage' && pathSegment) {
      return {
        provider: 'backstage',
        id: pathSegment,
        modId: `backstage:${pathSegment}`,
        rawLink: link,
      }
    }
  } catch {
    return null
  }

  return null
}

export function consumePendingDeepLinkTarget(): WeekBoxDeepLinkTarget | null {
  const next = pendingDeepLinkTarget
  pendingDeepLinkTarget = null
  return next
}

export function dispatchWeekBoxDeepLink(target: WeekBoxDeepLinkTarget): void {
  pendingDeepLinkTarget = target
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<WeekBoxDeepLinkTarget>(WEEKBOX_DEEP_LINK_EVENT, {
        detail: target,
      }),
    )
  }
}

export async function openWeekBoxLink(value: unknown): Promise<boolean> {
  const target = parseWeekBoxLink(value)
  if (!target) return false
  await focusWeekBoxWindow()
  dispatchWeekBoxDeepLink(target)
  return true
}
