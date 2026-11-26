import React from 'react'
import { ModAvatar } from '@/ui/avatar/ModAvatar'
import { ModNavPills, type ModModalTab } from '../mod-nav-pills'
import { InfoBookmarkFavoriteActions } from './InfoBookmarkFavoriteActions'
import type { ModItem } from '../../types'

interface InfoTitleAuthorProps {
  displayCard: ModItem
  isDesktop: boolean
  isInstalled: boolean
  isEditingTitle: boolean
  setIsEditingTitle: React.Dispatch<React.SetStateAction<boolean>>
  titleInput: string
  setTitleInput: React.Dispatch<React.SetStateAction<string>>
  handleSaveTitle: () => void
  authorAvatar?: string
  avatarError?: boolean
  setAvatarError?: React.Dispatch<React.SetStateAction<boolean>>
  activeTab: ModModalTab
  setActiveTab: React.Dispatch<React.SetStateAction<ModModalTab>>
  contributorsCount?: number
  validFilesCount: number
  isBookmarked: boolean
  isFav: boolean
  handleToggleBookmark?: (e: React.MouseEvent) => void
  handleToggleFavorite: (e: React.MouseEvent) => void
}

export const InfoTitleAuthor: React.FC<InfoTitleAuthorProps> = ({
  displayCard,
  isDesktop,
  isInstalled,
  isEditingTitle,
  setIsEditingTitle,
  titleInput,
  setTitleInput,
  handleSaveTitle,
  authorAvatar,
  avatarError: _avatarError,
  setAvatarError: _setAvatarError,
  activeTab,
  setActiveTab,
  contributorsCount,
  validFilesCount,
  isBookmarked,
  isFav,
  handleToggleBookmark,
  handleToggleFavorite,
}) => {
  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-3">
        {isEditingTitle ? (
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle()
                if (e.key === 'Escape') {
                  setTitleInput(displayCard.name || '')
                  setIsEditingTitle(false)
                }
              }}
              autoFocus
              className={`w-full bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-primary)]/60 focus:border-[var(--md-sys-color-primary)] rounded-lg ${
                isDesktop
                  ? 'px-3 py-1.5 text-2xl md:text-3xl'
                  : 'px-2.5 py-1 text-xl'
              } font-bold text-[var(--md-sys-color-on-surface)] outline-none font-display shadow-inner`}
              placeholder="Mod title..."
            />
          </div>
        ) : (
          <div
            onClick={() => isInstalled && setIsEditingTitle(true)}
            className={`group flex-1 min-w-0 ${isInstalled ? 'cursor-pointer' : ''}`}
            title={isInstalled ? 'Click to edit title' : displayCard.name}
          >
            <h1
              className={`${
                isDesktop
                  ? 'text-2xl md:text-3xl lg:text-4xl'
                  : 'text-2xl'
              } font-bold text-[var(--md-sys-color-on-surface)] leading-tight font-display break-words line-clamp-2`}
              title={displayCard.name}
            >
              <span>{displayCard.name}</span>
              {isInstalled && (
                <span
                  className={`inline-flex items-center align-middle ${isDesktop ? 'ml-2' : 'ml-1.5'} opacity-60 group-hover:opacity-100 group-hover:text-[var(--md-sys-color-primary)] transition-all`}
                >
                  <span
                    className={`material-symbols-rounded shrink-0 ${isDesktop ? 'text-base md:text-lg' : 'text-base'}`}
                  >
                    edit
                  </span>
                </span>
              )}
            </h1>
          </div>
        )}
      </div>

      {displayCard.description && (
        <p
          className={`text-[var(--md-sys-color-on-surface-variant)] ${isDesktop ? 'text-xs md:text-sm mt-1.5' : 'text-xs mt-1'} line-clamp-2 leading-relaxed opacity-85`}
        >
          {displayCard.description}
        </p>
      )}

      <div
        className={`flex items-center ${isDesktop ? 'gap-2 mt-1.5 mb-0.5' : 'gap-1.5 mt-1 mb-0.5'}`}
      >
        <span
          className={`text-[var(--md-sys-color-on-surface-variant)] ${isDesktop ? 'text-xs md:text-sm' : 'text-xs'}`}
        >
          by
        </span>
        <div className="flex items-center gap-1.5 min-w-0">
          {(() => {
            const authorLower = (displayCard.author || '').trim().toLowerCase()
            const matchedCredit = displayCard.credits
              ?.flatMap((g) => g.authors || [])
              ?.find(
                (a) =>
                  a.name?.trim().toLowerCase() === authorLower &&
                  Boolean(a.avatarUrl || a.avatarPath || a.localAvatarPath),
              )
            return (
              <ModAvatar
                remoteUrl={displayCard.userPfp || matchedCredit?.avatarUrl || authorAvatar}
                localRelPath={displayCard.userPfpPath || matchedCredit?.avatarPath}
                localFullPath={displayCard.localUserPfp || matchedCredit?.localAvatarPath}
                alt={displayCard.author || 'Author'}
                className={`${isDesktop ? 'w-5 h-5 md:w-5.5 md:h-5.5' : 'w-4.5 h-4.5'} rounded-full object-cover shrink-0 border border-[var(--md-sys-color-outline-variant)]/30 shadow-sm`}
                fallbackClassName={`${isDesktop ? 'w-5 h-5 md:w-5.5 md:h-5.5' : 'w-4.5 h-4.5'} rounded-full bg-[var(--md-sys-color-surface-container-highest)] flex items-center justify-center shrink-0 border border-[var(--md-sys-color-outline-variant)]/30`}
                iconClassName={`material-symbols-rounded ${isDesktop ? 'text-xs md:text-sm' : 'text-xs'} text-[var(--md-sys-color-on-surface-variant)] opacity-70`}
              />
            )
          })()}
          <span
            className={`text-[var(--md-sys-color-on-surface)] ${isDesktop ? 'text-xs md:text-sm' : 'text-xs'} font-semibold truncate`}
          >
            {displayCard.author || 'Unknown'}
          </span>
        </div>
      </div>

      <ModNavPills
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
          />
        }
      />
    </div>
  )
}

