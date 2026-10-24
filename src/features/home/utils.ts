import type { ModItem } from '@/ui/mod-details-modal'
import {
  getEngineIcon,
  upgradeGameBananaImageUrl,
  ENGINE_CATEGORIES,
  type GameBananaMod,
} from '@/services/gamebanana'
import { normalizeTimestamp } from '@/utils'

/**
 * Maps a raw `GameBananaMod` payload into a normalized `ModItem` for UI cards and modals.
 */
export function mapToModItem(mod: GameBananaMod): ModItem {
  const engineCategory = Object.values(ENGINE_CATEGORIES).find(
    (c) => c.id === mod.engineId,
  )
  const resolvedIcon =
    mod.engineIcon ||
    engineCategory?.icon ||
    (mod.engineId ? getEngineIcon(mod.engineId) : undefined)

  const highResThumb = upgradeGameBananaImageUrl(mod.thumbnail)
  const highResPreviews =
    mod.previewMedia && mod.previewMedia.length > 0
      ? mod.previewMedia.map((url) => upgradeGameBananaImageUrl(url))
      : [highResThumb]

  return {
    id: mod.id,
    name: mod.title,
    title: mod.title,
    description: mod.description,
    htmlBody: mod.htmlBody,
    img: highResThumb,
    image: highResThumb,
    thumbnail: highResThumb,
    author: mod.author,
    userPfp: mod.userPfp,
    authors: mod.authors?.map((name) => ({ name })) || [{ name: mod.author }],
    credits: mod.credits,
    icon: resolvedIcon,
    engineIcon: resolvedIcon,
    engineId: mod.engineId,
    engineName:
      engineCategory?.name ||
      (mod.engineId && mod.engineId !== 'unknown'
        ? mod.engineId.toUpperCase()
        : 'Friday Night Funkin'),
    badge: mod.__featuredLabel || 'Featured',
    submittedAt: normalizeTimestamp(mod.submittedAt) ?? Date.now(),
    updatedAt: normalizeTimestamp(mod.updatedAt) ?? undefined,
    likes: mod.likes,
    views: mod.views,
    downloads: mod.downloads,
    isNsfw: mod.isNsfw,
    previewMedia: highResPreviews,
    files: mod.files || [],
  }
}
