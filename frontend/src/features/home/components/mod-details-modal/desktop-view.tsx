import React, { useState } from "react";
import { ExternalLink, Plus, RefreshCw, Download, ChevronLeft, ChevronRight } from "lucide-react";
import type { ModalViewProps } from "./types";

interface DesktopViewProps extends ModalViewProps {
  carouselRef: React.RefObject<HTMLDivElement | null>;
  thumbnailsRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Desktop specific render for the Mod Details Modal.
 * Includes the 3D overlapping layout and dual absolute layers.
 */
export const DesktopView: React.FC<DesktopViewProps> = ({
  displayCard,
  engineName,
  formatDate,
  formatFullDate,
  activeIndex,
  handleScroll,
  scrollToIndex,
  prevImage,
  nextImage,
  carouselRef,
  thumbnailsRef,
}) => {
  const [hoverTooltip, setHoverTooltip] = useState<"submitted" | "updated" | null>(null);

  return (
    <div className="hidden md:block w-full h-full relative">
      {displayCard && displayCard.previewMedia && displayCard.previewMedia.length > 1 && (
        <div className="absolute top-[60%] md:top-[55%] bottom-6 left-2 md:bottom-10 md:left-4 w-[calc(100%-1rem)] md:w-[calc(60%+3rem)] p-4 md:p-6 md:pr-16 md:pt-12 z-0 flex items-end justify-start pointer-events-auto bg-[var(--wb-surface-container-lowest)] rounded-bl-3xl">
          <div className="relative w-full h-[45%] md:h-[40%] group">
            <div ref={thumbnailsRef} className="flex gap-2 md:gap-3 w-full h-full overflow-hidden touch-pan-x pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {displayCard.previewMedia.map((src, i) => (
                <button
                  key={i}
                  onClick={() => scrollToIndex(i)}
                  className={`shrink-0 h-full aspect-[16/9] rounded-xl overflow-hidden border-[3px] transition-all shadow-inner ${
                    activeIndex === i
                      ? "border-[var(--wb-primary)] opacity-100 scale-105"
                      : "border-transparent opacity-60 hover:opacity-100 hover:scale-105"
                  }`}
                >
                  <img src={src} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <button onClick={prevImage} className="absolute left-1 top-[calc(50%-0.25rem)] -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white transition-colors opacity-0 group-hover:opacity-100 shadow-md"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={nextImage} className="absolute right-1 top-[calc(50%-0.25rem)] -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white transition-colors opacity-0 group-hover:opacity-100 shadow-md"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full overflow-hidden text-[var(--wb-on-surface)] w-full relative z-10 filter drop-shadow-[0_8px_32px_rgba(0,0,0,0.6)] pointer-events-none">
        <div className="relative flex items-center px-4 md:px-6 pt-2 pb-3 md:pt-3 md:pb-4 shrink-0 bg-[var(--wb-surface-container)] min-h-[56px] pr-16 md:pr-4 rounded-t-2xl pointer-events-auto">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap z-10">
            <a href={`https://gamebanana.com/mods/${displayCard.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-[var(--wb-surface-bright)] hover:bg-white/10 transition-colors relative group shrink-0">
              <img src="/assets/icons/app/gamebanana.webp" alt="GameBanana" className="w-4 h-4 md:w-5 md:h-5 object-contain opacity-80" />
              <div className="absolute -bottom-1 -right-1 bg-[var(--wb-surface-container)] rounded-full p-[2px]">
                <ExternalLink className="w-3 h-3 text-[var(--wb-on-surface-variant)] group-hover:text-[var(--wb-on-surface)]" />
              </div>
            </a>
            <div className="w-[1px] h-6 bg-white/10 mx-1" />
            {displayCard.icon && (
              <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full bg-[#6434d4]/20 text-[#ab8af1] border border-[#6434d4]/30 shrink-0">
                <img src={displayCard.icon} alt={engineName} className="w-4 h-4 object-contain brightness-150" />
                <span className="text-xs md:text-sm font-semibold">{engineName}</span>
              </div>
            )}
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none hidden md:flex">
            <div className="flex items-center gap-2 pointer-events-auto shrink-0">
              <div 
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--wb-surface-bright)] border border-white/10 text-[var(--wb-on-surface-variant)] text-sm select-none cursor-default"
                onMouseEnter={() => setHoverTooltip("submitted")}
                onMouseLeave={() => setHoverTooltip(null)}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{formatDate(displayCard.submittedAt)}</span>
                <div className={`absolute left-1/2 top-full -translate-x-1/2 mt-2 z-[100] pointer-events-none transition-opacity duration-200 flex flex-col items-center ${hoverTooltip === "submitted" ? "opacity-100" : "opacity-0"}`}>
                  <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-black/90"></div>
                  <div className="bg-black/90 text-[var(--wb-text-main)] text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                    Submitted: {formatFullDate(displayCard.submittedAt)}
                  </div>
                </div>
              </div>

              {displayCard.updatedAt && displayCard.updatedAt !== displayCard.submittedAt && (
                <div 
                  className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--wb-surface-bright)] border border-white/10 text-[var(--wb-on-surface-variant)] text-sm select-none cursor-default"
                  onMouseEnter={() => setHoverTooltip("updated")}
                  onMouseLeave={() => setHoverTooltip(null)}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{formatDate(displayCard.updatedAt)}</span>
                  <div className={`absolute left-1/2 top-full -translate-x-1/2 mt-2 z-[100] pointer-events-none transition-opacity duration-200 flex flex-col items-center ${hoverTooltip === "updated" ? "opacity-100" : "opacity-0"}`}>
                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-black/90"></div>
                    <div className="bg-black/90 text-[var(--wb-text-main)] text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                      Updated: {formatFullDate(displayCard.updatedAt)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 w-full relative z-10 min-h-0">
          <div className="w-full md:w-[60%] flex flex-col shrink-0 relative z-10 min-h-0">
            <div className="w-full bg-[var(--wb-surface-container)] rounded-bl-2xl flex flex-col p-4 md:p-6 pb-6 md:pb-8 relative pointer-events-auto">
              <div className="w-full aspect-[16/9] relative rounded-2xl overflow-hidden bg-black/20 shrink-0 group">
                {displayCard.previewMedia && displayCard.previewMedia.length > 0 ? (
                  <>
                    <div ref={carouselRef} onScroll={handleScroll} className="w-full h-full flex overflow-hidden snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {displayCard.previewMedia.map((src, i) => (
                        <div key={i} className="w-full h-full shrink-0 snap-center relative flex items-center justify-center bg-black">
                          <img src={src} className="w-full h-full object-cover" />
                          <div className="w-full bg-black/60 backdrop-blur-sm text-white/80 text-xs md:text-sm py-2 px-4 text-center absolute bottom-0">{displayCard.name} - {i + 1}</div>
                        </div>
                      ))}
                    </div>
                    {displayCard.previewMedia.length > 1 && (
                      <>
                        <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors z-10 opacity-0 group-hover:opacity-100"><ChevronLeft className="w-5 h-5 md:w-6 md:h-6" /></button>
                        <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors z-10 opacity-0 group-hover:opacity-100"><ChevronRight className="w-5 h-5 md:w-6 md:h-6" /></button>
                      </>
                    )}
                  </>
                ) : (
                  displayCard.img && <img src={displayCard.img} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="absolute -bottom-6 -right-[1px] w-[calc(1.5rem+1px)] h-6 pointer-events-none hidden md:block">
                 <svg viewBox="0 0 24 24" className="w-full h-full fill-[var(--wb-surface-container)]" preserveAspectRatio="none"><path d="M 0 0 C 13 0 24 11 24 24 L 24 0 Z" /></svg>
              </div>
            </div>
          </div>

          <div className="w-full md:w-[40%] flex flex-col bg-[var(--wb-surface-container)] p-4 md:p-6 overflow-hidden relative rounded-b-2xl z-0 min-h-0 h-full pointer-events-auto">
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[var(--wb-on-surface)] leading-tight font-display break-words">{displayCard.name}</h1>
              <span className="text-[var(--wb-on-surface-variant)] text-xs md:text-sm mt-1">by {displayCard.author || "Unknown"}</span>
              <hr className="border-white/10 my-4 md:my-6" />
              {displayCard.htmlBody ? (
                <div className="text-[var(--wb-on-surface-variant)] prose prose-invert prose-sm md:prose-base max-w-none pb-4" dangerouslySetInnerHTML={{ __html: displayCard.htmlBody }} />
              ) : (
                <p className="text-[var(--wb-on-surface-variant)] text-sm md:text-base pb-4">{displayCard.description}</p>
              )}
            </div>
            <div className="pt-4 md:pt-6 mt-auto shrink-0 bg-[var(--wb-surface-container)]">
              <button className="w-full bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] py-3 md:py-4 rounded-xl flex items-center justify-center gap-2 md:gap-3 px-6 transition-opacity font-bold">
                <Download className="w-5 h-5 md:w-6 md:h-6" />
                <span className="text-base md:text-lg">Download</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
