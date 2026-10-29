import React, { useState, useEffect, useRef } from 'react'
import { findScrollableParent } from '@/utils'
import type { ModModalTab } from '../mod-nav-pills'
import { ModCreditsView } from '../mod-credits-view'
import { ModDetailsTab } from '../mod-details-tab'
import type { ModItem } from '../../types'
import { InfoStickyHeader } from './InfoStickyHeader'
import { InfoTitleAuthor } from './InfoTitleAuthor'
import { InfoDescriptionTab } from './InfoDescriptionTab'

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
  const [isScrolled, setIsScrolled] = useState(false)
  const headerContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
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
          <InfoStickyHeader
            displayCard={displayCard}
            isBookmarked={isBookmarked}
            isFav={isFav}
            handleToggleBookmark={handleToggleBookmark}
            handleToggleFavorite={handleToggleFavorite}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            contributorsCount={contributorsCount}
            validFilesCount={validFilesCount}
          />
        ) : (
          <InfoTitleAuthor
            displayCard={displayCard}
            isDesktop={isDesktop}
            isInstalled={isInstalled}
            isEditingTitle={isEditingTitle}
            setIsEditingTitle={setIsEditingTitle}
            titleInput={titleInput}
            setTitleInput={setTitleInput}
            handleSaveTitle={handleSaveTitle}
            authorAvatar={authorAvatar}
            avatarError={avatarError}
            setAvatarError={setAvatarError}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            contributorsCount={contributorsCount}
            validFilesCount={validFilesCount}
            isBookmarked={isBookmarked}
            isFav={isFav}
            handleToggleBookmark={handleToggleBookmark}
            handleToggleFavorite={handleToggleFavorite}
          />
        )}
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        {activeTab === 'description' && (
          <InfoDescriptionTab
            displayCard={displayCard}
            isDesktop={isDesktop}
            isInstalled={isInstalled}
            isEditingDesc={isEditingDesc}
            setIsEditingDesc={setIsEditingDesc}
            descInput={descInput}
            setDescInput={setDescInput}
            handleSaveDesc={handleSaveDesc}
            isTranslating={isTranslating}
            translatedHtml={translatedHtml}
            showTranslated={showTranslated}
            setShowTranslated={setShowTranslated}
            targetLanguage={targetLanguage}
            onManualTranslate={onManualTranslate}
          />
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

