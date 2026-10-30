import React from 'react'
import type { TwitterNewsPost } from '@/services/twitter'
import { NewsPostText } from './NewsPostText'
import { NewsMediaGrid } from './NewsMediaGrid'

interface NewsQuoteCardProps {
  quote: TwitterNewsPost
  onOpenExternal?: (url: string) => void
  onSelectMedia?: (media: { type: 'image' | 'video'; url: string; videoSources?: string[] }) => void
}

export const NewsQuoteCard: React.FC<NewsQuoteCardProps> = ({
  quote,
  onOpenExternal,
  onSelectMedia,
}) => {
  return (
    <div
      className="mt-3 p-3.5 rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[color-mix(in_srgb,var(--md-sys-color-surface-container-high)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--md-sys-color-surface-container-high)_70%,transparent)] transition-colors cursor-pointer"
      onClick={() => {
        if (quote.link && onOpenExternal) {
          onOpenExternal(quote.link)
        }
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        {quote.avatarUrl ? (
          <img
            src={quote.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-5 h-5 rounded-full object-cover shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center text-[10px] font-bold shrink-0">
            {quote.sourceName.charAt(0)}
          </div>
        )}
        <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface)] truncate">
          {quote.sourceName}
        </span>
        {quote.username && (
          <span className="text-xs text-[var(--md-sys-color-on-surface-variant)] truncate">
            @{quote.username}
          </span>
        )}
      </div>

      {quote.text && (
        <NewsPostText
          text={quote.text}
          maxCollapsedLength={160}
          onOpenExternal={onOpenExternal}
        />
      )}

      {(quote.images.length > 0 || quote.videos.length > 0) && (
        <NewsMediaGrid
          images={quote.images}
          videos={quote.videos}
          onSelectMedia={onSelectMedia}
        />
      )}
    </div>
  )
}

