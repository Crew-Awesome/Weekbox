import { getModById, type GameBananaMod } from '@/services/gamebanana'
import {
  getGameJoltModDetails,
  resolveGameJoltBuildDownloadUrl,
} from '@/services/gamejolt'
import { getBackstageModDetails } from '@/services/backstage'

export type ModProviderId = 'gamebanana' | 'gamejolt' | 'backstage'

export const MOD_PROVIDERS: Array<{
  id: ModProviderId
  name: string
  icon: string
}> = [
  { id: 'gamebanana', name: 'GameBanana', icon: '/imgs/icons/app/gamebanana.webp' },
  { id: 'gamejolt', name: 'GameJolt', icon: '/imgs/icons/app/gamejolt.png' },
  { id: 'backstage', name: "Funkin' Backstage", icon: '/imgs/icons/app/backstage.png' },
]

export async function getProviderModDetails(
  rawId: string | number,
): Promise<GameBananaMod | null> {
  const str = String(rawId || '').trim()
  if (!str) return null

  if (str.startsWith('gamejolt:')) {
    return getGameJoltModDetails(str)
  }
  if (str.startsWith('backstage:')) {
    return getBackstageModDetails(str)
  }

  const num = Number(str)
  if (!Number.isNaN(num) && num > 0) {
    return getModById(num)
  }
  return null
}

export async function resolveProviderDownloadUrl(rawUrl: string): Promise<string> {
  if (rawUrl.startsWith('gamejolt-build://')) {
    return resolveGameJoltBuildDownloadUrl(rawUrl)
  }
  return rawUrl
}

export function parseProviderDirectInput(
  rawInput: string,
): { provider: ModProviderId; id: string } | null {
  const trimmed = rawInput.trim()
  if (!trimmed) return null

  const gjPrefix = trimmed.match(/^gamejolt:(\d+)$/i)
  if (gjPrefix) return { provider: 'gamejolt', id: gjPrefix[1] }

  const gjUrl = trimmed.match(/gamejolt\.com\/games\/(?:[^/]+\/)?(\d+)/i)
  if (gjUrl) return { provider: 'gamejolt', id: gjUrl[1] }

  const bsPrefix = trimmed.match(/^backstage:(.+)$/i)
  if (bsPrefix) return { provider: 'backstage', id: bsPrefix[1].trim() }

  const bsUrl = trimmed.match(/funkinbackstage\.net\/mods\/([^/?#]+)/i)
  if (bsUrl) return { provider: 'backstage', id: decodeURIComponent(bsUrl[1]) }

  const gbMatch = trimmed.match(
    /^(?:https?:\/\/gamebanana\.com\/mods\/|mods\/)?(\d+)(?:[/?#]|$)/i,
  )
  if (gbMatch) return { provider: 'gamebanana', id: gbMatch[1] }

  return null
}
