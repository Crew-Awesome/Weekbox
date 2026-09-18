import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";
import type { ModalProps, SpacingValue } from "./types";
import { useModalBackHandler } from "./use-modal-back-handler";
import { useModalAnimation } from "./use-modal-animation";
import { ModalBackdrop } from "./modal-backdrop";

export * from "./types";

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
  zIndex = 100,
  hideCloseButton = false,
  hideCloseButtonMobile = false,
  onBack,
}) => {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 640 : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsDesktop(window.innerWidth >= 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { isRendered, isVisible, handleClose } = useModalAnimation(isOpen, onClose);
  useModalBackHandler(isOpen, handleClose, onBack);

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
      className={`fixed inset-0 flex items-center justify-center transition-opacity duration-150 ease-out ${
        isVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      onClick={handleClose}
      style={{
        zIndex,
        ...(overlayPadding ? { padding: overlayPadding } : {}),
      }}
    >
      <ModalBackdrop
        backdropImage={backdropImage}
        baseOverlayClass={baseOverlayClass}
        showCirclePattern={showCirclePattern}
      />

      <div
        className={`relative flex flex-col z-10 ${activeWidthClass} ${activeHeightClass} ${modalClassName} transition-[opacity,transform] duration-150 ease-out transform ${
          isVisible ? "scale-100 translate-y-0 opacity-100" : "scale-[0.97] translate-y-2 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
        style={staticModalStyle}
      >
        <div
          className={`absolute inset-0 ${
            !hideDefaultBackground
              ? "bg-[var(--wb-surface)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10"
              : ""
          } overflow-hidden z-0`}
        >
          {svgBackgrounds && (
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              {svgBackgrounds}
            </div>
          )}
        </div>

        <div className="relative flex flex-col z-10 text-[var(--wb-on-surface)] h-full overflow-hidden rounded-[inherit]">
          {!hideCloseButton && (
            <button
              onClick={handleClose}
              className={`absolute top-4 right-4 p-2 rounded-full text-[var(--wb-icon-default)] hover:text-[var(--wb-icon-hover)] hover:bg-[var(--wb-surface-bright)] transition-colors z-[15] ${
                hideCloseButtonMobile ? "hidden md:flex" : ""
              }`}
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className={contentClassName}>{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
};
