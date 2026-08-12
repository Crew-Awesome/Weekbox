import React from 'react';
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
  overlayClassName = "bg-black/40 backdrop-blur-md", // Default liquid glass blur
  modalClassName = "",
  widthClass = "w-[90vw] sm:w-[80vw] md:w-[60vw]", 
  heightClass = "h-[90vh] sm:h-[80vh] md:h-[70vh]",
  svgBackgrounds
}) => {

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center ${overlayClassName}`}
      onClick={onClose}
    >
      <div 
        className={`relative bg-[var(--wb-surface)] text-[var(--wb-on-surface)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden flex flex-col ${widthClass} ${heightClass} ${modalClassName}`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        {/* Capa inferior para inyectar SVGs o gráficos decorativos libremente */}
        {svgBackgrounds && (
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {svgBackgrounds}
          </div>
        )}

        {/* Capa de contenido normal */}
        <div className="absolute inset-0 flex flex-col z-10">
          {/* Botón de cierre superior derecho */}
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
