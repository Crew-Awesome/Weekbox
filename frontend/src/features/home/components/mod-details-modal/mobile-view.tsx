import React, { useState } from "react";
import { Download, ChevronLeft, ChevronRight, List, ChevronUp, Loader2 } from "lucide-react";
import type { ModalViewProps } from "./types";

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
  const isLoading = displayCard.files === undefined;
  const validFiles = Object.values(displayCard.files || {}).filter((file: any) => file._nFilesize >= 5 * 1024 * 1024);
  const hasMultipleFiles = validFiles.length > 1;
  const hasNoFiles = validFiles.length === 0;

  return (
    <div className="flex md:hidden flex-col w-full h-full p-4 pointer-events-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <a
            href={`https://gamebanana.com/mods/${displayCard.id}`}
            target="_blank"
            rel="noopener noreferrer"
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
          {hasMultipleFiles && isDropdownOpen && (
            <div className="absolute bottom-[calc(100%+2px)] left-0 w-full bg-[var(--wb-surface-bright)] border border-white/10 rounded-xl shadow-lg flex flex-col overflow-hidden z-50">
              {validFiles.map((file: any) => (
                <button key={file._idRow} onClick={() => window.open(file._sDownloadUrl, '_blank')} className="text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 flex flex-col gap-1 transition-colors">
                  <span className="text-sm font-semibold truncate w-full text-[var(--wb-on-surface)]">{file._sFile}</span>
                  <span className="text-xs text-[var(--wb-on-surface-variant)]">{Math.round(file._nFilesize / 1024 / 1024)} MB • {file._nDownloadCount} downloads</span>
                </button>
              ))}
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
                  window.open(validFiles[0]._sDownloadUrl, '_blank');
                }
              }}
              className="relative w-full bg-[var(--wb-primary)] text-[var(--wb-on-primary)] py-3 rounded-xl flex items-center justify-center px-4 font-bold transition-opacity hover:opacity-90"
            >
              {hasMultipleFiles ? (
                <>
                  <div className="flex items-center justify-center gap-2">
                    <List className="w-5 h-5" />
                    <span>Multiple Files</span>
                  </div>
                  <ChevronUp className={`absolute right-4 w-5 h-5 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                </>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" />
                  <span>Download</span>
                </div>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
