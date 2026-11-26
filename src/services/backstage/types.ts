export type BackstageSort =
  | 'activity'
  | 'downloads'
  | 'likes'
  | 'views'
  | 'added'
  | 'stars'

export const BACKSTAGE_SORTS: Array<{
  id: BackstageSort
  name: string
  icon: string
}> = [
  { id: 'activity', name: 'Recently Active', icon: 'bolt' },
  { id: 'downloads', name: 'Most Downloaded', icon: 'download' },
  { id: 'likes', name: 'Most Liked', icon: 'favorite' },
  { id: 'views', name: 'Most Viewed', icon: 'visibility' },
  { id: 'added', name: 'Recently Added', icon: 'new_releases' },
  { id: 'stars', name: 'Most Starred', icon: 'star' },
]

export const BACKSTAGE_ENGINES: Array<{
  id: string
  mappedId: string
  name: string
  icon: string
}> = [
  {
    id: 'base-game',
    mappedId: 'vslice',
    name: 'Base Game',
    icon: '/imgs/icons/categories/vslice.png',
  },
  {
    id: 'codename-engine',
    mappedId: 'codename',
    name: 'Codename Engine',
    icon: '/imgs/icons/categories/codename.png',
  },
  {
    id: 'psych-engine',
    mappedId: 'psych',
    name: 'Psych Engine',
    icon: '/imgs/icons/categories/psych.png',
  },
  {
    id: 'kade-engine',
    mappedId: 'kade',
    name: 'Kade Engine',
    icon: '/imgs/icons/categories/kade.png',
  },
  {
    id: 'fps-plus',
    mappedId: 'fpsplus',
    name: 'FPS Plus',
    icon: '/imgs/icons/categories/fpsplus.png',
  },
  {
    id: 'other',
    mappedId: 'unknown',
    name: 'Other',
    icon: '/imgs/icons/app/backstage.png',
  },
]

export const BACKSTAGE_CATEGORIES: Array<{ id: string; name: string }> = [
  { id: 'full-mods', name: 'Full Mods' },
  { id: 'modpacks', name: 'Modpacks' },
  { id: 'ports', name: 'Ports' },
  { id: 'scripts', name: 'Scripts' },
  { id: 'tools', name: 'Tools' },
  { id: 'wips', name: 'Work in Progress' },
]

export interface BackstageRawFile {
  name?: string
  version?: string
  description?: string
  size?: number
  url?: string
}

export interface BackstageRawCredit {
  name?: string
  roles?: string[]
  userId?: number | string | null
}

export interface BackstageRawMod {
  id: string | number
  title?: string
  creator?: string
  team?: { name?: string }
  submitter?: { id?: number | string; username?: string }
  thumbnail?: string
  card?: string
  icon?: string
  screenshots?: string[]
  description?: string
  likes?: number
  views?: number
  downloads?: number
  stars?: number
  ratings?: number
  uploaded?: string
  updated?: string
  engine?: string
  category?: string
  files?: BackstageRawFile[]
  credits?: BackstageRawCredit[]
  updates?: unknown[]
}
