import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

/**
 * Defines spacing as a single string (all sides) or [horizontal, vertical] array.
 */
export type SpacingValue = string | [string, string];

/**
 * Configuration for the modal's separation from the screen edges.
 * Accepts any valid CSS unit (e.g., '16px', '2rem', '5%').
 */
export interface EdgeSpacingConfig {
  /**
   * If true, the modal will NOT stretch to fill the edges. Instead, the `mobile` and `desktop`
   * properties will define the EXACT [Width, Height] of the modal directly via inline styles.
   */
  isStaticSize?: boolean;
  /**
   * Separation on mobile screens (< 640px). Or exact [Width, Height] if isStaticSize is true.
   * @default "16px"
   */
  mobile?: SpacingValue;
  /**
   * Separation on desktop/tablet screens (>= 640px). Or exact [Width, Height] if isStaticSize is true.
   * @default "32px"
   */
  desktop?: SpacingValue;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  overlayClassName?: string;
  modalClassName?: string;
  /** Legacy width class, overridden if edgeSpacing is active */
  widthClass?: string;
  /** Legacy height class, overridden if edgeSpacing is active */
  heightClass?: string;
  svgBackgrounds?: React.ReactNode;
  /**
   * Defines how far the modal is separated from the screen edge.
   * If provided, the modal will automatically stretch to fill the remaining space.
   */
  edgeSpacing?: EdgeSpacingConfig;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  overlayClassName = "bg-black/40 backdrop-blur-md",
  modalClassName = "",
  widthClass = "w-[90vw] sm:w-[80vw] md:w-[60vw]",
  heightClass = "h-[90vh] sm:h-[80vh] md:h-[70vh]",
  svgBackgrounds,
  edgeSpacing,
}) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 640 : false,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsDesktop(window.innerWidth >= 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let rafId: number;

    if (isOpen) {
      setIsRendered(true);
      // Use double requestAnimationFrame to ensure the browser paints the initial state
      // with opacity-0 before changing to opacity-100 to trigger the CSS transition.
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      timeoutId = setTimeout(() => setIsRendered(false), 300);
    }

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
    };
  }, [isOpen]);

  if (!isRendered) return null;

  // Helper to parse SpacingValue to CSS padding string
  const parseSpacing = (spacing?: SpacingValue, fallback: string = "0px") => {
    if (!spacing) return fallback;
    if (Array.isArray(spacing)) {
      // spacing is [horizontal, vertical] => CSS padding: "vertical horizontal"
      return `${spacing[1]} ${spacing[0]}`;
    }
    return spacing;
  };

  // Determine active spacing/size configuration
  const currentConfig = edgeSpacing
    ? isDesktop
      ? edgeSpacing.desktop
      : edgeSpacing.mobile
    : undefined;
  const isStatic = edgeSpacing?.isStaticSize;

  let overlayPadding: string | undefined;
  let staticModalStyle: React.CSSProperties = {};

  if (currentConfig) {
    if (isStatic) {
      if (Array.isArray(currentConfig)) {
        staticModalStyle = {
          width: currentConfig[0],
          height: currentConfig[1],
        };
      } else {
        staticModalStyle = { width: currentConfig, height: currentConfig };
      }
    } else {
      overlayPadding = parseSpacing(currentConfig, isDesktop ? "32px" : "16px");
    }
  }

  // Determine active classes for the modal body
  let activeWidthClass = widthClass;
  let activeHeightClass = heightClass;

  if (edgeSpacing) {
    if (!isStatic) {
      // Dynamic Edge Spacing: expand to fill the padding limits
      activeWidthClass = "w-full max-w-full";
      activeHeightClass = "h-full max-h-full";
    } else {
      // Static Size: clear tailwind width/height classes so inline styles apply cleanly
      activeWidthClass = "";
      activeHeightClass = "";
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ease-out ${isVisible ? "opacity-100" : "opacity-0"} ${overlayClassName}`}
      onClick={onClose}
      style={overlayPadding ? { padding: overlayPadding } : undefined}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md z-[-1]" />

      <div
        className={`relative flex flex-col ${activeWidthClass} ${activeHeightClass} ${modalClassName} transition-all duration-300 ease-out transform ${isVisible ? "scale-100 translate-y-0 opacity-100" : "scale-[0.97] translate-y-4 opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
        style={staticModalStyle}
      >
        <div className="absolute inset-0 bg-[var(--wb-surface)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden z-0">
          {svgBackgrounds && (
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              {svgBackgrounds}
            </div>
          )}
        </div>

        <div className="relative flex flex-col z-10 text-[var(--wb-on-surface)] h-full">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-[var(--wb-icon-default)] hover:text-[var(--wb-icon-hover)] hover:bg-[var(--wb-surface-bright)] transition-colors z-[15]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8 flex-1 overflow-y-auto mobile-no-scrollbar">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
