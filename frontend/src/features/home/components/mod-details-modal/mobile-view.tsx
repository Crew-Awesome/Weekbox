import React, { useState, useEffect } from "react";
import { Download, ChevronLeft, ChevronRight, List, ChevronUp, Loader2, Play, Trash2 } from "lucide-react";
import type { ModalViewProps } from "./types";
import Core from "../../../../core";

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
  const abortControllersRef = React.useRef<{ [key: string]: AbortController }>({});
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});
  const [isInstalled, setIsInstalled] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);

  useEffect(() => {
    if (displayCard?.id) {
      Core.platform.isModInstalled(displayCard.id.toString()).then(setIsInstalled);
    }
  }, [displayCard?.id]);

  const handleUninstall = async () => {
    setIsUninstalling(true);
    try {
      await Core.platform.uninstallMod(displayCard.id.toString());
      setIsInstalled(false);
    } catch (e) {
      console.warn("Error uninstalling:", e);
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

  const handleDownload = async (url: string, id: string) => {
    if (downloadProgress[id] !== undefined) {
      if (abortControllersRef.current[id]) {
        abortControllersRef.current[id].abort();
        delete abortControllersRef.current[id];
        setDownloadProgress(prev => ({ ...prev, [id]: -1 }));
      }
      return;
    }
    
    setDownloadProgress(prev => ({ ...prev, [id]: 0 }));
    const controller = new AbortController();
    abortControllersRef.current[id] = controller;
    
    try {
      if (!displayCard.id) throw new Error("No mod ID");
      
      const payload = {
        id: displayCard.id,
        gameId: displayCard.gameId,
        title: displayCard.name,
        description: displayCard.description,
        htmlBody: displayCard.htmlBody,
        author: displayCard.author,
        userId: displayCard.userId,
        userPfp: displayCard.userPfp,
        authors: displayCard.authors,
        likes: displayCard.likes,
        views: displayCard.views,
        downloads: displayCard.downloads,
        submittedAt: displayCard.submittedAt,
        updatedAt: displayCard.updatedAt,
        timeAgo: displayCard.timeAgo,
        thumbnail: displayCard.thumbnail,
        isNsfw: displayCard.isNsfw,
        previewMedia: displayCard.previewMedia,
        files: displayCard.files,
        engineName: engineName,
        formatDate: () => "", // not used in payload
        formatFullDate: () => "", // not used in payload
      };

      await Core.platform.downloadMod(url, id, displayCard.id.toString(), payload, controller.signal, (progress) => {
        setDownloadProgress(prev => {
          if (prev[id] === -1) return prev; // Ignore if canceling
          return { ...prev, [id]: progress };
        });
      });
      
      setIsInstalled(true);
      setDownloadProgress(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err: any) {
      if (err?.message !== "Cancelled") {
        console.error("Error downloading mod:", err);
      }
      setDownloadProgress(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } finally {
      delete abortControllersRef.current[id];
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

      <div className="w-full aspect-[16/9] relative rounded-2xl overflow-hidden bg-black/20 shrink-0 mb-4 group">
        {displayCard.previewMedia && displayCard.previewMedia.length > 0 ? (
          <>
            <div
              ref={carouselRef}
              onScroll={handleScroll}
              className="w-full h-full flex overflow-hidden snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {displayCard.previewMedia.map((src, i) => (
                <div key={i} className="w-full h-full shrink-0 snap-center relative flex items-center justify-center bg-black">
                  <img src={src} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            {displayCard.previewMedia.length > 1 && (
              <>
                <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white z-10"><ChevronLeft className="w-5 h-5 mx-auto" /></button>
                <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white z-10"><ChevronRight className="w-5 h-5 mx-auto" /></button>
              </>
            )}
          </>
        ) : (
          displayCard.img && <img src={displayCard.img} className="w-full h-full object-cover" />
        )}
      </div>

      {displayCard.previewMedia && displayCard.previewMedia.length > 1 && (
        <div className="flex gap-2 w-full overflow-x-auto touch-pan-x pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {displayCard.previewMedia.map((src, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i)}
              className={`shrink-0 w-20 h-12 rounded-lg overflow-hidden border-[2px] ${
                activeIndex === i ? "border-[var(--wb-primary)]" : "border-transparent opacity-60"
              }`}
            >
              <img src={src} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

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
                <Play className="w-5 h-5" fill="currentColor" />
                <span className="text-base">Play</span>
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
                          {isCanceling ? "Canceling..." : prog !== undefined ? (prog === 100 ? "Completed" : `Downloading... ${prog}%`) : file._sFile}
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
                  className="w-full bg-[var(--wb-surface-variant)] text-[var(--wb-on-surface-variant)] cursor-not-allowed py-3 rounded-xl flex items-center justify-center gap-2 px-4 font-bold opacity-60"
                >
                  <Download className="w-5 h-5" />
                  <span>No downloads available</span>
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
                      ) : singleFileProgress !== undefined ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Downloading... {singleFileProgress}%</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          <span>Download</span>
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
