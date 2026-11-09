import React from 'react'
import type { ModItem } from './types'
import { ModMediaCarousel, ModThumbnailStrip } from './components/mod-media-carousel'
import { ModDetailsHeaderMobile } from './components/mod-details-header-mobile/ModDetailsHeaderMobile'
import { ModDetailsInfoSection } from './components/mod-details-info-section/ModDetailsInfoSection'
import { ModDetailsActionButtons } from './components/mod-details-action-buttons'
import type { useModDetails } from './hooks/use-mod-details'

export interface ModDetailsMobileLayoutProps {
  displayCard: ModItem
  engineName: string
  formatDate: (timestamp?: number | string) => string
  formatFullDate?: (timestamp?: number | string) => string
  activeIndex: number
  scrollToIndex: (index: number) => void
  prevImage: (e?: React.MouseEvent) => void
  nextImage: (e?: React.MouseEvent) => void
  onMouseEnterCarousel?: () => void
  onMouseLeaveCarousel?: () => void
  carouselRef?: React.RefObject<HTMLDivElement | null>
  translatedHtml: string | null
  isTranslating: boolean
  showTranslated: boolean
  setShowTranslated: (show: boolean) => void
  onManualTranslate?: () => void
  targetLanguage: string
  onClose?: () => void
  mobileContainerRef: React.RefObject<HTMLDivElement | null>
  engineDropdownRef: React.RefObject<HTMLDivElement | null>
  versionDropdownRef: React.RefObject<HTMLDivElement | null>
  details: ReturnType<typeof useModDetails>
}

export const ModDetailsMobileLayout: React.FC<ModDetailsMobileLayoutProps> = ({
  displayCard,
  engineName,
  formatDate,
  formatFullDate,
  activeIndex,
  scrollToIndex,
  prevImage,
  nextImage,
  onMouseEnterCarousel,
  onMouseLeaveCarousel,
  carouselRef,
  translatedHtml,
  isTranslating,
  showTranslated,
  setShowTranslated,
  onManualTranslate,
  targetLanguage,
  onClose,
  mobileContainerRef,
  engineDropdownRef,
  versionDropdownRef,
  details,
}) => {
  return (
    <div
      ref={mobileContainerRef}
      className="flex flex-col w-full h-full max-h-[92dvh] p-3 sm:p-5 pointer-events-auto overflow-hidden"
    >
      <ModDetailsHeaderMobile
        displayCard={displayCard}
        engineName={engineName}
        isInstalled={details.isInstalled}
        localInstalledAt={details.localInstalledAt}
        formatDate={formatDate}
        formatFullDate={formatFullDate}
        isHeaderVisible={details.isHeaderVisible}
        isEngineDropdownOpen={details.isEngineDropdownOpen}
        setIsEngineDropdownOpen={details.setIsEngineDropdownOpen}
        engineDropdownRef={engineDropdownRef}
        handleSelectEngine={details.handleSelectEngine}
        isExecutable={details.isExecutable}
        isMobilePlatform={details.isMobilePlatform}
        isEngineInstalledOnDevice={details.isEngineInstalledOnDevice}
        handleInstallLatestEngine={details.handleInstallLatestEngine}
        isInstallingEngine={details.isInstallingEngine}
        installedEngineVersions={details.installedEngineVersions}
        isVersionDropdownOpen={details.isVersionDropdownOpen}
        setIsVersionDropdownOpen={details.setIsVersionDropdownOpen}
        versionDropdownRef={versionDropdownRef}
        selectedVersion={details.selectedVersion}
        handleSelectVersion={details.handleSelectVersion}
        handleOpenFolder={details.handleOpenFolder}
        onClose={onClose}
      />

      <m3e-overflow direction="vertical" className="w-full flex-1 min-h-0">
        <div className="flex flex-col w-full pb-4 px-1 sm:px-1.5">
          <ModMediaCarousel
            media={displayCard.previewMedia}
            fallbackImage={displayCard.img || displayCard.image}
            title={displayCard.name || displayCard.title || ''}
            activeIndex={activeIndex}
            carouselRef={carouselRef}
            onPrev={prevImage}
            onNext={nextImage}
            onMouseEnter={onMouseEnterCarousel}
            onMouseLeave={onMouseLeaveCarousel}
            roundedClassName="rounded-2xl mb-4"
          />

          <ModThumbnailStrip
            media={displayCard.previewMedia || []}
            activeIndex={activeIndex}
            onSelectIndex={scrollToIndex}
            variant="mobile"
          />

          <ModDetailsInfoSection
            variant="mobile"
            displayCard={displayCard}
            engineName={engineName}
            formatDate={formatDate}
            formatFullDate={formatFullDate}
            isInstalled={details.isInstalled}
            localInstalledAt={details.localInstalledAt}
            authorAvatar={details.authorAvatar}
            avatarError={details.avatarError}
            setAvatarError={details.setAvatarError}
            isEditingTitle={details.isEditingTitle}
            setIsEditingTitle={details.setIsEditingTitle}
            titleInput={details.titleInput}
            setTitleInput={details.setTitleInput}
            handleSaveTitle={details.handleSaveTitle}
            isEditingDesc={details.isEditingDesc}
            setIsEditingDesc={details.setIsEditingDesc}
            descInput={details.descInput}
            setDescInput={details.setDescInput}
            handleSaveDesc={details.handleSaveDesc}
            activeTab={details.activeTab}
            setActiveTab={details.setActiveTab}
            validFilesCount={details.validFiles.length}
            isFav={details.isFav}
            handleToggleFavorite={details.handleToggleFavorite}
            isBookmarked={details.isBookmarked}
            handleToggleBookmark={details.handleToggleBookmark}
            isTranslating={isTranslating}
            translatedHtml={translatedHtml}
            showTranslated={showTranslated}
            setShowTranslated={setShowTranslated}
            targetLanguage={targetLanguage}
            onManualTranslate={onManualTranslate}
            handleDownload={details.handleDownload}
            handleCancelDownload={details.handleCancelDownload}
            downloadTasks={details.downloadTasks}
            handleManage={details.handleManage}
          />
        </div>
      </m3e-overflow>

      <div className="mt-auto shrink-0 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))] bg-[var(--wb-surface-container)] -mx-3 sm:-mx-5 px-3 sm:px-5 border-t border-white/5">
        <div className="relative w-full">
          <ModDetailsActionButtons
            variant="mobile"
            isInstalled={details.isInstalled}
            hasUpdate={details.hasUpdate}
            isUpdating={details.isUpdating}
            updateProgress={details.updateProgress}
            handleUpdateClick={details.handleUpdateClick}
            isStorageMigrating={details.isStorageMigrating}
            playStatus={details.playStatus}
            handleStop={details.handleStop}
            handleManage={details.handleManage}
            handleUninstall={details.handleUninstall}
            isUninstalling={details.isUninstalling}
            isLoading={details.isLoading}
            hasNoFiles={details.hasNoFiles}
            hasMultipleFiles={details.hasMultipleFiles}
            validFiles={details.validFiles}
            setActiveTab={details.setActiveTab}
            handleDownload={details.handleDownload}
            handleCancelDownload={details.handleCancelDownload}
            singleFileProgress={details.singleFileProgress}
            singleFileStatus={details.singleFileStatus}
            singleFileStatusText={details.singleFileStatusText}
            singleFileCurrentFile={details.singleFileCurrentFile}
            singleFileDownloaded={details.singleFileDownloaded}
            singleFileTotal={details.singleFileTotal}
            activeDownloadsCount={details.activeDownloadsCount}
            isDropdownOpen={details.isDropdownOpen}
          />
        </div>
      </div>
    </div>
  )
}

export interface ModUninstallConfirmModalProps {
  modTitle: string
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export const ModUninstallConfirmModal: React.FC<ModUninstallConfirmModalProps> = ({
  modTitle,
  onCancel,
  onConfirm,
}) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="bg-[var(--wb-surface-container)] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
      <h3 className="text-lg font-bold text-[var(--wb-on-surface)]">
        Uninstall Mod
      </h3>
      <p className="text-sm text-[var(--wb-on-surface-variant)]">
        Are you sure you want to uninstall &quot;{modTitle}&quot;? All files for
        this mod will be permanently removed.
      </p>
      <div className="flex items-center justify-end gap-3 mt-2">
        <m3e-button variant="tonal" onClick={onCancel}>
          Nevermind!
        </m3e-button>
        <m3e-button
          variant="filled"
          className="bg-red-600 text-white"
          onClick={onConfirm}
        >
          LET&apos;S GO!
        </m3e-button>
      </div>
    </div>
  </div>
)
