import React from "react";
import type { ModalViewProps } from "./types";
import { ModMediaCarousel, ModThumbnailStrip } from "./components/mod-media-carousel";
import { ModDetailsHeaderMobile } from "./components/mod-details-header-mobile";
import { ModDetailsHeaderDesktop } from "./components/mod-details-header-desktop";
import { ModDetailsInfoSection } from "./components/mod-details-info-section";
import { ModDetailsActionButtons } from "./components/mod-details-action-buttons";
import { useModDetails } from "./hooks/use-mod-details";
import { ConfirmationModal } from "@components";
import { useSettingsStore } from "../../../../store";
import Core from "@core";

export interface ModDetailsViewProps extends ModalViewProps {
  carouselRef?: React.RefObject<HTMLDivElement | null>;
  thumbnailsRef?: React.RefObject<HTMLDivElement | null>;
  onClose?: () => void;
}

/**
 * @description Modularized, responsive view for Mod Details Modal. Adapts layout based on viewport width.
 * @param {ModDetailsViewProps} props - The component props including the active mod card, state hooks from the parent, and action callbacks.
 * @returns {JSX.Element} The responsive layout of the mod details.
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
  targetLanguage = "en",
  isInstalled: isInstalledProp = false,
  onUpdateMod,
  onClose,
}) => {
  const details = useModDetails({
    displayCard,
    engineName,
    formatDate,
    formatFullDate,
    isInstalled: isInstalledProp,
    onUpdateMod,
    onClose,
  });

  if (!displayCard) return null;

  return (
    <>
      {/* ========================================================
          MOBILE VIEW (< 768px): Adapts dynamically to viewportWidth
          ======================================================== */}
      <div
        ref={details.mobileContainerRef}
        className="flex md:hidden flex-col w-full h-full p-4 pointer-events-auto"
        style={{
          maxWidth: details.viewportWidth ? `${details.viewportWidth}px` : "100%",
          width: "100%",
        }}
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
          engineDropdownRef={details.engineDropdownRef}
          handleSelectEngine={details.handleSelectEngine}
          isExecutable={details.isExecutable}
          isMobilePlatform={Core.isMobilePlatform()}
          isEngineInstalledOnDevice={details.isEngineInstalledOnDevice}
          handleInstallLatestEngine={details.handleInstallLatestEngine}
          isInstallingEngine={details.isInstallingEngine}
          installedEngineVersions={details.installedEngineVersions}
          isVersionDropdownOpen={details.isVersionDropdownOpen}
          setIsVersionDropdownOpen={details.setIsVersionDropdownOpen}
          versionDropdownRef={details.versionDropdownRef}
          selectedVersion={details.selectedVersion}
          handleSelectVersion={details.handleSelectVersion}
          handleOpenFolder={details.handleOpenFolder}
          onClose={onClose}
        />

        <ModMediaCarousel
          media={displayCard.previewMedia}
          fallbackImage={displayCard.img}
          title={displayCard.name}
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
          isTranslating={isTranslating}
          translatedHtml={translatedHtml}
          showTranslated={showTranslated}
          setShowTranslated={setShowTranslated}
          targetLanguage={targetLanguage}
          onManualTranslate={onManualTranslate}
          handleDownload={details.handleDownload}
          handleManage={details.handleManage}
        />

        <div className="mt-auto shrink-0 sticky bottom-0 z-20 pt-2 pb-5 mb-2 bg-gradient-to-t from-[var(--wb-surface-container)] via-[var(--wb-surface-container)]/95 to-transparent -mx-4 px-4">
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

      {/* ========================================================
          DESKTOP VIEW (>= 768px): 3D Overlapping layout
          ======================================================== */}
      <div className="hidden md:block w-full h-full relative">
        {displayCard && displayCard.previewMedia && displayCard.previewMedia.length > 1 && (
          <div
            onMouseEnter={onMouseEnterCarousel}
            onMouseLeave={onMouseLeaveCarousel}
            className="absolute top-[60%] md:top-[55%] bottom-6 left-2 md:bottom-10 md:left-4 w-[calc(100%-1rem)] md:w-[calc(60%+3rem)] p-4 md:p-6 md:pr-16 md:pt-12 z-0 flex items-end justify-start pointer-events-auto bg-[var(--wb-surface-container-lowest)] rounded-bl-3xl"
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
            engineDropdownRef={details.engineDropdownRef}
            handleSelectEngine={details.handleSelectEngine}
            isExecutable={details.isExecutable}
            installedEngineVersions={details.installedEngineVersions}
            isVersionDropdownOpen={details.isVersionDropdownOpen}
            setIsVersionDropdownOpen={details.setIsVersionDropdownOpen}
            versionDropdownRef={details.versionDropdownRef}
            selectedVersion={details.selectedVersion}
            handleSelectVersion={details.handleSelectVersion}
            handleInstallLatestEngine={details.handleInstallLatestEngine}
            isInstallingEngine={details.isInstallingEngine}
            handleOpenFolder={details.handleOpenFolder}
          />

          <div className="flex flex-col md:flex-row flex-1 w-full relative z-10 min-h-0">
            <div className="w-full md:w-[60%] flex flex-col shrink-0 relative z-10 min-h-0">
              <div className="w-full bg-[var(--wb-surface-container)] rounded-bl-2xl flex flex-col p-4 md:p-6 pb-6 md:pb-8 relative pointer-events-auto">
                <ModMediaCarousel
                  media={displayCard.previewMedia}
                  fallbackImage={displayCard.img}
                  title={displayCard.name}
                  showCaption={true}
                  activeIndex={activeIndex}
                  carouselRef={carouselRef}
                  onPrev={prevImage}
                  onNext={nextImage}
                  onMouseEnter={onMouseEnterCarousel}
                  onMouseLeave={onMouseLeaveCarousel}
                />
                <div className="absolute -bottom-6 -right-[1px] w-[calc(1.5rem+1px)] h-6 pointer-events-none hidden md:block">
                  <svg viewBox="0 0 24 24" className="w-full h-full fill-[var(--wb-surface-container)]" preserveAspectRatio="none">
                    <path d="M 0 0 C 13 0 24 11 24 24 L 24 0 Z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="w-full md:w-[40%] flex flex-col bg-[var(--wb-surface-container)] p-4 md:p-6 overflow-hidden relative rounded-b-2xl z-0 min-h-0 h-full pointer-events-auto">
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
                isTranslating={isTranslating}
                translatedHtml={translatedHtml}
                showTranslated={showTranslated}
                setShowTranslated={setShowTranslated}
                targetLanguage={targetLanguage}
                onManualTranslate={onManualTranslate}
                handleDownload={details.handleDownload}
                handleManage={details.handleManage}
              />

              <div className="pt-4 md:pt-6 mt-auto shrink-0 bg-[var(--wb-surface-container)]">
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

      {/* Shared Confirmation Modal */}
      <ConfirmationModal
        isOpen={details.isUninstallConfirmOpen}
        onClose={() => details.setIsUninstallConfirmOpen(false)}
        onConfirm={async (dontAskAgain: boolean) => {
          if (dontAskAgain) {
            await useSettingsStore.getState().dismissWarning("delete-mod");
          }
          details.setIsUninstallConfirmOpen(false);
          await details.executeUninstall();
        }}
        title="Uninstall Mod"
        description={`Are you sure you want to uninstall "${displayCard.name}"? All files for this mod will be permanently removed.`}
        confirmLabel="LET'S GO!"
        cancelLabel="Nevermind!"
        isDestructive={true}
      />
    </>
  );
};

export default ModDetailsView;
