import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  overlayClassName?: string;
  modalClassName?: string;
  widthClass?: string;
  heightClass?: string;
  svgBackgrounds?: React.ReactNode;

}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  children, 
  overlayClassName = "bg-black/40 backdrop-blur-md",
  modalClassName = "",
  widthClass = "w-[90vw] sm:w-[80vw] md:w-[60vw]", 
  heightClass = "h-[90vh] sm:h-[80vh] md:h-[70vh]",
  svgBackgrounds
}) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

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

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'} ${overlayClassName}`}
      onClick={onClose}
    >
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md" 
      />

      <div 
        className={`relative flex flex-col ${widthClass} ${heightClass} ${modalClassName} transition-all duration-300 ease-out transform ${isVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-[0.97] translate-y-4 opacity-0'}`}
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
