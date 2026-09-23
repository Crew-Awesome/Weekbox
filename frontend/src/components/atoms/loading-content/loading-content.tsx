import React from "react";

export interface LoadingContentProps {
  /**
   * The text or entity being loaded.
   * If provided as "mods", formats as "Loading mods..."
   * If provided as "Loading mods...", keeps it as is.
   */
  text?: string;
  /**
   * Optional direct custom label overriding the text prop.
   */
  label?: string;
  /**
   * Size variant:
   * - "sm": for sidebars, cards, and infinite scroll (w-16 image, text-xs)
   * - "md": for panels, viewer tabs, and changelogs (w-28 image, text-sm/base)
   * - "lg": for full page initial loading (w-44 sm:w-56 image, text-base/lg)
   */
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingContent: React.FC<LoadingContentProps> = ({
  text = "content",
  label,
  size = "md",
  className = "",
}) => {
  const formattedText = (() => {
    if (label) return label;
    const trimmed = text.trim();
    if (!trimmed) return "Loading content...";
    if (trimmed.toLowerCase().startsWith("loading")) {
      return trimmed.endsWith("...") ? trimmed : `${trimmed}...`;
    }
    return `Loading ${trimmed}...`;
  })();

  const sizeClasses = {
    sm: {
      img: "w-16 h-16",
      text: "text-xs mt-1.5",
      container: "py-6",
    },
    md: {
      img: "w-28 h-28 sm:w-36 sm:h-36",
      text: "text-sm sm:text-base mt-2.5",
      container: "py-12 sm:py-16",
    },
    lg: {
      img: "w-44 h-44 sm:w-56 sm:h-56",
      text: "text-base sm:text-lg mt-3.5",
      container: "py-20 sm:py-32",
    },
  }[size];

  return (
    <div
      className={`flex flex-col items-center justify-center w-full text-center select-none animate-in fade-in duration-300 ${sizeClasses.container} ${className}`}
    >
      <img
        src="/assets/images/loading-content.webp"
        alt={formattedText}
        className={`${sizeClasses.img} object-contain animate-pulse drop-shadow-md`}
      />
      <span
        className={`font-bold text-[var(--wb-on-surface)] tracking-wide opacity-80 ${sizeClasses.text}`}
      >
        {formattedText}
      </span>
    </div>
  );
};

export default LoadingContent;
