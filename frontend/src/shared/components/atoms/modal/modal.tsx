import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import Utils from '@utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  overlayClassName?: string;
  modalClassName?: string;
  widthClass?: string;
  heightClass?: string;
  svgBackgrounds?: React.ReactNode;
  sourceElement?: HTMLElement | null;
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
  sourceElement
}) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsExiting(false);
    } else if (isRendered) {
      setIsExiting(true);
    }
  }, [isOpen, isRendered]);

  const handleExited = useCallback(() => {
    setIsRendered(false);
    setIsExiting(false);
  }, []);

  const { bgRef, contentRef, overlayRef } = Utils.hooks.useFlip({
    isOpen: isRendered,
    isExiting,
    sourceElement: sourceElement || null,
    onExited: handleExited
  });

  if (!isRendered) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center ${overlayClassName}`}
      onClick={onClose}
    >
      <div 
        ref={overlayRef}
        className="absolute inset-0 bg-black/40 backdrop-blur-md opacity-0" 
      />

      <div 
        className={`relative flex flex-col ${widthClass} ${heightClass} ${modalClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          ref={bgRef}
          className="absolute inset-0 bg-[var(--wb-surface)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden z-0"
        >
          {svgBackgrounds && (
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              {svgBackgrounds}
            </div>
          )}
        </div>

        <div 
          ref={contentRef}
          className="absolute inset-0 flex flex-col z-10 text-[var(--wb-on-surface)]"
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
