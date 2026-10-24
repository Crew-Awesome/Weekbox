import React from 'react'
import type { ModalViewProps } from './types'
import { ModMediaCarousel, ModThumbnailStrip } from './components/mod-media-carousel'
import { ModDetailsHeaderMobile } from './components/mod-details-header-mobile'
import { ModDetailsHeaderDesktop } from './components/mod-details-header-desktop'
import { ModDetailsInfoSection } from './components/mod-details-info-section'
import { ModDetailsActionButtons } from './components/mod-details-action-buttons'
import { useModDetails } from './hooks/use-mod-details'

export interface ModDetailsViewProps extends ModalViewProps {
  carouselRef?: React.RefObject<HTMLDivElement | null>
  thumbnailsRef?: React.RefObject<HTMLDivElement | null>
  onClose?: () => void
}

/**
 * Responsive layout for Mod Details Modal (mobile stacked sheet vs desktop 16:9 split view).
 */
export const ModDetailsView: React.FC<ModDetailsViewProps> = ({
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
  thumbnailsRef,
  translatedHtml = null,
  isTranslating = false,
  showTranslated = true,
  setShowTranslated = () => {},
  onManualTranslate,
  targetLanguage = 'en',
  isInstalled: isInstalledProp = false,
  onUpdateMod,
  onClose,
}) => {
  const mobileContainerRef = React.useRef<HTMLDivElement>(null)
  const engineDropdownRef = React.useRef<HTMLDivElement>(null)
  const versionDropdownRef = React.useRef<HTMLDivElement>(null)

  const details = useModDetails({
    displayCard,
    engineName,
    formatDate,
    formatFullDate,
    isInstalled: isInstalledProp,
    onUpdateMod,
    onClose,
  })

  if (!displayCard) return null

  return (
    <>
      <div
        ref={mobileContainerRef}
        className="flex md:hidden flex-col w-full h-full max-h-[92dvh] p-4 pointer-events-auto overflow-hidden"
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

        <div className="mt-auto shrink-0 pt-2 pb-2 bg-[var(--wb-surface-container)] -mx-4 px-4 border-t border-white/5">
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
              singleFileCurrentFile={details.singleFileCurrentFile}
              singleFileDownloaded={details.singleFileDownloaded}
              singleFileTotal={details.singleFileTotal}
              activeDownloadsCount={details.activeDownloadsCount}
              isDropdownOpen={details.isDropdownOpen}
            />
          </div>
        </div>
      </div>

      <div className="hidden md:block w-full h-full relative">
        <div className="flex flex-col h-full overflow-hidden text-[var(--wb-on-surface)] w-full relative z-10 pointer-events-none">
          <ModDetailsHeaderDesktop
            displayCard={displayCard}
            engineName={engineName}
            isInstalled={details.isInstalled}
            localInstalledAt={details.localInstalledAt}
            formatDate={formatDate}
            formatFullDate={formatFullDate}
            hoverTooltip={details.hoverTooltip}
            setHoverTooltip={details.setHoverTooltip}
            isEngineDropdownOpen={details.isEngineDropdownOpen}
            setIsEngineDropdownOpen={details.setIsEngineDropdownOpen}
            engineDropdownRef={engineDropdownRef}
            handleSelectEngine={details.handleSelectEngine}
            isExecutable={details.isExecutable}
            installedEngineVersions={details.installedEngineVersions}
            isVersionDropdownOpen={details.isVersionDropdownOpen}
            setIsVersionDropdownOpen={details.setIsVersionDropdownOpen}
            versionDropdownRef={versionDropdownRef}
            selectedVersion={details.selectedVersion}
            handleSelectVersion={details.handleSelectVersion}
            handleInstallLatestEngine={details.handleInstallLatestEngine}
            isInstallingEngine={details.isInstallingEngine}
            handleOpenFolder={details.handleOpenFolder}
          />

          <div className="flex flex-col md:flex-row flex-1 w-full relative z-10 min-h-0">
            <div className="w-full md:w-[60%] flex flex-col shrink-0 relative min-h-0">
              <div className="w-full bg-[var(--wb-surface-container)] rounded-bl-2xl flex flex-col p-1.5 md:p-2.5 pb-3 md:pb-4 relative z-20 pointer-events-auto shadow-sm">
                <ModMediaCarousel
                  media={displayCard.previewMedia}
                  fallbackImage={displayCard.img || displayCard.image}
                  title={displayCard.name || displayCard.title || ''}
                  showCaption={true}
                  activeIndex={activeIndex}
                  carouselRef={carouselRef}
                  onPrev={prevImage}
                  onNext={nextImage}
                  onMouseEnter={onMouseEnterCarousel}
                  onMouseLeave={onMouseLeaveCarousel}
                  onIndexChange={scrollToIndex}
                  aspectRatioClassName="aspect-[16/9]"
                />
                <div className="absolute -bottom-6 -right-[1px] w-[calc(1.5rem+1px)] h-6 pointer-events-none hidden md:block z-20">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-full h-full fill-[var(--wb-surface-container)]"
                    preserveAspectRatio="none"
                  >
                    <path d="M 0 0 C 13 0 24 11 24 24 L 24 0 Z" />
                  </svg>
                </div>
              </div>

              {displayCard.previewMedia && displayCard.previewMedia.length > 1 && (
                <div
                  onMouseEnter={onMouseEnterCarousel}
                  onMouseLeave={onMouseLeaveCarousel}
                  className="w-full md:w-[calc(100%+3.5rem)] md:ml-4 -mt-2 pt-3 pb-2 px-3 md:px-4 md:pl-6 z-0 flex items-center justify-start pointer-events-auto bg-[var(--wb-surface-container-lowest)] rounded-bl-2xl shadow-md border-b border-l border-white/5"
                >
                  <ModThumbnailStrip
                    media={displayCard.previewMedia}
                    activeIndex={activeIndex}
                    onSelectIndex={scrollToIndex}
                    stripRef={thumbnailsRef}
                    onPrev={prevImage}
                    onNext={nextImage}
                    variant="desktop"
                  />
                </div>
              )}
            </div>

            <div className="w-full md:w-[40%] flex flex-col bg-[var(--wb-surface-container)] p-4 md:p-6 overflow-hidden relative rounded-b-2xl z-20 min-h-0 h-full pointer-events-auto">
              <m3e-overflow direction="vertical" className="w-full flex-1 min-h-0">
                <div className="flex flex-col px-2 sm:px-3 pr-4 sm:pr-5 pb-2">
                  <ModDetailsInfoSection
                    variant="desktop"
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

              <div className="pt-3 md:pt-4 mt-auto shrink-0 bg-[var(--wb-surface-container)] border-t border-white/5">
                <div className="relative w-full">
                  <ModDetailsActionButtons
                    variant="desktop"
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
                    singleFileCurrentFile={details.singleFileCurrentFile}
                    singleFileDownloaded={details.singleFileDownloaded}
                    singleFileTotal={details.singleFileTotal}
                    activeDownloadsCount={details.activeDownloadsCount}
                    isDropdownOpen={details.isDropdownOpen}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {details.isUninstallConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--wb-surface-container)] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <h3 className="text-lg font-bold text-[var(--wb-on-surface)]">
              Uninstall Mod
            </h3>
            <p className="text-sm text-[var(--wb-on-surface-variant)]">
              Are you sure you want to uninstall &quot;
              {displayCard.name || displayCard.title}&quot;? All files for this
              mod will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-3 mt-2">
              <m3e-button
                variant="tonal"
                onClick={() => details.setIsUninstallConfirmOpen(false)}
              >
                Nevermind!
              </m3e-button>
              <m3e-button
                variant="filled"
                className="bg-red-600 text-white"
                onClick={async () => {
                  details.setIsUninstallConfirmOpen(false)
                  await details.executeUninstall()
                }}
              >
                LET&apos;S GO!
              </m3e-button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ModDetailsView
