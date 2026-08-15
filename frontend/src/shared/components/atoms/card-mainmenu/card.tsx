import React, { useRef } from "react";
import gsap from "gsap";

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
}) => {
  const thumbnailRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (thumbnailRef.current && thumbnail) {
      gsap.to(thumbnailRef.current, {
        scale: 1.05,
        duration: 0.3,
        ease: "power2.out",
      });
    }
  };

  const handleMouseLeave = () => {
    if (thumbnailRef.current && thumbnail) {
      gsap.to(thumbnailRef.current, {
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
      });
    }
  };

  const isWholeCardClickable = clickableArea === "whole-card";
  const isThumbnailClickable = clickableArea === "thumbnail";

  // Define if the mask and icon container should be rendered
  const shouldRenderIcon = showIcon ?? !!icon;

  return (
    <div
      className={`relative flex flex-col shadow-2xs bg-transparent rounded-none p-0 sm:p-3 select-none ${
        shouldRenderIcon ? "sm:rounded-r-[1rem] sm:rounded-l-none" : "sm:rounded-[1rem]"
      } ${isWholeCardClickable ? "cursor-pointer" : ""} h-full ${className}`}
      style={{ fontFamily: "Manrope, sans-serif", fontWeight: 500 }}
      onClick={isWholeCardClickable ? onClick : undefined}
      onMouseEnter={isWholeCardClickable ? handleMouseEnter : undefined}
      onMouseLeave={isWholeCardClickable ? handleMouseLeave : undefined}
    >
      {thumbnail && (
        <div
          className={`relative overflow-hidden w-full aspect-[16/9] ${
            shouldRenderIcon ? "sm:rounded-tr-[1rem] sm:rounded-tl-none" : "sm:rounded-t-[1rem]"
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
          <div
            className="absolute inset-0"
            style={{
              WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
              maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
            }}
          >
            <div
              ref={thumbnailRef}
              className={`absolute inset-0 ${
                shouldRenderIcon ? "sm:rounded-tr-[1rem] sm:rounded-tl-none" : "sm:rounded-t-[1rem]"
              }`}
            >
              <img
                className="w-full h-full object-cover block"
                src={thumbnail}
                alt={title}
                draggable={false}
              />
            </div>
          </div>

          {/* Mask Container */}
          {shouldRenderIcon && (
            <div className="absolute left-0 top-0 w-[18%] aspect-square rounded-tl-none rounded-br-[8px] bg-[var(--wb-bg)] z-10 pointer-events-none">
              <div className="relative z-10 w-full h-full flex items-center justify-center p-2">
                {icon && (
                  <img
                    className="object-contain w-full h-full block"
                    src={icon}
                    alt="icon"
                    draggable={false}
                  />
                )}
              </div>
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
            </div>
          )}
        </div>
      )}

      <div className="mt-4 px-0 sm:px-0 flex flex-col gap-1 h-20 shrink-0">
        {/* Title: Uses line-clamp-2 to allow up to 2 lines without a fixed height, letting the description slide up. */}
        <strong 
          className="text-xl font-bold leading-snug line-clamp-2 select-text"
        >
          {title}
        </strong>
        {/* Description: Sits directly under the title. */}
        {description && (
          <h5 className="text-[var(--wb-on-surface-variant)] text-sm truncate">
            {description}
          </h5>
        )}
      </div>

      {children && (
        <div className="mt-2">
          {children}
        </div>
      )}
    </div>
  );
};

export default Card;
