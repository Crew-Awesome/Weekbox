import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Configuration for the modal's separation from the screen edges.
 * Accepts any valid CSS unit (e.g., '16px', '2rem', '5%').
 */
export interface EdgeSpacingConfig {
  /** 
   * Separation on mobile screens (< 640px). 
   * @default "16px"
   */
  mobile?: string;
  /** 
   * Separation on desktop/tablet screens (>= 640px). 
   * @default "32px"
   */
  desktop?: string;
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
  edgeSpacing
}) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 640 : false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setIsDesktop(window.innerWidth >= 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  // Determine current spacing value
  const currentSpacing = edgeSpacing ? (isDesktop ? (edgeSpacing.desktop || '32px') : (edgeSpacing.mobile || '16px')) : undefined;
  
  // If edge spacing is enabled, the modal expands to 100% of the available space inside the padding.
  // Otherwise, it falls back to the legacy widthClass/heightClass.
  const activeWidthClass = edgeSpacing ? "w-full max-w-full" : widthClass;
  const activeHeightClass = edgeSpacing ? "h-full max-h-full" : heightClass;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'} ${overlayClassName}`}
      onClick={onClose}
      style={currentSpacing ? { padding: currentSpacing } : undefined}
    >
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md z-[-1]" 
      />

      <div 
        className={`relative flex flex-col ${activeWidthClass} ${activeHeightClass} ${modalClassName} transition-all duration-300 ease-out transform ${isVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-[0.97] translate-y-4 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="absolute inset-0 bg-[var(--wb-surface)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden z-0"
        >
          {svgBackgrounds && (
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              {svgBackgrounds}
            </div>
          )}
        </div>

        <div 
          className="relative flex flex-col z-10 text-[var(--wb-on-surface)] h-full"
        >
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
