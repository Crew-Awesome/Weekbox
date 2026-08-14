import React from 'react';
import Shared from '@shared';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;

}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
  return (
    <Shared.atoms.Modal
      isOpen={isOpen}
      onClose={onClose}

      widthClass="w-[90vw] sm:w-[600px]"
      heightClass="h-[90vh] sm:h-[500px]"
    >
      <div className="flex flex-col h-full items-center justify-center p-6 text-center">
        <h2 className="text-3xl font-bold text-[var(--wb-primary)] mb-4">Configuración</h2>
      </div>
    </Shared.atoms.Modal>
  );
};
