import React from 'react'
import { ModNavPills, type ModModalTab } from '../mod-nav-pills'
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
  avatarError: boolean
  setAvatarError: React.Dispatch<React.SetStateAction<boolean>>
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
  avatarError,
  setAvatarError,
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
              className={`w-full bg-[var(--wb-surface-container-high)] border border-[var(--wb-primary)]/60 focus:border-[var(--wb-primary)] rounded-lg ${
                isDesktop
                  ? 'px-3 py-1.5 text-2xl md:text-3xl'
                  : 'px-2.5 py-1 text-xl'
              } font-bold text-[var(--wb-on-surface)] outline-none font-display shadow-inner`}
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
              } font-bold text-[var(--wb-on-surface)] leading-tight font-display break-words line-clamp-2`}
              title={displayCard.name}
            >
              <span>{displayCard.name}</span>
              {isInstalled && (
                <span
                  className={`inline-flex items-center align-middle ${isDesktop ? 'ml-2' : 'ml-1.5'} opacity-60 group-hover:opacity-100 group-hover:text-[var(--wb-primary)] transition-all`}
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
          className={`text-[var(--wb-on-surface-variant)] ${isDesktop ? 'text-xs md:text-sm mt-1.5' : 'text-xs mt-1'} line-clamp-2 leading-relaxed opacity-85`}
        >
          {displayCard.description}
        </p>
      )}

      <div
        className={`flex items-center ${isDesktop ? 'gap-2 mt-1.5 mb-0.5' : 'gap-1.5 mt-1 mb-0.5'}`}
      >
        <span
          className={`text-[var(--wb-on-surface-variant)] ${isDesktop ? 'text-xs md:text-sm' : 'text-xs'}`}
        >
          by
        </span>
        <div className="flex items-center gap-1.5 min-w-0">
          {authorAvatar && !avatarError ? (
            <img
              src={authorAvatar}
              alt={displayCard.author || 'Author'}
              className={`${isDesktop ? 'w-5 h-5 md:w-5.5 md:h-5.5' : 'w-4.5 h-4.5'} rounded-full object-cover shrink-0 border border-white/10 shadow-sm`}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div
              className={`${isDesktop ? 'w-5 h-5 md:w-5.5 md:h-5.5' : 'w-4.5 h-4.5'} rounded-full bg-[var(--wb-surface-container-highest)] flex items-center justify-center shrink-0 border border-white/10`}
            >
              <span
                className={`material-symbols-rounded ${isDesktop ? 'text-xs md:text-sm' : 'text-xs'} text-[var(--wb-on-surface-variant)] opacity-70`}
              >
                person
              </span>
            </div>
          )}
          <span
            className={`text-[var(--wb-on-surface)] ${isDesktop ? 'text-xs md:text-sm' : 'text-xs'} font-semibold truncate`}
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
          <div className="flex items-center gap-0.5 shrink-0">
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
                  '--m3e-icon-button-size': '26px',
                  border: 'none',
                } as React.CSSProperties
              }
            >
              <span
                className={`material-symbols-rounded text-sm transition-transform duration-100 active:scale-125 ${
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
                  '--m3e-icon-button-size': '26px',
                  border: 'none',
                } as React.CSSProperties
              }
            >
              <span
                className={`material-symbols-rounded text-sm transition-transform duration-100 active:scale-125 ${
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
        }
      />
    </div>
  )
}

