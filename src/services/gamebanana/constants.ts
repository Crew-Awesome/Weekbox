export const FNF_GAME_ID = 8694

export interface EngineCategoryInfo {
  id: string
  name: string
  icon: string
}

export const ENGINE_CATEGORIES: Record<number, EngineCategoryInfo> = {
  29202: {
    id: 'vslice',
    name: 'V-Slice / Base Game',
    icon: '/imgs/icons/categories/vslice.png',
  },
  43777: {
    id: 'vslice',
    name: 'V-Slice / Base Game',
    icon: '/imgs/icons/categories/vslice.png',
  },
  28367: {
    id: 'psych',
    name: 'Psych Engine',
    icon: '/imgs/icons/categories/psych.png',
  },
  34764: {
    id: 'codename',
    name: 'Codename Engine',
    icon: '/imgs/icons/categories/codename.png',
  },
  3827: {
    id: 'executable',
    name: 'Executable Mods',
    icon: '/imgs/icons/categories/exe.png',
  },
  43798: {
    id: 'pslice',
    name: 'P-Slice Engine',
    icon: '/imgs/icons/categories/pslice.png',
  },
  43850: {
    id: 'fpsplus',
    name: 'FPS Plus',
    icon: '/imgs/icons/categories/fpsplus.png',
  },
  43788: {
    id: 'psychonline',
    name: 'Psych Online',
    icon: '/imgs/icons/categories/psychonline.png',
  },
}

export const EXCLUDED_CATEGORIES = new Set([43772, 3833, 44037])

export const ALLOW_NSFW = true

export const GB_BASE_URL = 'https://gamebanana.com/apiv11'

export function getSupportedEngineCategories(isMobileOverride?: boolean): Array<{
  key: number
  id: string
  name: string
  icon: string
  isCustom?: boolean
}> {
  const isMobile =
    isMobileOverride !== undefined
      ? isMobileOverride
      : typeof window !== 'undefined' && window.innerWidth < 768

  const seenIds = new Set<string>()
  return Object.entries(ENGINE_CATEGORIES)
    .filter(([, cat]) => {
      if (seenIds.has(cat.id)) return false
      seenIds.add(cat.id)
      if (isMobile) {
        return cat.id === 'pslice' || cat.id === 'codename' || cat.id === 'vslice'
      }
      return true
    })
    .map(([key, cat]) => ({
      key: Number(key),
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      isCustom: false,
    }))
}
