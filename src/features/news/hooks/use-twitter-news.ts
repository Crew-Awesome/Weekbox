import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  DEFAULT_TWITTER_NEWS_SOURCES,
  NEWS_HIDDEN_ACCOUNTS_KEY,
  NEWS_CACHED_POSTS_KEY,
  NEWS_PAGE_SIZE,
  fetchTwitterNewsFeed,
  fetchNewsSource,
  type TwitterNewsPost,
  type TwitterNewsSource,
} from '@/services/twitter'
import { initHost } from '@/core/host'

function readPersistedCachedPosts(): TwitterNewsPost[] {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(NEWS_CACHED_POSTS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    }
  } catch {
    // fallback
  }
  return []
}

let globalCachedPosts: TwitterNewsPost[] = readPersistedCachedPosts()
let globalCachedAvailableSources = new Set<string>(
  globalCachedPosts.map((p) => p.sourceUsername || p.username),
)
let globalCachedSourcePages = new Map<string, { cursor?: string; page: number }>()
let isCurrentlyFetching = false

export interface UseTwitterNewsResult {
  posts: TwitterNewsPost[]
  allLoadedPosts: TwitterNewsPost[]
  availableSources: Set<string>
  sources: TwitterNewsSource[]
  selectedAccount: string
  hiddenAccounts: Set<string>
  isLoading: boolean
  isRefreshing: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: string | null
  setSelectedAccount: (username: string) => void
  toggleAccountVisibility: (username: string) => void
  reload: () => Promise<void>
  loadMore: () => Promise<void>
  openExternal: (url: string) => void
}

export function useTwitterNews(): UseTwitterNewsResult {
  const [allLoadedPosts, setAllLoadedPosts] = useState<TwitterNewsPost[]>(globalCachedPosts)
  const [availableSources, setAvailableSources] = useState<Set<string>>(
    globalCachedAvailableSources,
  )
  const [selectedAccount, setSelectedAccountState] = useState<string>('')
  const [hiddenAccounts, setHiddenAccounts] = useState<Set<string>>(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(NEWS_HIDDEN_ACCOUNTS_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            return new Set(parsed.filter((item) => typeof item === 'string'))
          }
        }
      }
    } catch {
      // fallback to empty set
    }
    return new Set<string>()
  })

  const [isLoading, setIsLoading] = useState<boolean>(globalCachedPosts.length === 0)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [visibleCount, setVisibleCount] = useState<number>(NEWS_PAGE_SIZE)
  const [error, setError] = useState<string | null>(null)

  const sourcePagesRef = useRef<Map<string, { cursor?: string; page: number }>>(
    globalCachedSourcePages,
  )

  const writeHiddenAccounts = useCallback((newSet: Set<string>) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          NEWS_HIDDEN_ACCOUNTS_KEY,
          JSON.stringify([...newSet]),
        )
      }
    } catch {
      // ignore
    }
  }, [])

  const toggleAccountVisibility = useCallback(
    (username: string) => {
      if (!username) return
      setHiddenAccounts((prev) => {
        const next = new Set(prev)
        if (next.has(username)) {
          next.delete(username)
        } else {
          next.add(username)
        }
        writeHiddenAccounts(next)
        return next
      })
    },
    [writeHiddenAccounts],
  )

  const setSelectedAccount = useCallback((username: string) => {
    setSelectedAccountState(username)
    setVisibleCount(NEWS_PAGE_SIZE)
  }, [])

  const openExternal = useCallback((url: string) => {
    if (!url) return
    try {
      const hostAdapter = initHost()
      void hostAdapter.openUrl(url).catch(() => {
        window.open(url, '_blank', 'noopener,noreferrer')
      })
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }, [])

  const loadFeed = useCallback(async (isRefresh = false) => {
    if (isCurrentlyFetching) return
    isCurrentlyFetching = true

    if (isRefresh) {
      setIsRefreshing(true)
    } else if (globalCachedPosts.length === 0) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const res = await fetchTwitterNewsFeed(
        DEFAULT_TWITTER_NEWS_SOURCES,
        undefined,
        (batchPosts) => {
          if (batchPosts.length > 0) {
            setAllLoadedPosts(batchPosts)
            globalCachedPosts = batchPosts
            setIsLoading(false)
          }
        },
      )

      if (res.posts.length > 0) {
        setAllLoadedPosts(res.posts)
        setAvailableSources(res.availableSources)
        sourcePagesRef.current = res.sourcePages

        globalCachedPosts = res.posts
        globalCachedAvailableSources = res.availableSources
        globalCachedSourcePages = res.sourcePages

        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(
              NEWS_CACHED_POSTS_KEY,
              JSON.stringify(res.posts.slice(0, 60)),
            )
          }
        } catch {
          // ignore localStorage quota
        }
      } else if (globalCachedPosts.length === 0) {
        setError('No posts could be retrieved from Twitter / X at this moment')
      }
    } catch (err: unknown) {
      console.warn('[WeekBox News] Error fetching news feed:', err)
      if (globalCachedPosts.length === 0) {
        setError(
          err instanceof Error ? err.message : 'Failed to load Twitter news feed',
        )
      }
    } finally {
      isCurrentlyFetching = false
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadFeed(false)
  }, [loadFeed])

  const filteredPosts = useMemo(() => {
    return allLoadedPosts.filter((post) => {
      if (selectedAccount) {
        const target = selectedAccount.toLowerCase()
        return (
          post.username.toLowerCase() === target ||
          (post.sourceUsername && post.sourceUsername.toLowerCase() === target)
        )
      }
      return (
        !hiddenAccounts.has(post.username) &&
        (!post.sourceUsername || !hiddenAccounts.has(post.sourceUsername))
      )
    })
  }, [allLoadedPosts, selectedAccount, hiddenAccounts])

  const visiblePosts = useMemo(() => {
    return filteredPosts.slice(0, visibleCount)
  }, [filteredPosts, visibleCount])

  const hasMore = visiblePosts.length < filteredPosts.length || Boolean(
    [...sourcePagesRef.current.values()].some((p) => Boolean(p.cursor)),
  )

  const loadMore = useCallback(async () => {
    if (isLoadingMore) return

    if (visibleCount < filteredPosts.length) {
      setVisibleCount((prev) => prev + NEWS_PAGE_SIZE)
      return
    }

    const activeSources = DEFAULT_TWITTER_NEWS_SOURCES.filter((s) => {
      if (selectedAccount) {
        return s.username.toLowerCase() === selectedAccount.toLowerCase()
      }
      return !hiddenAccounts.has(s.username)
    })

    const sourcesWithCursor = activeSources.filter((s) => {
      const pageInfo = sourcePagesRef.current.get(s.username)
      return pageInfo?.cursor && (pageInfo.page || 1) < 5
    })

    if (sourcesWithCursor.length === 0) return

    setIsLoadingMore(true)
    try {
      const moreResults = await Promise.allSettled(
        sourcesWithCursor.map(async (source) => {
          const pageInfo = sourcePagesRef.current.get(source.username)
          try {
            const result = await fetchNewsSource(source, undefined, {
              cursor: pageInfo?.cursor,
            })
            sourcePagesRef.current.set(source.username, {
              cursor: result.cursor,
              page: (pageInfo?.page || 1) + 1,
            })
            return result.posts
          } catch {
            return []
          }
        }),
      )

      const flattened: TwitterNewsPost[] = []
      for (const res of moreResults) {
        if (res.status === 'fulfilled') {
          flattened.push(...res.value)
        }
      }

      if (flattened.length > 0) {
        setAllLoadedPosts((prev) => {
          const map = new Map<string, TwitterNewsPost>()
          prev.forEach((p) => map.set(p.id, p))
          flattened.forEach((p) => map.set(p.id, p))
          const merged = [...map.values()].sort(
            (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
          )
          globalCachedPosts = merged
          return merged
        })
        setVisibleCount((prev) => prev + NEWS_PAGE_SIZE)
      }
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, visibleCount, filteredPosts.length, selectedAccount, hiddenAccounts])

  const reload = useCallback(async () => {
    await loadFeed(true)
  }, [loadFeed])

  return {
    posts: visiblePosts,
    allLoadedPosts,
    availableSources,
    sources: DEFAULT_TWITTER_NEWS_SOURCES,
    selectedAccount,
    hiddenAccounts,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    error,
    setSelectedAccount,
    toggleAccountVisibility,
    reload,
    loadMore,
    openExternal,
  }
}
