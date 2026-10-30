export interface TwitterNewsSource {
  name: string
  username: string
  includeReposts?: boolean
  avatarUrl?: string
}

export interface TwitterMediaVideo {
  url: string
  thumbnailUrl: string
  sources: string[]
}

export interface TwitterStats {
  likes?: number
  reposts?: number
  replies?: number
  quotes?: number
  views?: number
}

export interface TwitterNewsPost {
  id: string
  text: string
  sourceName: string
  username: string
  sourceUsername?: string
  avatarUrl: string
  publishedAt: string
  link: string
  images: string[]
  videos: TwitterMediaVideo[]
  stats: TwitterStats
  quote: TwitterNewsPost | null
  isRetweet?: boolean
}

export interface FetchSourceResult {
  cursor?: string
  posts: TwitterNewsPost[]
}

export interface TwitterNewsFeedState {
  posts: TwitterNewsPost[]
  availableSources: Set<string>
  sourcePages: Map<string, { cursor?: string; page: number }>
  isLoading: boolean
  isInitialLoading: boolean
  error: string | null
}

