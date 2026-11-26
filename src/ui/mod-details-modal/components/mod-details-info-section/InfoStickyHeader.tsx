import React from 'react'
import { ModNavPills, type ModModalTab } from '../mod-nav-pills'
import { InfoBookmarkFavoriteActions } from './InfoBookmarkFavoriteActions'
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
      <h2
        className="text-sm sm:text-base font-bold text-[var(--md-sys-color-on-surface)] truncate min-w-0 leading-tight"
        title={displayCard.name}
      >
        {displayCard.name}
      </h2>

      <ModNavPills
        compact={true}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        contributorsCount={contributorsCount}
        filesCount={validFilesCount}
        extraActions={
          <InfoBookmarkFavoriteActions
            isBookmarked={isBookmarked}
            isFav={isFav}
            onToggleBookmark={handleToggleBookmark}
            onToggleFavorite={handleToggleFavorite}
            sizePx="28px"
          />
        }
      />
    </div>
  )
}

