import React, { useState, useEffect, useMemo } from 'react'
import type { TwitterNewsPost } from '@/services/twitter'
import { NewsPostCard } from './NewsPostCard'

interface NewsMasonryGridProps {
  posts: TwitterNewsPost[]
  onOpenExternal: (url: string) => void
  onSelectMedia: (media: { type: 'image' | 'video'; url: string; videoSources?: string[] }) => void
}

function getMasonryColumnCount(width: number): number {
  if (width < 640) return 1
  if (width < 1080) return 2
  if (width < 1560) return 3
  return 4
}

export const NewsMasonryGrid: React.FC<NewsMasonryGridProps> = ({
  posts,
  onOpenExternal,
  onSelectMedia,
}) => {
  const [columnCount, setColumnCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return getMasonryColumnCount(window.innerWidth)
    }
    return 2
  })

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setColumnCount(getMasonryColumnCount(window.innerWidth))
      }, 100)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const columns = useMemo(() => {
    const cols: TwitterNewsPost[][] = Array.from({ length: columnCount }, () => [])
    posts.forEach((post, index) => {
      cols[index % columnCount].push(post)
    })
    return cols
  }, [posts, columnCount])

  if (columnCount === 1) {
    return (
      <div className="flex flex-col gap-4 w-full">
        {posts.map((post) => (
          <NewsPostCard
            key={`news-post-${post.id}`}
            post={post}
            onOpenExternal={onOpenExternal}
            onSelectMedia={onSelectMedia}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-4 items-start w-full">
      {columns.map((colPosts, colIdx) => (
        <div
          key={`masonry-col-${colIdx}`}
          className="flex-1 flex flex-col gap-4 min-w-0"
        >
          {colPosts.map((post) => (
            <NewsPostCard
              key={`news-post-${post.id}`}
              post={post}
              onOpenExternal={onOpenExternal}
              onSelectMedia={onSelectMedia}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

