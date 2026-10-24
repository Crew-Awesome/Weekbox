import { getTimeAgo, getEngineIcon, upgradeGameBananaImageUrl } from '../utils'
import { sanitizeHtml, htmlToPlainText } from '../sanitize'
import type { GameBananaMod } from '../types'
import type { FeaturedSchema, FeaturedModRaw } from './types'
import { FNF_GAME_ID } from '../constants'
import { getMods } from '../api/getMods'

export const FEATURED_URL =
  'https://raw.githubusercontent.com/Crew-Awesome/weekbox.featured/main/public/featured.json'

function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
}

/**
 * Service that fetches curated featured mods and backfills categories if needed.
 */
export class FeaturedService {
  private url: string

  constructor(url: string = FEATURED_URL) {
    this.url = url
  }

  public async getCarousel(): Promise<GameBananaMod[]> {
    try {
      const raw = await fetch(this.url)
      if (!raw.ok) throw new Error(`GitHub HTTP error: ${raw.status}`)

      const response = (await raw.json()) as unknown

      if (!this.isSupported(response)) {
        throw new Error('Unsupported featured schema')
      }

      let mods = this.flatten(response)
      if (isMobile()) {
        mods = mods.filter((m) => {
          const eid = String(m.engineId || '').toLowerCase()
          const title = String(m.title || '').toLowerCase()
          return eid !== 'executable' && eid !== '3827' && !title.endsWith('.exe')
        })
      }

      const categoryLabels = Array.from(new Set(response.rankings.map((r) => r.label)))
      const countsByLabel: Record<string, number> = {}
      for (const m of mods) {
        const label = m.__featuredLabel || 'Featured'
        countsByLabel[label] = (countsByLabel[label] || 0) + 1
      }

      const needsBackfill = categoryLabels.some((lbl) => (countsByLabel[lbl] || 0) < 4)

      if (needsBackfill) {
        try {
          const candidateMods = await getMods('popular', 1, 30)
          const validCandidates = candidateMods.filter((c) => {
            const eid = String(c.engineId || '').toLowerCase()
            const title = String(c.title || '').toLowerCase()
            return eid !== 'executable' && eid !== '3827' && !title.endsWith('.exe')
          })

          const existingIds = new Set(mods.map((m) => m.id))
          const enrichedMods: GameBananaMod[] = []

          for (const label of categoryLabels) {
            const currentForLabel = mods.filter((m) => m.__featuredLabel === label)
            enrichedMods.push(...currentForLabel)
            const deficit = 4 - currentForLabel.length
            if (deficit > 0) {
              let added = 0
              for (const cand of validCandidates) {
                if (!existingIds.has(cand.id)) {
                  existingIds.add(cand.id)
                  enrichedMods.push({
                    ...cand,
                    __isCommunityPick: true,
                    __featuredLabel: label,
                  })
                  added++
                  if (added >= deficit) break
                }
              }
            }
          }
          if (enrichedMods.length > 0) {
            mods = enrichedMods
          }
        } catch (e) {
          console.warn('Could not backfill featured mods:', e)
        }
      }

      if (mods.length === 0) throw new Error('No featured mods')

      return mods
    } catch (error) {
      console.warn('FeaturedService error (static JSON failed):', error)
      return []
    }
  }

  private isSupported(featured: unknown): featured is FeaturedSchema {
    if (!featured || typeof featured !== 'object') return false
    const f = featured as Record<string, unknown>
    return (
      f.schemaVersion === 3 &&
      typeof f.revision === 'string' &&
      Array.isArray(f.rankings) &&
      f.rankings.every((ranking) => {
        if (!ranking || typeof ranking !== 'object') return false
        const r = ranking as Record<string, unknown>
        return (
          Array.isArray(r.mods) &&
          r.mods.every((mod) => {
            if (!mod || typeof mod !== 'object') return false
            const m = mod as Record<string, unknown>
            const engine = m.engine as Record<string, unknown> | undefined
            const category = m.category as Record<string, unknown> | undefined
            return (
              Number.isFinite(Number(m.id)) &&
              typeof m.title === 'string' &&
              typeof m.author === 'string' &&
              typeof m.image === 'string' &&
              typeof engine?.id === 'string' &&
              typeof engine?.name === 'string' &&
              typeof engine?.icon === 'string' &&
              Number.isFinite(Number(category?.id)) &&
              typeof category?.name === 'string'
            )
          })
        )
      })
    )
  }

  private flatten(featured: FeaturedSchema): GameBananaMod[] {
    if (!Array.isArray(featured?.rankings)) return []

    return featured.rankings.flatMap((ranking) =>
      ranking.mods.map((mod: FeaturedModRaw): GameBananaMod => {
        const resolvedIcon =
          getEngineIcon(mod.engine.id) ||
          (mod.engine.icon?.startsWith('/')
            ? mod.engine.icon
            : `/imgs/icons/categories/${mod.engine.icon}`)

        const highResImg = upgradeGameBananaImageUrl(mod.image)

        return {
          id: mod.id,
          gameId: FNF_GAME_ID,
          title: mod.title,
          description: htmlToPlainText(mod.description || 'Featured Mod'),
          htmlBody: sanitizeHtml(mod.description || 'Featured Mod'),
          author: mod.author,
          userId: 0,
          userPfp: '',
          authors: [mod.author],
          likes: mod.likes || 0,
          views: mod.views || 0,
          downloads: mod.downloads || 0,
          submittedAt: mod.publishedAt,
          timeAgo: getTimeAgo(mod.publishedAt),
          engineId: mod.engine.id,
          engineIcon: resolvedIcon,
          thumbnail: highResImg,
          previewMedia: [highResImg],
          isNsfw: false,
          __featuredLabel: ranking.label,
          __featuredCategoryId: mod.category.id,
        }
      }),
    )
  }
}
