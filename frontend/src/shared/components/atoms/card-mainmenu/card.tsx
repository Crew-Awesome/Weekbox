import React, { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import Shared from "@shared";

/**
 * Configuration properties for the Card component.
 */
export interface CardProps {
  /**
   * The main title of the card.
   */
  title: string;
  /**
   * Optional subtitle or description.
   */
  description?: string;
  /**
   * Optional URL for the background image thumbnail.
   */
  thumbnail?: string;
  /**
   * Optional URL for the icon image. Displayed in the top-left corner.
   */
  icon?: string;
  /**
   * Optional tooltip text for the icon.
   */
  iconTooltip?: string;
  /**
   * Explicitly controls whether the icon and its transparent mask are shown. Defaults to true if an icon is provided.
   */
  showIcon?: boolean;
  /**
   * Function to execute when the specified clickable area is interacted with.
   */
  onClick?: (e: React.MouseEvent) => void;
  /**
   * Determines which part of the card is interactive.
   * - 'whole-card': The entire card triggers onClick and hover effects.
   * - 'thumbnail': Only the image triggers onClick and hover effects.
   * - 'none': No default interaction.
   */
  clickableArea?: "whole-card" | "thumbnail" | "none";
  /**
   * Optional custom elements to render at the bottom of the card.
   */
  children?: React.ReactNode;
  /**
   * Optional CSS classes to apply to the root element.
   */
  className?: string;
  /**
   * If true, extracts the predominant color from the thumbnail image and uses it
   * as the card's background color on hover (with 0.8 opacity).
   */
  extractColor?: boolean;
  /**
   * If true, delays color extraction until the card is near the viewport (IntersectionObserver).
   * Useful for infinite scrolling lists. Defaults to false for static cards.
   */
  lazyLoad?: boolean;
  /**
   * If true, renders the card in a skeleton loading state.
   */
  isLoading?: boolean;
  /**
   * If true, displays a red NSFW pill next to the title.
   */
  isNsfw?: boolean;
}

/**
 * A highly customizable card component for displaying items like mods, engines, or library entries.
 * Includes optional GSAP animations, customizable click areas, and dynamic image masks.
 */
export const Card: React.FC<CardProps> = ({
  title,
  description,
  thumbnail,
  icon,
  iconTooltip,
  showIcon,
  onClick,
  clickableArea = "whole-card",
  children,
  className = "",
  extractColor = false,
  lazyLoad = false,
  isLoading = false,
  isNsfw = false,
}) => {
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const hoverBgRef = useRef<HTMLDivElement>(null);
  const notchOverlayRef = useRef<HTMLDivElement>(null);
  const notchSvg1Ref = useRef<SVGSVGElement>(null);
  const notchSvg2Ref = useRef<SVGSVGElement>(null);
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [iconLoaded, setIconLoaded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const [isInView, setIsInView] = useState(!lazyLoad);
  const cardRootRef = useRef<HTMLDivElement>(null);

  // Lazy Load Observer (prevents color extraction if not in viewport)
  useEffect(() => {
    if (!lazyLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    if (cardRootRef.current) observer.observe(cardRootRef.current);
    return () => observer.disconnect();
  }, [lazyLoad]);

  useEffect(() => {
    let isMounted = true;
    if (isInView && extractColor && thumbnail) {
      Shared.utils
        .extractColor(thumbnail, 0.3)
        .then((color) => {
          if (isMounted) setHoverColor(color);
        })
        .catch(console.error);
    }
    return () => {
      isMounted = false;
    };
  }, [isInView, extractColor, thumbnail]);

  // Set initial inset state based on responsive padding
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

  // Update hover color dynamically if it arrives while already hovering
  useEffect(() => {
    if (isHovered && hoverColor) {
      if (hoverBgRef.current)
        gsap.to(hoverBgRef.current, {
          backgroundColor: hoverColor,
          duration: 0.3,
          ease: "power2.inOut",
        });
      if (notchOverlayRef.current)
        gsap.to(notchOverlayRef.current, {
          backgroundColor: hoverColor,
          duration: 0.3,
          ease: "power2.inOut",
        });
      if (notchSvg1Ref.current && notchSvg2Ref.current)
        gsap.to([notchSvg1Ref.current, notchSvg2Ref.current], {
          color: hoverColor,
          duration: 0.3,
          ease: "power2.inOut",
        });
    }
  }, [hoverColor, isHovered]);

  const handleMouseEnter = () => {
    // Disable hover effects on touch/mobile devices
    if (window.matchMedia("(hover: none)").matches) return;
    setIsHovered(true);

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
    // Synchronize the notch overlay to look like a transparent hole
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
    setIsHovered(false);

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

  const isWholeCardClickable = clickableArea === "whole-card";
  const isThumbnailClickable = clickableArea === "thumbnail";

  // Define if the mask and icon container should be rendered
  const shouldRenderIcon = showIcon ?? !!icon;

  return (
    <div
      ref={cardRootRef}
      className={`relative isolate flex flex-col shadow-2xs bg-transparent p-0 sm:p-3 select-none hover:z-50 ${
        shouldRenderIcon
          ? "sm:rounded-r-[1rem] sm:rounded-bl-[1rem] sm:rounded-tl-none"
          : "sm:rounded-[1rem]"
      } ${isWholeCardClickable ? "cursor-pointer" : ""} h-full ${className}`}
      style={{ fontFamily: "Manrope, sans-serif", fontWeight: 500 }}
      onClick={isWholeCardClickable ? onClick : undefined}
      onMouseEnter={isWholeCardClickable ? handleMouseEnter : undefined}
      onMouseLeave={isWholeCardClickable ? handleMouseLeave : undefined}
    >
      {/* Hover Background Layer */}
      <div
        ref={hoverBgRef}
        className="absolute pointer-events-none z-[-1] sm:rounded-[1rem]"
      />
      {thumbnail && (
        <div className="relative w-full">
          <div
            className={`relative overflow-hidden w-full aspect-[16/9] isolate ${
              shouldRenderIcon
                ? "sm:rounded-tr-[1rem] sm:rounded-tl-none"
                : "sm:rounded-t-[1rem]"
            } ${isThumbnailClickable ? "cursor-pointer" : ""}`}
            onClick={
              isThumbnailClickable && !isWholeCardClickable
                ? onClick
                : undefined
            }
            onMouseEnter={
              isThumbnailClickable && !isWholeCardClickable
                ? handleMouseEnter
                : undefined
            }
            onMouseLeave={
              isThumbnailClickable && !isWholeCardClickable
                ? handleMouseLeave
                : undefined
            }
          >
            {/* Base Image Layer */}
            <div className="absolute inset-0 isolate">
              <div
                ref={thumbnailRef}
                className={`absolute inset-0 ${
                  shouldRenderIcon
                    ? "sm:rounded-tr-[1rem] sm:rounded-tl-none"
                    : "sm:rounded-t-[1rem]"
                }`}
              >
                {(!thumbnailLoaded || isLoading) && (
                  <div className="absolute inset-0 bg-[var(--wb-surface-variant)] animate-pulse" />
                )}
                {!isLoading && (
                  <img
                    className={`w-full h-full object-cover block transition-opacity duration-300 ${thumbnailLoaded ? "opacity-100" : "opacity-0"}`}
                    src={thumbnail}
                    alt={title}
                    loading="lazy"
                    draggable={false}
                    onLoad={() => setThumbnailLoaded(true)}
                    style={{
                      WebkitMaskImage:
                        "linear-gradient(to bottom, black 50%, transparent 100%)",
                      maskImage:
                        "linear-gradient(to bottom, black 50%, transparent 100%)",
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Mask Container (Opaque with animated overlay) - MOVED OUTSIDE overflow-hidden */}
          {shouldRenderIcon && (
            <div className="absolute left-0 top-0 w-[18%] aspect-square rounded-tl-none rounded-br-[8px] bg-[var(--wb-bg)] z-10 pointer-events-auto">
              {/* Overlay that receives the hover color animation */}
              <div
                ref={notchOverlayRef}
                className="absolute inset-0 pointer-events-none opacity-0 rounded-tl-none rounded-br-[8px]"
              />

              <div
                className="relative z-[15] w-full h-full flex items-center justify-center p-2 pointer-events-auto cursor-pointer"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
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
                        loading="lazy"
                        draggable={false}
                        onLoad={() => setIconLoaded(true)}
                      />
                    )}
                    {/* Custom Tooltip */}
                    {iconTooltip && (
                      <div
                        className={`absolute left-1/2 top-full -translate-x-1/2 -mt-2 z-[100] pointer-events-none transition-opacity duration-200 flex flex-col items-center ${showTooltip ? "opacity-100" : "opacity-0"}`}
                      >
                        <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[10px] border-transparent border-b-[var(--wb-surface-container-highest)] -mb-[1px]" />
                        <div className="flex px-4 py-2 bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] text-sm font-bold rounded whitespace-nowrap shadow-xl">
                          {iconTooltip}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Base SVGs to hide the image underneath */}
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
      )}

      <div className="mt-4 px-0 sm:px-0 flex flex-col gap-1">
        {isLoading ? (
          <>
            <div className="h-6 bg-[var(--wb-surface-variant)] rounded w-3/4 animate-pulse"></div>
            {description !== undefined && (
              <div className="h-4 bg-[var(--wb-surface-variant)] rounded w-1/2 mt-1 animate-pulse"></div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <strong className="text-xl font-bold leading-snug line-clamp-2 select-text">
                {title}
              </strong>
              {isNsfw && (
                <span className="shrink-0 text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full font-bold tracking-wider mt-1">
                  NSFW
                </span>
              )}
            </div>
            {description && (
              <h5 className="text-[var(--wb-on-surface-variant)] text-sm truncate">
                {description}
              </h5>
            )}
          </>
        )}
      </div>

      {!isLoading && children && <div className="mt-2">{children}</div>}
    </div>
  );
};

export default Card;
