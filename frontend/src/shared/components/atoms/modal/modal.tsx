import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import { SoundEffects } from "../../../../utils/sound";

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
   * If true, removes the default solid background so custom SVG cutouts can be used.
   */
  hideDefaultBackground?: boolean;
  /**
   * Class name for the content wrapper. Defaults to 'p-8 flex-1 overflow-y-auto'.
   */
  contentClassName?: string;
  /**
   * Defines how far the modal is separated from the screen edge.
   * If provided, the modal will automatically stretch to fill the remaining space.
   */
  edgeSpacing?: EdgeSpacingConfig;
  /**
   * If true, renders a transparent circle pattern over the dark overlay without losing the backdrop blur.
   * @default false
   */
  showCirclePattern?: boolean;
  /**
   * Optional background image shown blurred behind the overlay and circle pattern.
   */
  backdropImage?: string;
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
  hideDefaultBackground = false,
  contentClassName = "p-8 flex-1 overflow-y-auto mobile-no-scrollbar",
  edgeSpacing,
  showCirclePattern = false,
  backdropImage,
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

  const handleClose = React.useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setIsVisible(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  const prevIsOpenRef = React.useRef(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let rafId: number;

    if (isOpen) {
      setIsRendered(true);
      rafId = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      if (!prevIsOpenRef.current) {
        SoundEffects.playModalOpen();
      }
    } else {
      setIsVisible(false);
      if (prevIsOpenRef.current) {
        SoundEffects.playModalClose();
      }
      timeoutId = setTimeout(() => setIsRendered(false), 150);
    }

    prevIsOpenRef.current = isOpen;

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (prevIsOpenRef.current) {
        SoundEffects.playModalClose();
      }
    };
  }, []);

  if (!isRendered) return null;

  const parseSpacing = (spacing?: SpacingValue, fallback: string = "0px") => {
    if (!spacing) return fallback;
    if (Array.isArray(spacing)) {
      return `${spacing[1]} ${spacing[0]}`;
    }
    return spacing;
  };

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

  let activeWidthClass = widthClass;
  let activeHeightClass = heightClass;

  if (edgeSpacing) {
    if (!isStatic) {
      activeWidthClass = "w-full max-w-full";
      activeHeightClass = "h-full max-h-full";
    } else {
      activeWidthClass = "";
      activeHeightClass = "";
    }
  }

  const isDefaultOverlay = overlayClassName === "bg-black/40 backdrop-blur-md";
  const baseOverlayClass = isDefaultOverlay ? "backdrop-blur-md" : overlayClassName;

  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-150 ease-out ${isVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      onClick={handleClose}
      style={overlayPadding ? { padding: overlayPadding } : undefined}
    >
      {backdropImage && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <img
            src={backdropImage}
            alt=""
            className="w-full h-full object-cover filter blur-xl scale-105 opacity-100 select-none pointer-events-none"
            aria-hidden="true"
          />
        </div>
      )}

      <div
        className={`absolute inset-0 z-0 pointer-events-none transition-colors ${
          backdropImage ? "bg-black/30 backdrop-blur-md" : baseOverlayClass
        }`}
        aria-hidden="true"
      />

      {showCirclePattern && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `radial-gradient(circle, transparent 1.5px, rgba(0, 0, 0, 0.3) 1.5px)`,
            backgroundSize: "6px 6px",
          }}
          aria-hidden="true"
        />
      )}
      <div
        className={`relative flex flex-col z-10 ${activeWidthClass} ${activeHeightClass} ${modalClassName} transition-[opacity,transform] duration-150 ease-out transform ${isVisible ? "scale-100 translate-y-0 opacity-100" : "scale-[0.97] translate-y-2 opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
        style={staticModalStyle}
      >
        <div className={`absolute inset-0 ${!hideDefaultBackground ? "bg-[var(--wb-surface)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10" : ""} overflow-hidden z-0`}>
          {svgBackgrounds && (
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              {svgBackgrounds}
            </div>
          )}
        </div>

        <div className="relative flex flex-col z-10 text-[var(--wb-on-surface)] h-full overflow-hidden">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full text-[var(--wb-icon-default)] hover:text-[var(--wb-icon-hover)] hover:bg-[var(--wb-surface-bright)] transition-colors z-[15]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className={contentClassName}>
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
