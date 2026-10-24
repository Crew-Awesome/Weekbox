import React from 'react'
import { findScrollableParent } from '@/utils'
import { ModNavPills, type ModModalTab } from './mod-nav-pills'
import { ModCreditsView } from './mod-credits-view'
import { ModDetailsTab } from './mod-details-tab'
import type { ModItem } from '../types'

export interface ModDetailsInfoSectionProps {
  variant?: 'mobile' | 'desktop'
  displayCard: ModItem
  engineName: string
  formatDate: (timestamp?: number | string) => string
  formatFullDate: (timestamp?: number | string) => string
  isInstalled: boolean
  localInstalledAt?: number
  authorAvatar?: string
  avatarError: boolean
  setAvatarError: React.Dispatch<React.SetStateAction<boolean>>
  isEditingTitle: boolean
  setIsEditingTitle: React.Dispatch<React.SetStateAction<boolean>>
  titleInput: string
  setTitleInput: React.Dispatch<React.SetStateAction<string>>
  handleSaveTitle: () => void
  isEditingDesc: boolean
  setIsEditingDesc: React.Dispatch<React.SetStateAction<boolean>>
  descInput: string
  setDescInput: React.Dispatch<React.SetStateAction<string>>
  handleSaveDesc: () => void
  activeTab: ModModalTab
  setActiveTab: React.Dispatch<React.SetStateAction<ModModalTab>>
  validFilesCount: number
  isFav: boolean
  handleToggleFavorite: (e: React.MouseEvent) => void
  isBookmarked?: boolean
  handleToggleBookmark?: (e: React.MouseEvent) => void
  isTranslating: boolean
  translatedHtml: string | null
  showTranslated: boolean
  setShowTranslated: React.Dispatch<React.SetStateAction<boolean>>
  targetLanguage: string
  onManualTranslate?: () => void
  handleDownload: (url?: string, id?: string) => void
  handleCancelDownload?: (id?: string) => void
  downloadTasks?: Record<string, { progress?: number; status?: string }>
  handleManage: () => void
}

/**
 * Displays the collapsible mod header, navigation pills, description, contributors, and technical details tab.
 */
export const ModDetailsInfoSection: React.FC<ModDetailsInfoSectionProps> = ({
  variant = 'desktop',
  displayCard,
  engineName,
  formatDate,
  formatFullDate,
  isInstalled,
  localInstalledAt,
  authorAvatar,
  avatarError,
  setAvatarError,
  isEditingTitle,
  setIsEditingTitle,
  titleInput,
  setTitleInput,
  handleSaveTitle,
  isEditingDesc,
  setIsEditingDesc,
  descInput,
  setDescInput,
  handleSaveDesc,
  activeTab,
  setActiveTab,
  validFilesCount,
  isFav,
  handleToggleFavorite,
  isBookmarked = false,
  handleToggleBookmark,
  isTranslating,
  translatedHtml,
  showTranslated,
  setShowTranslated,
  targetLanguage,
  onManualTranslate,
  handleDownload,
  handleCancelDownload,
  downloadTasks,
  handleManage,
}) => {
  const isDesktop = variant === 'desktop'
  const [isScrolled, setIsScrolled] = React.useState(false)
  const headerContainerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const scrollParent = findScrollableParent(headerContainerRef.current)
    const onScroll = () => {
      if (scrollParent) {
        const top = scrollParent.scrollTop
        setIsScrolled((prev) => {
          if (!prev && top > 140) return true
          if (prev && top < 40) return false
          return prev
        })
      }
    }

    if (scrollParent) {
      scrollParent.addEventListener('scroll', onScroll, { passive: true })
    }

    return () => {
      if (scrollParent) {
        scrollParent.removeEventListener('scroll', onScroll)
      }
    }
  }, [])

  const contributorsCount =
    displayCard.credits?.reduce((acc, g) => acc + g.authors.length, 0) ||
    displayCard.authors?.length

  return (
    <>
      <div
        ref={headerContainerRef}
        className={`sticky top-0 z-30 transition-all duration-200 backdrop-blur-md ${
          isScrolled
            ? 'py-2 -mx-3 px-3 sm:-mx-4 sm:px-4 border-b border-white/10 shadow-sm bg-[var(--wb-surface-container)]/85 mb-3'
            : 'pt-1 pb-2 mb-2 -mx-2 px-2 sm:-mx-2 sm:px-2 bg-[var(--wb-surface-container)]/75 border-b border-[var(--wb-outline-variant)]/20'
        }`}
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {isScrolled ? (
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
        ) : (
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
        )}
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        {activeTab === 'description' && (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {isInstalled && !isEditingDesc && (
                <m3e-button
                  variant="tonal"
                  onClick={() => setIsEditingDesc(true)}
                  title="Edit description"
                >
                  <span className="material-symbols-rounded text-sm text-[var(--wb-primary)] shrink-0">
                    edit
                  </span>
                  <span>Edit description</span>
                </m3e-button>
              )}

              {isTranslating ? (
                <m3e-icon-button
                  disabled
                  variant="standard"
                  className="border-none !border-0 shrink-0 outline-none"
                  title="Translating..."
                  aria-label="Translating description"
                  style={
                    {
                      '--m3e-icon-button-outline-thickness': '0px',
                      border: 'none',
                    } as React.CSSProperties
                  }
                >
                  <span className="material-symbols-rounded text-base animate-spin">
                    progress_activity
                  </span>
                </m3e-icon-button>
              ) : (
                <m3e-icon-button
                  toggle
                  selected={Boolean(translatedHtml && showTranslated)}
                  variant={translatedHtml && showTranslated ? 'filled' : 'standard'}
                  onClick={() => {
                    if (!translatedHtml) {
                      if (onManualTranslate) onManualTranslate()
                    } else {
                      setShowTranslated(!showTranslated)
                    }
                  }}
                  title={
                    !translatedHtml
                      ? `Translate description to ${targetLanguage === 'es' ? 'Spanish' : 'English'}`
                      : showTranslated
                        ? 'Show original description'
                        : 'Show translated description'
                  }
                  aria-label="Translate description"
                  className="border-none !border-0 !border-transparent shrink-0 outline-none"
                  style={
                    {
                      '--m3e-icon-button-outline-thickness': '0px',
                      border: 'none',
                    } as React.CSSProperties
                  }
                >
                  <span className="material-symbols-rounded text-base leading-none">
                    translate
                  </span>
                </m3e-icon-button>
              )}
            </div>

            {isEditingDesc ? (
              <div className={`flex flex-col gap-2 ${isDesktop ? 'pb-4' : 'pb-6'}`}>
                <textarea
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  onBlur={handleSaveDesc}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setDescInput(displayCard.description || '')
                      setIsEditingDesc(false)
                    }
                  }}
                  autoFocus
                  rows={isDesktop ? 7 : 6}
                  className={`w-full bg-[var(--wb-surface-container-high)] border border-[var(--wb-primary)]/60 focus:border-[var(--wb-primary)] rounded-lg p-3 ${
                    isDesktop ? 'text-sm md:text-base' : 'text-sm'
                  } text-[var(--wb-on-surface)] outline-none custom-scrollbar resize-y shadow-inner font-sans`}
                  placeholder="Enter custom mod description..."
                />
                <div className="flex items-center justify-between text-[11px] text-[var(--wb-on-surface-variant)] px-1">
                  <span>Click outside or press Escape to finish</span>
                  <m3e-button variant="filled" onClick={handleSaveDesc}>
                    Done
                  </m3e-button>
                </div>
              </div>
            ) : displayCard.htmlBody ? (
              <div
                onClick={() => isInstalled && setIsEditingDesc(true)}
                className={`text-[var(--wb-on-surface-variant)] prose prose-invert ${
                  isDesktop ? 'prose-sm md:prose-base pb-4' : 'prose-sm pb-6'
                } max-w-full overflow-x-hidden break-words [&_*]:max-w-full [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_table]:block [&_table]:overflow-x-auto ${
                  isInstalled
                    ? 'cursor-pointer hover:bg-white/[0.02] rounded-lg transition-colors p-1'
                    : ''
                }`}
                title={isInstalled ? 'Click to edit description' : undefined}
                dangerouslySetInnerHTML={{
                  __html:
                    showTranslated && translatedHtml
                      ? translatedHtml
                      : displayCard.htmlBody,
                }}
              />
            ) : (
              <p
                onClick={() => isInstalled && setIsEditingDesc(true)}
                className={`text-[var(--wb-on-surface-variant)] ${
                  isDesktop ? 'text-sm md:text-base pb-4' : 'text-sm pb-6'
                } break-words ${
                  isInstalled
                    ? 'cursor-pointer hover:bg-white/[0.02] rounded-lg transition-colors p-1'
                    : ''
                }`}
                title={isInstalled ? 'Click to edit description' : undefined}
              >
                {showTranslated && translatedHtml
                  ? translatedHtml
                  : displayCard.description}
              </p>
            )}
          </div>
        )}

        {activeTab === 'contributors' && (
          <ModCreditsView
            credits={displayCard.credits}
            authors={displayCard.authors}
            author={displayCard.author}
          />
        )}

        {activeTab === 'details' && (
          <ModDetailsTab
            displayCard={{
              ...displayCard,
              installedAt: localInstalledAt || displayCard.installedAt,
            }}
            engineName={engineName}
            formatDate={formatDate}
            formatFullDate={formatFullDate}
            onDownloadFile={handleDownload}
            onCancelDownload={handleCancelDownload}
            downloadTasks={downloadTasks}
            onManageFile={handleManage}
            isInstalled={isInstalled}
          />
        )}
      </div>
    </>
  )
}
