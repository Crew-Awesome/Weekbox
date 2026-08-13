import React from 'react';
import Shared from '@shared';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceElement: HTMLElement | null;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, sourceElement }) => {
  return (
    <Shared.atoms.Modal
      isOpen={isOpen}
      onClose={onClose}
      sourceElement={sourceElement}
      widthClass="w-[90vw] sm:w-[500px]"
      heightClass="h-[90vh] sm:h-[400px]"
    >
      <div className="flex flex-col h-full items-center justify-center p-6 text-center">
        <h2 className="text-3xl font-bold text-[var(--wb-primary)] mb-4">Información</h2>
        <p className="text-[var(--wb-text-muted)] text-base leading-relaxed">
          Weekbox v0.0.0. Este modal ha sido construido utilizando arquitectura atómica pura y animaciones direccionales basadas en FLIP y GSAP.
        </p>
      </div>
    </Shared.atoms.Modal>
  );
};
