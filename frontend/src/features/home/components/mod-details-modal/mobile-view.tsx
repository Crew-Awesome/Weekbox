import React, { useState, useEffect } from "react";
import { Download, List, ChevronUp, Loader2, SlidersHorizontal, Trash2 } from "lucide-react";
import { type ModalViewProps, formatFileSize } from "./types";
import { ModMediaCarousel, ModThumbnailStrip } from "./components/mod-media-carousel";
import Core from "@core";
import Utils from "@utils";
import { useDownloadStore, DownloadStatus } from "../../../../store";

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
  activeIndex,
  handleScroll,
  scrollToIndex,
  prevImage,
  nextImage,
  carouselRef,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);

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

  const downloadStatus = React.useMemo(() => {
    const map: { [key: string]: string } = {};
    Object.keys(downloadTasks).forEach((key) => {
      map[key] = downloadTasks[key].status;
    });
    return map;
  }, [downloadTasks]);

  useEffect(() => {
    if (displayCard?.id) {
      Core.platform.isModInstalled(displayCard.id.toString()).then(setIsInstalled);
    }
  }, [displayCard?.id, downloadTasks]);

  const handleUninstall = async () => {
    setIsUninstalling(true);
    try {
      await Core.platform.uninstallMod(displayCard.id.toString());
      setIsInstalled(false);
      Utils.toast.info(`"${displayCard.name}" uninstalled.`, {
        title: "Mod Uninstalled",
      });
    } catch (e) {
      console.warn("Error uninstalling:", e);
      Utils.toast.error("Failed to uninstall mod.", {
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
  const singleFileProgress = singleFileId ? downloadProgress[singleFileId] : undefined;
  const singleFileStatus = singleFileId ? downloadStatus[singleFileId] : undefined;

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
      title: displayCard.name,
      description: displayCard.description,
      htmlBody: displayCard.htmlBody,
      author: displayCard.author,
      userId: card.userId,
      userPfp: card.userPfp,
      authors: card.authors,
      likes: card.likes,
      views: card.views,
      downloads: card.downloads,
      submittedAt: card.submittedAt,
      updatedAt: card.updatedAt,
      timeAgo: card.timeAgo,
      thumbnail: card.thumbnail,
      isNsfw: card.isNsfw,
      previewMedia: card.previewMedia,
      files: displayCard.files,
      engineName: engineName,
      formatDate: () => "",
      formatFullDate: () => "",
    };

    await startDownloadTask({
      url,
      fileId: id,
      modId: displayCard.id.toString(),
      modName: displayCard.name,
      payload,
    });

    if (displayCard.id) {
      Core.platform.isModInstalled(displayCard.id.toString()).then(setIsInstalled).catch(() => {});
    }
  };

  return (
    <div className="flex md:hidden flex-col w-full h-full p-4 pointer-events-auto">
      <div className="flex items-center justify-between mb-4">
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
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6434d4]/20 text-[#ab8af1] border border-[#6434d4]/30">
              <img src={displayCard.icon} alt={engineName} className="w-4 h-4 object-contain brightness-150" />
              <span className="text-xs font-semibold">{engineName}</span>
            </div>
          )}
        </div>
      </div>

      <ModMediaCarousel
        media={displayCard.previewMedia}
        fallbackImage={displayCard.img}
        title={displayCard.name}
        carouselRef={carouselRef}
        onScroll={handleScroll}
        onPrev={prevImage}
        onNext={nextImage}
        roundedClassName="rounded-2xl mb-4"
      />

      <ModThumbnailStrip
        media={displayCard.previewMedia || []}
        activeIndex={activeIndex}
        onSelectIndex={scrollToIndex}
        variant="mobile"
      />

      <h1 className="text-2xl font-bold text-[var(--wb-on-surface)] mb-1 leading-tight">{displayCard.name}</h1>
      <span className="text-[var(--wb-on-surface-variant)] text-xs mb-4 block">by {displayCard.author || "Unknown"}</span>
      <hr className="border-white/10 mb-4" />
      
      {displayCard.htmlBody ? (
        <div className="text-[var(--wb-on-surface-variant)] prose prose-invert prose-sm max-w-full pb-6 overflow-x-hidden break-words [&_*]:max-w-full [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_table]:block [&_table]:overflow-x-auto" dangerouslySetInnerHTML={{ __html: displayCard.htmlBody }} />
      ) : (
        <p className="text-[var(--wb-on-surface-variant)] text-sm pb-6 break-words">{displayCard.description}</p>
      )}

      <div 
        className="mt-auto shrink-0 sticky bottom-0 z-20 pt-2"
        onMouseLeave={() => setIsDropdownOpen(false)}
      >
        <div className="relative w-full">
          {isInstalled ? (
            <div className="flex gap-2 w-full">
              <button className="flex-1 bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300">
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
              {hasMultipleFiles && isDropdownOpen && (
                <div className="absolute bottom-[calc(100%+2px)] left-0 w-full bg-[var(--wb-surface-bright)] border border-white/10 rounded-xl shadow-lg flex flex-col overflow-hidden z-50">
                  {validFiles.map((file: any) => {
                    const prog = downloadProgress[file._idRow];
                    const status = downloadStatus[file._idRow];
                    const isDownloading = prog !== undefined && prog >= 0 && prog < 100;
                    const isCanceling = prog === -1;
                    return (
                      <button 
                        key={file._idRow} 
                        onClick={() => handleDownload(file._sDownloadUrl, file._idRow.toString())} 
                        className={`text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 flex flex-col gap-1 transition-colors relative overflow-hidden ${isCanceling ? "cursor-wait opacity-80" : "group"}`}
                        disabled={isCanceling}
                      >
                        {prog !== undefined && prog >= 0 && (
                          <div className="absolute inset-0 bg-[var(--wb-primary)] opacity-20 pointer-events-none transition-all duration-300" style={{ width: `${prog}%` }} />
                        )}
                        {isDownloading && (
                          <div className="absolute inset-0 bg-red-500/90 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                            <span className="text-white font-bold text-sm">Cancel Download</span>
                          </div>
                        )}
                        <span className={`text-sm font-semibold truncate w-full text-[var(--wb-on-surface)] relative z-10 transition-opacity ${isDownloading ? "group-hover:opacity-0" : ""}`}>
                          {isCanceling
                            ? "Canceling..."
                            : prog !== undefined
                            ? prog === 100
                              ? "Completed"
                              : status && status !== DownloadStatus.DOWNLOADING
                              ? status
                              : prog === 99
                              ? "Extracting archive..."
                              : `Downloading... ${prog}%`
                            : file._sFile}
                        </span>
                        <span className={`text-xs text-[var(--wb-on-surface-variant)] relative z-10 transition-opacity ${isDownloading ? "group-hover:opacity-0" : ""}`}>{Math.round(file._nFilesize / 1024 / 1024)} MB - {file._nDownloadCount} downloads</span>
                      </button>
                    );
                  })}
                </div>
              )}
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
                      setIsDropdownOpen(!isDropdownOpen);
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
                        <List className="w-5 h-5" />
                        <span>Multiple Files</span>
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
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-base">{singleFileStatus || "Extracting archive..."}</span>
                        </>
                      ) : singleFileProgress !== undefined ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Downloading... {singleFileProgress}%</span>
                        </>
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
