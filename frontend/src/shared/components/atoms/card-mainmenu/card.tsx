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
  showIcon,
  onClick,
  clickableArea = "whole-card",
  children,
  className = "",
  extractColor = false,
  lazyLoad = false,
}) => {
  const thumbnailRef = useRef<HTMLDivElement>(null);
  const hoverBgRef = useRef<HTMLDivElement>(null);
  const notchOverlayRef = useRef<HTMLDivElement>(null);
  const notchSvg1Ref = useRef<SVGSVGElement>(null);
  const notchSvg2Ref = useRef<SVGSVGElement>(null);
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

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
      className={`relative isolate flex flex-col shadow-2xs bg-transparent p-0 sm:p-3 select-none ${
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
        <div
          className={`relative overflow-hidden w-full aspect-[16/9] isolate ${
            shouldRenderIcon
              ? "sm:rounded-tr-[1rem] sm:rounded-tl-none"
              : "sm:rounded-t-[1rem]"
          } ${isThumbnailClickable ? "cursor-pointer" : ""}`}
          onClick={
            isThumbnailClickable && !isWholeCardClickable ? onClick : undefined
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
              <img
                className="w-full h-full object-cover block"
                src={thumbnail}
                alt={title}
                loading="lazy"
                draggable={false}
                style={{
                  WebkitMaskImage:
                    "linear-gradient(to bottom, black 50%, transparent 100%)",
                  maskImage:
                    "linear-gradient(to bottom, black 50%, transparent 100%)",
                }}
              />
            </div>

            {/* Mask Container (Opaque with animated overlay) */}
            {shouldRenderIcon && (
              <div className="absolute left-0 top-0 w-[18%] aspect-square rounded-tl-none rounded-br-[8px] bg-[var(--wb-bg)] z-10 pointer-events-none">
                {/* Overlay that receives the hover color animation */}
                <div
                  ref={notchOverlayRef}
                  className="absolute inset-0 pointer-events-none opacity-0"
                />

                <div className="relative z-10 w-full h-full flex items-center justify-center p-2">
                  {icon && (
                    <img
                      className="object-contain w-full h-full block"
                      src={icon}
                      alt="icon"
                      loading="lazy"
                      draggable={false}
                    />
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

                {/* Hover SVGs to apply the hover color seamlessly */}
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
        </div>
      )}

      <div className="mt-4 px-0 sm:px-0 flex flex-col gap-1">
        {/* Title: Uses line-clamp-2 to allow up to 2 lines without a fixed height, letting the description slide up. */}
        <strong className="text-xl font-bold leading-snug line-clamp-2 select-text">
          {title}
        </strong>
        {/* Description: Sits directly under the title. */}
        {description && (
          <h5 className="text-[var(--wb-on-surface-variant)] text-sm truncate">
            {description}
          </h5>
        )}
      </div>

      {children && <div className="mt-2">{children}</div>}
    </div>
  );
};

export default Card;
