import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import placeholderImg from "/assets/images/placeholder-mini.webp";

export interface ModMediaCarouselProps {
  media?: string[];
  fallbackImage?: string;
  title: string;
  showCaption?: boolean;
  activeIndex?: number;
  carouselRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onPrev?: (e?: React.MouseEvent) => void;
  onNext?: (e?: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  aspectRatioClassName?: string;
  roundedClassName?: string;
}

export const ModMediaCarousel: React.FC<ModMediaCarouselProps> = ({
  media = [],
  fallbackImage,
  title,
  showCaption = false,
  activeIndex = 0,
  carouselRef,
  onPrev,
  onNext,
  onMouseEnter,
  onMouseLeave,
  aspectRatioClassName = "aspect-[16/9]",
  roundedClassName = "rounded-2xl",
}) => {
  const isCleanUrl = (url?: unknown): url is string =>
    typeof url === "string" &&
    url.trim().length > 0 &&
    !url.includes("undefined") &&
    url !== "[object Object]";

  const validMedia = (Array.isArray(media) ? media : []).filter(isCleanUrl);
  const effectiveMedia =
    validMedia.length > 0
      ? validMedia
      : isCleanUrl(fallbackImage)
        ? [fallbackImage]
        : [placeholderImg];

  const hasMultiple = effectiveMedia.length > 1;
  const hasMedia = effectiveMedia.length > 0;

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!hasMultiple) return;
    setTouchStart(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentX = e.touches[0].clientX;
    setTouchDelta(currentX - touchStart);
  };

  const handleTouchEnd = () => {
    if (touchStart === null) return;
    const minSwipeDistance = 45;
    if (touchDelta < -minSwipeDistance) {
      onNext?.();
    } else if (touchDelta > minSwipeDistance) {
      onPrev?.();
    }
    setTouchStart(null);
    setTouchDelta(0);
    setIsSwiping(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!hasMultiple) return;
    e.preventDefault();
    setTouchStart(e.clientX);
    setIsSwiping(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (touchStart === null || !isSwiping) return;
    e.preventDefault();
    const currentX = e.clientX;
    setTouchDelta(currentX - touchStart);
  };

  const handleMouseUp = () => {
    if (touchStart === null) return;
    const minSwipeDistance = 45;
    if (touchDelta < -minSwipeDistance) {
      onNext?.();
    } else if (touchDelta > minSwipeDistance) {
      onPrev?.();
    }
    setTouchStart(null);
    setTouchDelta(0);
    setIsSwiping(false);
  };

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`w-full ${aspectRatioClassName} relative ${roundedClassName} overflow-hidden bg-black/20 shrink-0 group select-none`}
    >
      {hasMedia ? (
        <>
          <div
            ref={carouselRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDragStart={(e) => e.preventDefault()}
            className={`w-full h-full relative overflow-hidden ${hasMultiple ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            <div
              className="flex w-full h-full transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(calc(-${activeIndex * 100}% + ${isSwiping ? touchDelta : 0}px))`,
                transitionProperty: isSwiping ? "none" : "transform",
              }}
            >
              {effectiveMedia.map((src, i) => (
                <SlideItem
                  key={`${src}-${i}`}
                  src={src}
                  caption={showCaption ? `${title} (${i + 1}/${effectiveMedia.length})` : undefined}
                />
              ))}
            </div>
          </div>

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={onPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-all duration-200 z-10 opacity-0 group-hover:opacity-100 cursor-pointer shadow-md active:scale-95"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              <button
                type="button"
                onClick={onNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-all duration-200 z-10 opacity-0 group-hover:opacity-100 cursor-pointer shadow-md active:scale-95"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </>
          )}
        </>
      ) : (
        <SlideItem src={fallbackImage || placeholderImg} />
      )}
    </div>
  );
};

interface SlideItemProps {
  src: string;
  caption?: string;
}

const SlideItem: React.FC<SlideItemProps> = ({ src, caption }) => {
  const isClean =
    typeof src === "string" &&
    src.trim().length > 0 &&
    !src.includes("undefined") &&
    src !== "[object Object]";
  const safeSrc = isClean ? src : placeholderImg;
  const [loaded, setLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(safeSrc);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    setCurrentSrc(safeSrc);
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [safeSrc]);

  return (
    <div className="w-full h-full shrink-0 relative flex items-center justify-center bg-black overflow-hidden">
      {!loaded && (
        <img
          src={placeholderImg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40 filter blur-[1px]"
          draggable={false}
        />
      )}

      <img
        ref={imgRef}
        src={currentSrc}
        alt=""
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (currentSrc !== placeholderImg) {
            setCurrentSrc(placeholderImg);
            setLoaded(true);
          }
        }}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />

      {caption && (
        <div className="w-full bg-black/60 backdrop-blur-sm text-white/80 text-xs md:text-sm py-2 px-4 text-center absolute bottom-0 z-20">
          {caption}
        </div>
      )}
    </div>
  );
};

export interface ModThumbnailStripProps {
  media: string[];
  activeIndex: number;
  onSelectIndex: (index: number) => void;
  stripRef?: React.RefObject<HTMLDivElement | null>;
  onPrev?: (e: React.MouseEvent) => void;
  onNext?: (e: React.MouseEvent) => void;
  variant?: "desktop" | "mobile";
}

export const ModThumbnailStrip: React.FC<ModThumbnailStripProps> = ({
  media,
  activeIndex,
  onSelectIndex,
  stripRef,
  onPrev,
  onNext,
  variant = "desktop",
}) => {
  const validMedia = (Array.isArray(media) ? media : []).filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  if (validMedia.length <= 1) return null;

  if (variant === "mobile") {
    return (
      <div className="flex gap-2 w-full overflow-x-auto touch-pan-x pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {validMedia.map((src, i) => (
          <ThumbnailItem
            key={`mobile-thumb-${i}`}
            src={src}
            isActive={activeIndex === i}
            onClick={() => onSelectIndex(i)}
            className="shrink-0 w-20 h-12 rounded-lg overflow-hidden border-[2px]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="relative w-full h-[45%] md:h-[40%] group">
      <div
        ref={stripRef}
        className="flex gap-2 md:gap-3 w-full h-full overflow-hidden touch-pan-x pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {validMedia.map((src, i) => (
          <ThumbnailItem
            key={`desktop-thumb-${i}`}
            src={src}
            isActive={activeIndex === i}
            onClick={() => onSelectIndex(i)}
            className="shrink-0 h-full aspect-[16/9] rounded-xl overflow-hidden border-[3px] transition-all shadow-inner"
          />
        ))}
      </div>
      {onPrev && (
        <button
          type="button"
          onClick={onPrev}
          className="absolute left-1 top-[calc(50%-0.25rem)] -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white transition-colors opacity-0 group-hover:opacity-100 shadow-md cursor-pointer"
          aria-label="Previous thumbnail"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          className="absolute right-1 top-[calc(50%-0.25rem)] -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white transition-colors opacity-0 group-hover:opacity-100 shadow-md cursor-pointer"
          aria-label="Next thumbnail"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

interface ThumbnailItemProps {
  src: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}

const ThumbnailItem: React.FC<ThumbnailItemProps> = ({
  src,
  isActive,
  onClick,
  className = "",
}) => {
  const safeSrc = src && typeof src === "string" && src.trim().length > 0 ? src : placeholderImg;
  const [loaded, setLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(safeSrc);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    setCurrentSrc(safeSrc);
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [safeSrc]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative cursor-pointer ${className} ${
        isActive
          ? "border-[var(--wb-primary)] opacity-100 scale-105"
          : "border-transparent opacity-60 hover:opacity-100 hover:scale-105"
      }`}
    >
      {!loaded && (
        <img
          src={placeholderImg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          draggable={false}
        />
      )}
      <img
        ref={imgRef}
        src={currentSrc}
        alt=""
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (currentSrc !== placeholderImg) {
            setCurrentSrc(placeholderImg);
            setLoaded(true);
          }
        }}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </button>
  );
};
