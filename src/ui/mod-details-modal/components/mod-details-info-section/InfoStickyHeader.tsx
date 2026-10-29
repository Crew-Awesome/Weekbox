import React from 'react'
import { ModNavPills, type ModModalTab } from '../mod-nav-pills'
import type { ModItem } from '../../types'

interface InfoStickyHeaderProps {
  displayCard: ModItem
  isBookmarked: boolean
  isFav: boolean
  handleToggleBookmark?: (e: React.MouseEvent) => void
  handleToggleFavorite: (e: React.MouseEvent) => void
  activeTab: ModModalTab
  setActiveTab: React.Dispatch<React.SetStateAction<ModModalTab>>
  contributorsCount?: number
  validFilesCount: number
}

export const InfoStickyHeader: React.FC<InfoStickyHeaderProps> = ({
  displayCard,
  isBookmarked,
  isFav,
  handleToggleBookmark,
  handleToggleFavorite,
  activeTab,
  setActiveTab,
  contributorsCount,
  validFilesCount,
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <h2
          className="text-sm sm:text-base font-bold text-[var(--wb-on-surface)] truncate min-w-0 flex-1 leading-tight"
          title={displayCard.name}
        >
          {displayCard.name}
        </h2>

        <div className="flex items-center gap-1 shrink-0">
          <m3e-icon-button
            onClick={handleToggleBookmark}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark mod'}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark mod'}
            className={
              isBookmarked
                ? 'text-amber-400 border-none !border-0'
                : 'text-[var(--wb-on-surface-variant)] hover:text-amber-400 border-none !border-0'
            }
            style={
              {
                '--m3e-icon-button-size': '32px',
                border: 'none',
              } as React.CSSProperties
            }
          >
            <span
              className={`material-symbols-rounded text-sm transition-transform active:scale-125 ${
                isBookmarked ? 'text-amber-400' : ''
              }`}
              style={
                isBookmarked
                  ? { fontVariationSettings: "'FILL' 1" }
                  : undefined
              }
            >
              bookmark
            </span>
          </m3e-icon-button>

          <m3e-icon-button
            onClick={handleToggleFavorite}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
            className={
              isFav
                ? 'text-red-500 border-none !border-0'
                : 'text-[var(--wb-on-surface-variant)] hover:text-red-400 border-none !border-0'
            }
            style={
              {
                '--m3e-icon-button-size': '32px',
                border: 'none',
              } as React.CSSProperties
            }
          >
            <span
              className={`material-symbols-rounded text-sm transition-transform active:scale-125 ${
                isFav ? 'text-red-500' : ''
              }`}
              style={
                isFav ? { fontVariationSettings: "'FILL' 1" } : undefined
              }
            >
              favorite
            </span>
          </m3e-icon-button>
        </div>
      </div>

      <ModNavPills
        compact={true}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        contributorsCount={contributorsCount}
        filesCount={validFilesCount}
      />
    </div>
  )
}

