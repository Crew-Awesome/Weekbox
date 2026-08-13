import React from 'react';
import Shared from '@shared';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceElement: HTMLElement | null;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, sourceElement }) => {
  return (
    <Shared.atoms.Modal
      isOpen={isOpen}
      onClose={onClose}
      sourceElement={sourceElement}
      widthClass="w-[90vw] sm:w-[600px]"
      heightClass="h-[90vh] sm:h-[500px]"
    >
      <div className="flex flex-col h-full items-center justify-center p-6 text-center">
        <h2 className="text-3xl font-bold text-[var(--wb-primary)] mb-4">Configuración</h2>
        <p className="text-[var(--wb-text-muted)] text-base leading-relaxed mb-6">
          Ajusta las preferencias de Weekbox a tu gusto. (Opciones próximamente).
        </p>
        <button 
          onClick={onClose}
          className="px-6 py-2 bg-[var(--wb-surface-bright)] hover:bg-[var(--wb-item-hover)] rounded-lg transition-colors text-[var(--wb-on-surface)]"
        >
          Guardar y Cerrar
        </button>
      </div>
    </Shared.atoms.Modal>
  );
};
