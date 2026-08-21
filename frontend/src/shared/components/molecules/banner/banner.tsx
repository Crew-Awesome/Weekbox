import React, { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import Shared from "@shared";

export interface BannerProps {
  /**
   * The background image/thumbnail URL (placed on the left, fading to right).
   */
  thumbnail: string;
  /**
   * Optional URL for the icon image. Displayed in the top-left corner.
   */
  icon?: string;
  /**
   * Function to execute when the banner is clicked.
   */
  onClick?: (e: React.MouseEvent) => void;
  /**
   * Additional CSS classes for the banner container.
   */
  className?: string;
  /**
   * If true, extracts the predominant color from the thumbnail image and uses it
   * as the card's background color on hover.
   */
  extractColor?: boolean;

  /** Title of the small pill/badge above the main title */
  pillTitle?: string;
  /** Main title of the banner */
  title: string;
  /** Author or creator name, displayed below the title */
  author?: string;
  /** Time text for the stats area (e.g. "4d") */
  timeText?: string;
  /** Number of likes for the stats area */
  likesCount?: string | number;
  /** Number of views for the stats area */
  viewsCount?: string | number;
  /** If true, renders the banner in a skeleton loading state */
  isLoading?: boolean;
  /** If true, displays a red NSFW pill */
  isNsfw?: boolean;
}

/**
 * @description Molecule: Banner.
 * Displays a wide, interactive promotional banner. Extracts predominant color from the thumbnail on hover.
 * @param {BannerProps} props - Component properties.
 */
export const Banner: React.FC<BannerProps> = ({
  thumbnail,
  icon,
  onClick,
  className = "",
  extractColor = true,
  pillTitle,
  title,
  author,
  timeText,
  likesCount,
  viewsCount,
  isLoading = false,
  isNsfw = false,
}) => {
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const hoverBgRef = useRef<HTMLDivElement>(null);
  const notchOverlayRef = useRef<HTMLDivElement>(null);
  const notchSvg1Ref = useRef<SVGSVGElement>(null);
  const notchSvg2Ref = useRef<SVGSVGElement>(null);
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [iconLoaded, setIconLoaded] = useState(false);

  useEffect(() => {
    if (extractColor && thumbnail) {
      Shared.utils
        .extractColor(thumbnail, 0.3)
        .then((color) => {
          setHoverColor(color);
        })
        .catch(console.error);
    }
  }, [extractColor, thumbnail]);

  useEffect(() => {
    if (hoverBgRef.current) {
      const paddingPixels = window.innerWidth >= 640 ? 12 : 0;
      gsap.set(hoverBgRef.current, {
        top: paddingPixels,
        left: paddingPixels,
        right: paddingPixels,
        bottom: paddingPixels,
        opacity: 0,
      });
    }
  }, []);

  const handleMouseEnter = () => {
    if (window.matchMedia("(hover: none)").matches) return;

    if (thumbnailRef.current && thumbnail) {
      gsap.to(thumbnailRef.current, {
        scale: 1.05,
        duration: 0.3,
        ease: "power2.out",
      });
    }
    const finalColor = hoverColor || "rgba(255, 255, 255, 0.1)";
    if (hoverBgRef.current) {
      gsap.to(hoverBgRef.current, {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 1,
        backgroundColor: finalColor,
        duration: 0.3,
        ease: "power2.inOut",
      });
    }
    if (notchOverlayRef.current) {
      gsap.to(notchOverlayRef.current, {
        opacity: 1,
        backgroundColor: finalColor,
        duration: 0.3,
        ease: "power2.inOut",
      });
    }
    if (notchSvg1Ref.current && notchSvg2Ref.current) {
      gsap.to([notchSvg1Ref.current, notchSvg2Ref.current], {
        opacity: 1,
        color: finalColor,
        duration: 0.3,
        ease: "power2.inOut",
      });
    }
  };

  const handleMouseLeave = () => {
    if (window.matchMedia("(hover: none)").matches) return;

    if (thumbnailRef.current && thumbnail) {
      gsap.to(thumbnailRef.current, {
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
      });
    }
    if (hoverBgRef.current) {
      const paddingPixels = window.innerWidth >= 640 ? 12 : 0;
      gsap.to(hoverBgRef.current, {
        top: paddingPixels,
        left: paddingPixels,
        right: paddingPixels,
        bottom: paddingPixels,
        opacity: 0,
        backgroundColor: "transparent",
        duration: 0.3,
        ease: "power2.inOut",
      });
    }
    if (notchOverlayRef.current) {
      gsap.to(notchOverlayRef.current, {
        opacity: 0,
        backgroundColor: "transparent",
        duration: 0.3,
        ease: "power2.inOut",
      });
    }
    if (notchSvg1Ref.current && notchSvg2Ref.current) {
      gsap.to([notchSvg1Ref.current, notchSvg2Ref.current], {
        opacity: 0,
        color: "transparent",
        duration: 0.3,
        ease: "power2.inOut",
      });
    }
  };

  const shouldRenderIcon = !!icon;

  return (
    <div
      className={`relative isolate flex shadow-2xs bg-transparent p-0 sm:p-3 select-none cursor-pointer w-full aspect-[2/1] sm:aspect-[21/9] lg:aspect-[21/8] xl:aspect-[3/1] sm:rounded-[1rem] sm:rounded-tl-none ${className}`}
      style={{ fontFamily: "Manrope, sans-serif", fontWeight: 500 }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Hover Background Layer */}
      <div
        ref={hoverBgRef}
        className="absolute pointer-events-none z-[-1] sm:rounded-[1rem]"
      />

      {/* Background Image Container with static mask */}
      <div
        className="absolute left-0 top-0 bottom-0 sm:left-3 sm:top-3 sm:bottom-3 w-[65%] sm:w-[calc(65%-12px)] overflow-hidden isolate pointer-events-none z-0 rounded-bl-[1rem] sm:rounded-bl-[1rem]"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, black 50%, transparent 100%)",
          maskImage: "linear-gradient(to right, black 50%, transparent 100%)",
        }}
      >
        <div ref={thumbnailRef} className="absolute inset-0">
          {(!thumbnailLoaded || isLoading) && (
            <div className="absolute inset-0 bg-[var(--wb-surface-variant)] animate-pulse" />
          )}
          {!isLoading && (
            <img
              className={`w-full h-full object-cover block transition-opacity duration-300 ${thumbnailLoaded ? "opacity-100" : "opacity-0"}`}
              src={thumbnail}
              alt="Banner background"
              draggable={false}
              onLoad={() => setThumbnailLoaded(true)}
            />
          )}
        </div>

        {/* Mask Container (Icon top-left notch) */}
        {shouldRenderIcon && (
          <div className="absolute left-0 top-0 w-16 sm:w-20 aspect-square rounded-br-[8px] bg-[var(--wb-bg)] z-10 pointer-events-none">
            <div
              ref={notchOverlayRef}
              className="absolute inset-0 pointer-events-none opacity-0 rounded-tl-none rounded-br-[8px]"
            />
            <div className="relative z-10 w-full h-full flex items-center justify-center p-2">
              {icon && (
                <>
                  {(!iconLoaded || isLoading) && (
                    <div className="absolute inset-2 rounded-full bg-[var(--wb-surface-variant)] animate-pulse" />
                  )}
                  {!isLoading && (
                    <img
                      className={`object-contain w-full h-full block transition-opacity duration-300 ${iconLoaded ? "opacity-100" : "opacity-0"}`}
                      src={icon}
                      alt="icon"
                      draggable={false}
                      onLoad={() => setIconLoaded(true)}
                    />
                  )}
                </>
              )}
            </div>
            {/* Notch SVGs */}
            <svg
              className="absolute top-0 left-full w-[8px] h-[8px] text-[var(--wb-bg)] pointer-events-none"
              viewBox="0 0 8 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M0 0 H8 A8 8 0 0 0 0 8 V0 Z" fill="currentColor" />
            </svg>
            <svg
              className="absolute top-full left-0 w-[8px] h-[8px] text-[var(--wb-bg)] pointer-events-none"
              viewBox="0 0 8 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M0 0 H8 A8 8 0 0 0 0 8 V0 Z" fill="currentColor" />
            </svg>
            {/* Hover Notch SVGs */}
            <svg
              ref={notchSvg1Ref}
              className="absolute top-0 left-full w-[8px] h-[8px] pointer-events-none opacity-0"
              viewBox="0 0 8 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M0 0 H8 A8 8 0 0 0 0 8 V0 Z" fill="currentColor" />
            </svg>
            <svg
              ref={notchSvg2Ref}
              className="absolute top-full left-0 w-[8px] h-[8px] pointer-events-none opacity-0"
              viewBox="0 0 8 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M0 0 H8 A8 8 0 0 0 0 8 V0 Z" fill="currentColor" />
            </svg>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="relative z-10 w-full flex justify-end pr-4 sm:pr-12 md:pr-24 h-full items-center">
        <div className="flex flex-col items-start gap-3">
          {isLoading ? (
            <>
              {pillTitle && <div className="h-5 w-24 bg-[var(--wb-surface-variant)] rounded-full animate-pulse" />}
              <div className="h-10 w-48 sm:w-64 bg-[var(--wb-surface-variant)] rounded animate-pulse" />
              {author && <div className="h-5 w-32 bg-[var(--wb-surface-variant)] rounded animate-pulse mb-2" />}
              {(timeText || likesCount !== undefined || viewsCount !== undefined) && (
                <div className="h-8 w-40 bg-[var(--wb-surface-variant)] rounded-full animate-pulse" />
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {pillTitle && (
                  <div className="px-3 py-1 text-[10px] sm:text-xs font-bold tracking-wider text-white border border-white/20 rounded-full w-max uppercase bg-black/20">
                    {pillTitle}
                  </div>
                )}
                {isNsfw && (
                  <div className="px-3 py-1 text-[10px] sm:text-xs font-bold tracking-wider text-red-500 border border-red-500/50 rounded-full w-max uppercase bg-red-500/20">
                    NSFW
                  </div>
                )}
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight uppercase line-clamp-2 max-w-[400px]">
                {title}
              </h2>

              {author && (
                <p className="text-[var(--wb-on-surface-variant)] text-sm sm:text-base mb-2">
                  {author}
                </p>
              )}

              {/* Stats */}
              {(timeText ||
                likesCount !== undefined ||
                viewsCount !== undefined) && (
                <div className="flex items-center gap-4 text-sm text-[var(--wb-on-surface-variant)] bg-black/40 px-4 py-1.5 rounded-full">
                  {timeText && (
                    <div className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        ></path>
                      </svg>
                      <span>{timeText}</span>
                    </div>
                  )}
                  {likesCount !== undefined && (
                    <div className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
                      </svg>
                      <span>{likesCount}</span>
                    </div>
                  )}
                  {viewsCount !== undefined && (
                    <div className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        ></path>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z"
                        ></path>
                      </svg>
                      <span>{viewsCount}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Banner;
