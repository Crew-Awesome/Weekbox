import type { TwitterNewsSource } from './types'

export const DEFAULT_TWITTER_NEWS_SOURCES: TwitterNewsSource[] = [
  {
    name: 'Funkin News',
    username: 'News_Funkin',
    includeReposts: true,
  },
  {
    name: 'Discussing FNF',
    username: 'Discussingfnf',
  },
  {
    name: 'FNF Developers',
    username: 'FNF_Developers',
    includeReposts: true,
  },
  {
    name: 'Funkin Interviews',
    username: 'Funkininterview',
  },
  {
    name: 'GameBanana FNF',
    username: 'GameBananaFNF',
  },
  {
    name: 'WeekBox',
    username: 'WeekBoxTeam',
    includeReposts: true,
  },
  {
    name: 'DirectMania',
    username: 'DirectMania',
    includeReposts: true,
  },
  {
    name: 'FunkCon',
    username: 'FunkCon24',
    includeReposts: true,
  },
]

export const NEWS_HIDDEN_ACCOUNTS_KEY = 'weekbox_news_hidden_accounts_v1'
export const NEWS_CACHED_POSTS_KEY = 'weekbox_news_cached_posts_v1'
export const NEWS_SEEN_KEY = 'weekbox_news_seen_v1'
export const NEWS_PAGE_SIZE = 12
export const NEWS_SOURCE_CONCURRENCY = 2
export const NEWS_SOURCE_MAX_ATTEMPTS = 3
export const NEWS_SOURCE_RETRY_DELAY = 600

export const FX_TWITTER_PROFILE_API = 'https://api.fxtwitter.com/2/profile'
export const FX_TWITTER_STATUS_API = 'https://api.fxtwitter.com/2/status'
export const FX_TWITTER_VIDEO_HOST = 'https://video.fxtwitter.com'
