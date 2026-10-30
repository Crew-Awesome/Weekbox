import React from 'react'
import type { TwitterNewsPost } from '@/services/twitter'
import { NewsPostText } from './NewsPostText'
import { NewsMediaGrid } from './NewsMediaGrid'
import { NewsQuoteCard } from './NewsQuoteCard'

interface NewsPostCardProps {
  post: TwitterNewsPost
  onOpenExternal: (url: string) => void
  onSelectMedia?: (media: { type: 'image' | 'video'; url: string; videoSources?: string[] }) => void
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString)
    if (Number.isNaN(date.getTime())) return ''
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffSec < 60) return 'Just now'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`

    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    }).format(date)
  } catch {
    return ''
  }
}

function formatCount(num?: number): string {
  if (num == null) return ''
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return String(num)
}

export const NewsPostCard: React.FC<NewsPostCardProps> = ({
  post,
  onOpenExternal,
  onSelectMedia,
}) => {
  const [avatarError, setAvatarError] = React.useState(false)
  const formattedDate = formatDate(post.publishedAt)

  return (
    <m3e-card
      variant="outlined"
      className="w-full text-start transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={
        {
          '--m3e-card-container-shape': '24px',
          '--m3e-outlined-card-outline-color':
            'color-mix(in srgb, var(--md-sys-color-outline-variant) 65%, transparent)',
          '--m3e-outlined-card-container-color':
            'var(--md-sys-color-surface-container-low)',
          display: 'block',
          width: '100%',
        } as React.CSSProperties
      }
    >
      <div className="flex flex-col p-4 sm:p-5 w-full">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {post.avatarUrl && !avatarError ? (
              <img
                src={post.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover shrink-0 border border-[var(--md-sys-color-outline-variant)]"
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center font-bold text-sm shrink-0">
                {post.sourceName.charAt(0)}
              </div>
            )}

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)] truncate">
                  {post.sourceName}
                </span>
                <span className="text-xs text-[var(--md-sys-color-on-surface-variant)] truncate">
                  @{post.username}
                </span>
              </div>
              {formattedDate && (
                <time
                  dateTime={post.publishedAt}
                  className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] opacity-75"
                >
                  {formattedDate}
                </time>
              )}
            </div>
          </div>

          {post.link && (
            <m3e-icon-button
              onClick={() => onOpenExternal(post.link)}
              title="Open on X"
              style={{ cursor: 'pointer' }}
            >
              <span className="material-symbols-rounded text-lg leading-none">
                open_in_new
              </span>
            </m3e-icon-button>
          )}
        </header>

        {/* Post Text */}
        {post.text && (
          <NewsPostText
            text={post.text}
            onOpenExternal={onOpenExternal}
          />
        )}

        {/* Media Grid */}
        {(post.images.length > 0 || post.videos.length > 0) && (
          <NewsMediaGrid
            images={post.images}
            videos={post.videos}
            onSelectMedia={onSelectMedia}
          />
        )}

        {/* Quote Tweet */}
        {post.quote && (
          <NewsQuoteCard
            quote={post.quote}
            onOpenExternal={onOpenExternal}
            onSelectMedia={onSelectMedia}
          />
        )}

        {/* Footer / Stats */}
        <footer className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[color-mix(in_srgb,var(--md-sys-color-outline-variant)_40%,transparent)] text-xs text-[var(--md-sys-color-on-surface-variant)]">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {post.stats.likes != null && (
              <span className="flex items-center gap-1 hover:text-[var(--md-sys-color-primary)] transition-colors">
                <span className="material-symbols-rounded text-sm leading-none text-rose-500">
                  favorite
                </span>
                <span>{formatCount(post.stats.likes)}</span>
              </span>
            )}

            {post.stats.reposts != null && (
              <span className="flex items-center gap-1 hover:text-[var(--md-sys-color-primary)] transition-colors">
                <span className="material-symbols-rounded text-sm leading-none text-emerald-500">
                  repeat
                </span>
                <span>{formatCount(post.stats.reposts)}</span>
              </span>
            )}

            {post.stats.replies != null && (
              <span className="flex items-center gap-1 hover:text-[var(--md-sys-color-primary)] transition-colors">
                <span className="material-symbols-rounded text-sm leading-none text-blue-500">
                  chat_bubble
                </span>
                <span>{formatCount(post.stats.replies)}</span>
              </span>
            )}

            {post.stats.views != null && (
              <span className="flex items-center gap-1 hover:text-[var(--md-sys-color-primary)] transition-colors">
                <span className="material-symbols-rounded text-sm leading-none text-purple-400">
                  bar_chart
                </span>
                <span>{formatCount(post.stats.views)}</span>
              </span>
            )}
          </div>

          {post.link && (
            <m3e-button
              variant="text"
              onClick={() => onOpenExternal(post.link)}
              style={
                {
                  '--m3e-button-container-height': '28px',
                  '--m3e-button-label-text-font-size': '11px',
                  cursor: 'pointer',
                } as React.CSSProperties
              }
            >
              <span>View post</span>
              <span slot="trailing-icon" className="material-symbols-rounded text-xs leading-none">
                chevron_right
              </span>
            </m3e-button>
          )}
        </footer>
      </div>
    </m3e-card>
  )
}

