import React from 'react'

interface InfoBookmarkFavoriteActionsProps {
  isBookmarked: boolean
  isFav: boolean
  onToggleBookmark?: (e: React.MouseEvent) => void
  onToggleFavorite: (e: React.MouseEvent) => void
  sizePx?: string
}

/**
 * Shared bookmark and favorite icon-button pair rendered beside ModNavPills.
 */
export const InfoBookmarkFavoriteActions: React.FC<
  InfoBookmarkFavoriteActionsProps
> = ({
  isBookmarked,
  isFav,
  onToggleBookmark,
  onToggleFavorite,
  sizePx = '26px',
}) => {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <m3e-icon-button
        onClick={onToggleBookmark}
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark mod'}
        aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark mod'}
        className={
          isBookmarked
            ? 'text-[var(--md-sys-color-tertiary)] border-none !border-0'
            : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-tertiary)] border-none !border-0'
        }
        style={
          {
            '--m3e-icon-button-size': sizePx,
            border: 'none',
          } as React.CSSProperties
        }
      >
        <span
          className={`material-symbols-rounded text-sm transition-transform duration-100 active:scale-125 ${
            isBookmarked ? 'text-[var(--md-sys-color-tertiary)]' : ''
          }`}
          style={
            isBookmarked ? { fontVariationSettings: "'FILL' 1" } : undefined
          }
        >
          bookmark
        </span>
      </m3e-icon-button>

      <m3e-icon-button
        onClick={onToggleFavorite}
        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
        aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
        className={
          isFav
            ? 'text-[var(--md-sys-color-error)] border-none !border-0'
            : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-error)] border-none !border-0'
        }
        style={
          {
            '--m3e-icon-button-size': sizePx,
            border: 'none',
          } as React.CSSProperties
        }
      >
        <span
          className={`material-symbols-rounded text-sm transition-transform duration-100 active:scale-125 ${
            isFav ? 'text-[var(--md-sys-color-error)]' : ''
          }`}
          style={isFav ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          favorite
        </span>
      </m3e-icon-button>
    </div>
  )
}
