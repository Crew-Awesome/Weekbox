import React, { useState, useEffect, useCallback, useRef } from "react";
import { Download, List, ChevronUp, Loader2, SlidersHorizontal, Trash2, HardDrive, Languages, Heart, Pencil, ChevronDown } from "lucide-react";
import { type ModalViewProps, formatFileSize } from "./types";
import { ModMediaCarousel, ModThumbnailStrip } from "./components/mod-media-carousel";
import { ModNavPills, type ModModalTab } from "./components/mod-nav-pills";
import { ModCreditsView } from "./components/mod-credits-view";
import { ModDetailsTab } from "./components/mod-details-tab";
import Core from "@core";
import Utils from "@utils";
import { ENGINE_CATEGORIES } from "../../../../core/services/gamebanana/constants";
import { useDownloadStore, DownloadStatus, useFavoritesStore } from "../../../../store";

interface MobileViewProps extends ModalViewProps {
  carouselRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Mobile specific render for the Mod Details Modal.
 * Uses a simpler, natively scrollable flat layout.
 */
export const MobileView: React.FC<MobileViewProps> = ({
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
  translatedHtml = null,
  isTranslating = false,
  showTranslated = true,
  setShowTranslated = () => {},
  onManualTranslate,
  targetLanguage = "en",
  isInstalled: isInstalledProp = false,
  onUpdateMod,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(Boolean(isInstalledProp));
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [activeTab, setActiveTab] = useState<ModModalTab>("description");

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(displayCard?.name || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState(displayCard?.htmlBody || displayCard?.description || "");
  const [isEngineDropdownOpen, setIsEngineDropdownOpen] = useState(false);
  const engineDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsInstalled(Boolean(isInstalledProp));
  }, [isInstalledProp]);

  useEffect(() => {
    setTitleInput(displayCard?.name || "");
    setIsEditingTitle(false);
  }, [displayCard?.id, displayCard?.name]);

  useEffect(() => {
    setDescInput(displayCard?.htmlBody || displayCard?.description || "");
    setIsEditingDesc(false);
  }, [displayCard?.id, displayCard?.htmlBody, displayCard?.description]);

  useEffect(() => {
    if (!isEngineDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (engineDropdownRef.current && !engineDropdownRef.current.contains(e.target as Node)) {
        setIsEngineDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEngineDropdownOpen]);

  const handleSaveTitle = useCallback(() => {
    setIsEditingTitle(false);
    const trimmed = titleInput.trim();
    if (!trimmed || trimmed === displayCard?.name) {
      setTitleInput(displayCard?.name || "");
      return;
    }
    if (onUpdateMod) {
      onUpdateMod({ name: trimmed, title: trimmed });
      Utils.toast.success("Mod title updated", { duration: 2500 });
    }
  }, [titleInput, displayCard?.name, onUpdateMod]);

  const handleSaveDesc = useCallback(() => {
    setIsEditingDesc(false);
    if (descInput === (displayCard?.htmlBody || displayCard?.description || "")) {
      return;
    }
    if (onUpdateMod) {
      onUpdateMod({ htmlBody: descInput });
      Utils.toast.success("Mod description updated", { duration: 2500 });
    }
  }, [descInput, displayCard?.htmlBody, displayCard?.description, onUpdateMod]);

  const handleSelectEngine = useCallback(
    (cat: { id: string; name: string; icon: string }) => {
      setIsEngineDropdownOpen(false);
      if (cat.name === engineName && cat.id === displayCard?.engineId) return;
      if (onUpdateMod) {
        const defaultEngineId = displayCard?.defaultEngineId || displayCard?.engineId;
        onUpdateMod({
          engineId: cat.id,
          engineName: cat.name,
          icon: cat.icon,
          defaultEngineId: defaultEngineId,
        });
      }
    },
    [engineName, displayCard?.engineId, displayCard?.defaultEngineId, onUpdateMod]
  );

  const isFav = useFavoritesStore(
    (s) => Boolean(displayCard?.id && s.favorites[String(displayCard.id)])
  );
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  const handleToggleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!displayCard) return;
    toggleFavorite(displayCard);
  }, [displayCard, toggleFavorite]);

  useEffect(() => {
    setActiveTab("description");
  }, [displayCard?.id]);

  const downloadTasks = useDownloadStore((s) => s.tasks);
  const startDownloadTask = useDownloadStore((s) => s.startDownload);
  const cancelDownloadTask = useDownloadStore((s) => s.cancelDownload);

  const downloadProgress = React.useMemo(() => {
    const map: { [key: string]: number } = {};
    Object.keys(downloadTasks).forEach((key) => {
      map[key] = downloadTasks[key].progress;
    });
    return map;
  }, [downloadTasks]);


  const [localInstalledAt, setLocalInstalledAt] = useState<number | undefined>(displayCard.installedAt);

  useEffect(() => {
    if (displayCard?.id) {
      Core.platform.getInstalledMod(displayCard.id.toString()).then((mod) => {
        setIsInstalled(Boolean(mod));
        setLocalInstalledAt(mod?.installedAt);
      }).catch(() => {
        setIsInstalled(false);
        setLocalInstalledAt(undefined);
      });
    }
  }, [displayCard?.id, downloadTasks]);

  const handleUninstall = async () => {
    setIsUninstalling(true);
    try {
      await Core.platform.uninstallMod(displayCard.id.toString());
      setIsInstalled(false);
      setLocalInstalledAt(undefined);
      Utils.toast.info(`"${displayCard.name}" uninstalled.`, {
        title: "Mod Uninstalled",
      });
    } catch (e: any) {
      Utils.toast.error(e?.message || "Failed to uninstall mod.", {
        title: "Uninstall Error",
      });
    } finally {
      setIsUninstalling(false);
    }
  };

  const isLoading = displayCard.files === undefined;
  const validFiles = Object.values(displayCard.files || {}).filter((file: any) => file._nFilesize >= 5 * 1024 * 1024);
  const hasMultipleFiles = validFiles.length > 1;
  const hasNoFiles = validFiles.length === 0;

  const singleFileId = validFiles[0]?._idRow;
  const singleFileTask = singleFileId ? downloadTasks[singleFileId] : undefined;
  const singleFileProgress = singleFileTask ? singleFileTask.progress : undefined;
  const singleFileStatus = singleFileTask ? singleFileTask.status : undefined;
  const singleFileDownloaded = singleFileTask?.downloaded;
  const singleFileTotal = singleFileTask?.total || validFiles[0]?._nFilesize;
  const singleFileCurrentFile = singleFileTask?.currentFile;

  const activeDownloadsCount = React.useMemo(() => {
    return validFiles.filter((file: any) => {
      const task = downloadTasks[file._idRow];
      const prog = task ? task.progress : downloadProgress[file._idRow];
      return prog !== undefined && prog >= 0 && prog < 100;
    }).length;
  }, [validFiles, downloadTasks, downloadProgress]);

  const handleDownload = async (url: string, id: string) => {
    if (downloadTasks[id] !== undefined) {
      cancelDownloadTask(id);
      return;
    }
    
    if (!displayCard.id) return;
    const card = displayCard as any;
    const payload = {
      id: displayCard.id,
      gameId: card.gameId,
      name: displayCard.name,
      title: displayCard.name,
      description: displayCard.description,
      htmlBody: displayCard.htmlBody,
      author: displayCard.author,
      userId: card.userId,
      userPfp: card.userPfp,
      authors: displayCard.authors || card.authors,
      credits: displayCard.credits,
      version: displayCard.version,
      updatesCount: displayCard.updatesCount,
      updates: displayCard.updates,
      externalLinks: displayCard.externalLinks,
      studio: displayCard.studio,
      categoryName: displayCard.categoryName,
      engineId: displayCard.engineId,
      engineName: engineName,
      defaultEngineId: displayCard.defaultEngineId || displayCard.engineId,
      likes: displayCard.likes ?? card.likes,
      views: displayCard.views ?? card.views,
      downloads: displayCard.downloads ?? card.downloads,
      submittedAt: displayCard.submittedAt || card.submittedAt,
      updatedAt: displayCard.updatedAt || card.updatedAt,
      timeAgo: card.timeAgo,
      thumbnail: card.thumbnail || displayCard.img,
      img: displayCard.img,
      icon: displayCard.icon,
      isNsfw: displayCard.isNsfw ?? card.isNsfw,
      previewMedia: displayCard.previewMedia,
      files: displayCard.files,
      downloadedFileId: id,
      installedFileId: id,
      installedAt: Date.now(),
      formatDate,
      formatFullDate,
    };

    await startDownloadTask({
      url,
      fileId: id,
      modId: displayCard.id.toString(),
      modName: displayCard.name,
      payload,
    });

    if (displayCard.id) {
      Core.platform.getInstalledMod(displayCard.id.toString()).then((mod) => {
        setIsInstalled(Boolean(mod));
        if (mod?.installedAt) setLocalInstalledAt(mod.installedAt);
      }).catch(() => {});
    }
  };

  const handleManage = async () => {
    if (!displayCard?.id) return;
    try {
      if (Core.platform.openModFolder) {
        await Core.platform.openModFolder(displayCard.id.toString(), displayCard.name);
        Utils.toast.info(`Opened folder for "${displayCard.name}"`, {
          title: "Mod Manager",
        });
      } else {
        Utils.toast.info(`Mod "${displayCard.name}" is installed and ready.`, {
          title: "Mod Installed",
        });
      }
    } catch {
      Utils.toast.error("Could not open mod directory.", {
        title: "Manage Mod",
      });
    }
  };

  return (
    <div className="flex md:hidden flex-col w-full h-full p-4 pointer-events-auto">
      <div className="relative z-30 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <a
            href={`https://gamebanana.com/mods/${displayCard.id}`}
            onClick={(e) => {
              e.preventDefault();
              Core.platform.openUrl(`https://gamebanana.com/mods/${displayCard.id}`);
            }}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--wb-surface-bright)]"
          >
            <img src="/assets/icons/app/gamebanana.webp" alt="GameBanana" className="w-4 h-4 object-contain opacity-80" />
          </a>
          {displayCard.icon && (
            <div className="relative z-40" ref={engineDropdownRef}>
              <div
                onClick={() => isInstalled && setIsEngineDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[4px] bg-[var(--wb-primary)]/15 text-[var(--wb-primary)] border border-[var(--wb-primary)]/30 ${
                  isInstalled ? "cursor-pointer hover:bg-[var(--wb-primary)]/25 select-none group transition-all" : ""
                }`}
                title={isInstalled ? "Click to change engine" : engineName}
              >
                <img src={displayCard.icon} alt={engineName} className="w-4.5 h-4.5 object-contain brightness-150 shrink-0" />
                <span className="text-sm font-semibold">{engineName}</span>
                {isInstalled && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-transform duration-200 ${
                      isEngineDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                )}
              </div>

              {isInstalled && isEngineDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[240px] bg-[var(--wb-surface-container-highest)] border border-[var(--wb-outline-variant)]/60 rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {Object.values(ENGINE_CATEGORIES).map((cat) => {
                    const isSelected =
                      String(cat.id).toLowerCase() === String(displayCard.engineId).toLowerCase() ||
                      cat.name.toLowerCase() === engineName.toLowerCase();
                    const defaultEngineId = displayCard.defaultEngineId || displayCard.engineId;
                    const isDefault =
                      Boolean(defaultEngineId) &&
                      (String(cat.id).toLowerCase() === String(defaultEngineId).toLowerCase() ||
                       cat.name.toLowerCase() === String(defaultEngineId).toLowerCase());
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectEngine(cat)}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left w-full ${
                          isSelected
                            ? "bg-[var(--wb-primary)]/20 text-[var(--wb-primary)]"
                            : "text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-[var(--wb-surface-container-high)]"
                        }`}
                      >
                        <img src={cat.icon} alt={cat.name} className="w-4 h-4 object-contain brightness-125 shrink-0" />
                        <span className="truncate">{cat.name}</span>
                        {isDefault && (
                          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--wb-primary)]/20 text-[var(--wb-primary)] uppercase tracking-wider shrink-0">
                            Default
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        {isInstalled && localInstalledAt && (
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--wb-surface-bright)] border border-[var(--wb-outline-variant)]/30 text-[var(--wb-on-surface-variant)] text-xs font-semibold"
            title={formatFullDate(localInstalledAt)}
          >
            <HardDrive className="w-3.5 h-3.5 text-[var(--wb-primary)]" />
            <span>Installed: {formatDate(localInstalledAt)}</span>
          </div>
        )}
      </div>

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

      <div className="mb-1">
        {isEditingTitle ? (
          <div className="w-full min-w-0">
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") {
                  setTitleInput(displayCard?.name || "");
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="w-full bg-[var(--wb-surface-container-high)] border border-[var(--wb-primary)]/60 focus:border-[var(--wb-primary)] rounded-lg px-2.5 py-1 text-xl font-bold text-[var(--wb-on-surface)] outline-none font-display shadow-inner"
              placeholder="Mod title..."
            />
          </div>
        ) : (
          <div
            onClick={() => isInstalled && setIsEditingTitle(true)}
            className={`group min-w-0 ${isInstalled ? "cursor-pointer" : ""}`}
            title={isInstalled ? "Click to edit title" : displayCard?.name}
          >
            <h1 className="text-2xl font-bold text-[var(--wb-on-surface)] leading-tight line-clamp-2" title={displayCard?.name}>
              <span>{displayCard?.name}</span>
              {isInstalled && (
                <span className="inline-flex items-center align-middle ml-1.5 opacity-60 group-hover:opacity-100 group-hover:text-[var(--wb-primary)] transition-all">
                  <Pencil className="w-4 h-4 shrink-0" />
                </span>
              )}
            </h1>
          </div>
        )}
      </div>
      {displayCard?.description && (
        <p className="text-[var(--wb-on-surface-variant)] text-xs mt-1 line-clamp-2 leading-relaxed opacity-85">
          {displayCard.description}
        </p>
      )}
      <span className="text-[var(--wb-on-surface-variant)] text-xs block">by {displayCard.author || "Unknown"}</span>
      <ModNavPills
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        contributorsCount={displayCard.credits?.reduce((acc, g) => acc + g.authors.length, 0) || displayCard.authors?.length}
        filesCount={validFiles.length}
        extraActions={
          <button
            type="button"
            onClick={handleToggleFavorite}
            title={isFav ? "Remove from favorites" : "Add to favorites"}
            aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-colors duration-100 cursor-pointer ml-0.5 ${
              isFav
                ? "bg-red-500/15 border-red-500/30 text-red-500 hover:bg-red-500/25"
                : "bg-[var(--wb-surface-bright)]/60 border-transparent hover:border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface-variant)] hover:text-red-400 hover:bg-red-500/10"
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-transform duration-100 active:scale-125 ${
                isFav ? "fill-red-500 text-red-500" : "fill-transparent"
              }`}
            />
          </button>
        }
      />
      <hr className="border-[var(--wb-outline-variant)]/30 mb-4" />
      
      {activeTab === "description" && (
        <div className="flex flex-col">
          {isTranslating && (
            <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-xl bg-[var(--wb-primary)]/10 text-[var(--wb-primary)] text-xs font-semibold animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>Translating description to {targetLanguage === "es" ? "Spanish" : "English"}...</span>
            </div>
          )}

          {!isTranslating && translatedHtml && (
            <div className="flex items-center justify-between gap-2 mb-3 py-1.5 px-3 rounded-xl bg-[var(--wb-surface-container-low)] border border-white/5 text-xs">
              <div className="flex items-center gap-2 text-[var(--wb-on-surface-variant)]">
                <Languages className="w-3.5 h-3.5 text-[var(--wb-primary)] shrink-0" />
                <span>
                  {showTranslated
                    ? `Translated to ${targetLanguage === "es" ? "Spanish" : "English"}`
                    : "Original Description"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowTranslated(!showTranslated)}
                className="text-xs font-semibold text-[var(--wb-primary)] hover:underline cursor-pointer outline-none shrink-0"
              >
                {showTranslated ? "Show original" : "Show translation"}
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mb-3">
            {isInstalled && !isEditingDesc ? (
              <button
                type="button"
                onClick={() => setIsEditingDesc(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--wb-surface-container-low)] hover:bg-[var(--wb-surface-container-high)] text-xs font-semibold text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-primary)] transition-colors cursor-pointer border border-white/5"
                title="Edit description"
              >
                <Pencil className="w-3.5 h-3.5 text-[var(--wb-primary)] shrink-0" />
                <span>Edit description</span>
              </button>
            ) : <div />}

            {!isTranslating && !translatedHtml && (
              <button
                type="button"
                onClick={onManualTranslate}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--wb-surface-container-low)] hover:bg-[var(--wb-surface-container-high)] text-xs font-semibold text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] transition-colors cursor-pointer border border-white/5"
              >
                <Languages className="w-3.5 h-3.5 text-[var(--wb-primary)] shrink-0" />
                <span>Translate to {targetLanguage === "es" ? "Spanish" : "English"}</span>
              </button>
            )}
          </div>

          {isEditingDesc ? (
            <div className="flex flex-col gap-2 pb-6">
              <textarea
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                onBlur={handleSaveDesc}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setDescInput(displayCard.description || "");
                    setIsEditingDesc(false);
                  }
                }}
                autoFocus
                rows={6}
                className="w-full bg-[var(--wb-surface-container-high)] border border-[var(--wb-primary)]/60 focus:border-[var(--wb-primary)] rounded-lg p-3 text-sm text-[var(--wb-on-surface)] outline-none custom-scrollbar resize-y shadow-inner font-sans"
                placeholder="Enter custom mod description..."
              />
              <div className="flex items-center justify-between text-[11px] text-[var(--wb-on-surface-variant)] px-1">
                <span>Click outside or press Escape to finish</span>
                <button
                  type="button"
                  onClick={handleSaveDesc}
                  className="px-2.5 py-1 rounded-md bg-[var(--wb-primary)]/20 hover:bg-[var(--wb-primary)]/30 text-[var(--wb-primary)] font-semibold text-xs cursor-pointer transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : displayCard.htmlBody ? (
            <div
              onClick={() => isInstalled && setIsEditingDesc(true)}
              className={`text-[var(--wb-on-surface-variant)] prose prose-invert prose-sm max-w-full pb-6 overflow-x-hidden break-words [&_*]:max-w-full [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_table]:block [&_table]:overflow-x-auto ${
                isInstalled ? "cursor-pointer hover:bg-white/[0.02] rounded-lg transition-colors p-1" : ""
              }`}
              title={isInstalled ? "Click to edit description" : undefined}
              dangerouslySetInnerHTML={{
                __html: showTranslated && translatedHtml ? translatedHtml : displayCard.htmlBody,
              }}
            />
          ) : (
            <p
              onClick={() => isInstalled && setIsEditingDesc(true)}
              className={`text-[var(--wb-on-surface-variant)] text-sm pb-6 break-words ${
                isInstalled ? "cursor-pointer hover:bg-white/[0.02] rounded-lg transition-colors p-1" : ""
              }`}
              title={isInstalled ? "Click to edit description" : undefined}
            >
              {showTranslated && translatedHtml ? translatedHtml : displayCard.description}
            </p>
          )}
        </div>
      )}
      {activeTab === "contributors" && (
        <ModCreditsView
          credits={displayCard.credits}
          authors={displayCard.authors}
          author={displayCard.author}
        />
      )}
      {activeTab === "details" && (
        <ModDetailsTab
          displayCard={{
            ...displayCard,
            installedAt: localInstalledAt || displayCard.installedAt,
          }}
          engineName={engineName}
          formatDate={formatDate}
          formatFullDate={formatFullDate}
          onDownloadFile={handleDownload}
          onManageFile={handleManage}
          isInstalled={isInstalled}
        />
      )}

      <div 
        className="mt-auto shrink-0 sticky bottom-0 z-20 pt-2"
        onMouseLeave={() => setIsDropdownOpen(false)}
      >
        <div className="relative w-full">
          {isInstalled ? (
            <div className="flex gap-2 w-full">
              <button 
                onClick={handleManage}
                className="flex-1 bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300 cursor-pointer"
              >
                <SlidersHorizontal className="w-5 h-5" />
                <span className="text-base">Manage</span>
              </button>
              <button 
                onClick={handleUninstall}
                disabled={isUninstalling}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300 border border-red-500/20"
              >
                {isUninstalling ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
                <span className="text-base">{isUninstalling ? "Uninstalling..." : "Uninstall"}</span>
              </button>
            </div>
          ) : (
            <>
              {isLoading ? (
                <button 
                  disabled
                  className="w-full bg-[var(--wb-primary)] text-[var(--wb-on-primary)] py-3 rounded-xl flex items-center justify-center gap-2 font-bold opacity-80 cursor-wait px-4"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading...</span>
                </button>
              ) : hasNoFiles ? (
                <button 
                  disabled
                  className="w-full bg-[var(--wb-surface-variant)] text-[var(--wb-on-surface-variant)] cursor-not-allowed py-3 rounded-xl flex items-center justify-center gap-2 px-4 font-bold opacity-60 select-none pointer-events-auto transition-none shadow-none hover:bg-[var(--wb-surface-variant)] hover:opacity-60 hover:transform-none active:transform-none"
                >
                  <Download className="w-5 h-5 pointer-events-none" />
                  <span className="pointer-events-none">No downloads available</span>
                </button>
              ) : (
                <button 
                  onClick={() => {
                    if (hasMultipleFiles) {
                      setActiveTab("details");
                    } else if (validFiles.length === 1) {
                      handleDownload(validFiles[0]._sDownloadUrl, validFiles[0]._idRow.toString());
                    }
                  }}
                  disabled={!hasMultipleFiles && singleFileProgress === -1}
                  className={`${!hasMultipleFiles && singleFileProgress === -1 ? "opacity-80 cursor-wait" : "group"} relative w-full bg-[var(--wb-primary)] text-[var(--wb-on-primary)] py-3 rounded-xl flex items-center justify-center px-4 font-bold transition-all duration-300 hover:opacity-90 overflow-hidden`}
                >
                  {!hasMultipleFiles && singleFileProgress !== undefined && singleFileProgress >= 0 && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-black/20 pointer-events-none transition-all duration-300" 
                      style={{ width: `${singleFileProgress}%` }} 
                    />
                  )}
                  
                  {!hasMultipleFiles && singleFileProgress !== undefined && singleFileProgress >= 0 && singleFileProgress < 100 && (
                    <div className="absolute inset-0 bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                      <span className="text-white font-bold text-base">Cancel Download</span>
                    </div>
                  )}

                  {hasMultipleFiles ? (
                    <>
                      <div className="flex items-center justify-center gap-2 relative z-10">
                        <List className="w-5 h-5 shrink-0" />
                        <div className="flex flex-col items-center justify-center leading-tight">
                          <span className="text-base font-bold leading-tight">Multiple Files</span>
                          {activeDownloadsCount > 0 && (
                            <div className="flex items-center gap-1.5 text-xs font-semibold opacity-90 mt-0.5">
                              <span>Active Downloads</span>
                              <span className="inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--wb-on-primary)] text-[var(--wb-primary)] text-[10px] font-black leading-none shadow-sm">
                                {activeDownloadsCount}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronUp className={`absolute right-4 w-5 h-5 transition-transform relative z-10 ${isDropdownOpen ? "rotate-180" : ""}`} />
                    </>
                  ) : (
                    <div className={`flex items-center justify-center gap-2 relative z-10 transition-opacity duration-200 ${singleFileProgress !== undefined && singleFileProgress >= 0 && singleFileProgress < 100 ? "group-hover:opacity-0" : ""}`}>
                      {singleFileProgress === -1 ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin opacity-80" />
                          <span className="text-base">Canceling...</span>
                        </>
                      ) : singleFileProgress === 100 ? (
                        <span>Completed</span>
                      ) : (singleFileStatus && singleFileStatus !== DownloadStatus.DOWNLOADING) || singleFileProgress === 99 ? (
                        <div className="flex items-center justify-center gap-2 max-w-full px-2">
                          <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                          <div className="flex flex-col items-center leading-tight min-w-0 overflow-hidden">
                            <span className="text-base truncate max-w-full">{singleFileStatus || "Extracting archive..."}</span>
                            {singleFileCurrentFile ? (
                              <span className="text-xs font-normal opacity-80 truncate max-w-[240px] leading-none mt-1">
                                {singleFileCurrentFile}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : singleFileProgress !== undefined ? (
                        <div className="flex items-center justify-center gap-2 max-w-full px-2">
                          <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                          <div className="flex flex-col items-center leading-tight min-w-0">
                            <span className="text-base">Downloading... {singleFileProgress}%</span>
                            {singleFileDownloaded !== undefined && singleFileDownloaded > 0 ? (
                              <span className="text-xs font-normal opacity-80 leading-none mt-1">
                                {formatFileSize(singleFileDownloaded)} {singleFileTotal && singleFileTotal > 0 ? `/ ${formatFileSize(singleFileTotal)}` : ""}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <>
                          <Download className="w-5 h-5 shrink-0" />
                          <div className="flex flex-col items-start leading-tight">
                            <span className="text-base leading-tight">Download</span>
                            {validFiles[0]?._nFilesize ? (
                              <span className="text-xs font-normal opacity-80 leading-none mt-0.5">
                                {formatFileSize(validFiles[0]._nFilesize)}
                              </span>
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
