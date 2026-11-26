export type GameJoltSection =
  | 'featured'
  | 'new'
  | 'fresh'
  | 'hot'
  | 'best'
  | 'worst'

export const GAMEJOLT_SECTIONS: Array<{
  id: GameJoltSection
  name: string
  icon: string
}> = [
  { id: 'hot', name: 'Hot', icon: 'local_fire_department' },
  { id: 'featured', name: 'Featured', icon: 'star' },
  { id: 'new', name: 'New', icon: 'new_releases' },
  { id: 'fresh', name: 'Fresh', icon: 'eco' },
  { id: 'best', name: 'Best', icon: 'thumb_up' },
  { id: 'worst', name: 'Worst', icon: 'thumb_down' },
]

export const GAMEJOLT_OS_FILTERS: Array<{
  id: string
  name: string
  icon: string
}> = [
  { id: 'windows', name: 'Windows', icon: 'desktop_windows' },
  { id: 'mac', name: 'Mac', icon: 'laptop_mac' },
  { id: 'linux', name: 'Linux', icon: 'terminal' },
]

export interface GameJoltRawMedia {
  img_url?: string
  mediaserver_url?: string
  img_thumbnail?: string
  width?: number
  height?: number
  media_type?: string
  type?: string
  url?: string
  media_item?: {
    img_url?: string
    mediaserver_url?: string
    img_thumbnail?: string
  }
  thumbnail_media_item?: {
    img_url?: string
    mediaserver_url?: string
  }
}

export interface GameJoltRawGame {
  id: number | string
  title?: string
  slug?: string
  path?: string
  published_on?: number
  posted_on?: number
  follower_count?: number
  like_count?: number
  description?: string
  description_content?: unknown
  img_thumbnail?: string
  thumbnail_media_item?: GameJoltRawMedia
  header_media_item?: GameJoltRawMedia
  developer?: {
    display_name?: string
    name?: string
    username?: string
    img_avatar?: string
  }
}

export interface GameJoltRawBuild {
  id: number | string
  type?: string
  game_release_id?: number | string
  primary_file?: {
    file_name?: string
    filename?: string
    name?: string
    file_size?: number
    filesize?: number
    size?: number
    file?: { name?: string; size?: number }
  }
}
