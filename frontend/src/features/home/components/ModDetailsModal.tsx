import React from 'react';
import Shared from '@shared';
import type { ModItem } from '../types';

interface ModDetailsModalProps {
    selectedCard: ModItem | null;
    onClose: () => void;
}

export const ModDetailsModal: React.FC<ModDetailsModalProps> = ({ selectedCard, onClose }) => {
  return (
    <Shared.atoms.Modal 
      isOpen={!!selectedCard} 
      onClose={onClose}
      edgeSpacing={{ 
        isStaticSize: true, 
        mobile: ['90vw', '80vh'], 
        desktop: ['50vw', '60vh'] 
      }}
    >
      {selectedCard && (
        <div className="flex flex-col gap-4 text-[var(--wb-on-surface)]">
          {selectedCard.img && (
            <img 
              src={selectedCard.img} 
              alt={selectedCard.name} 
              className="w-full h-48 object-cover rounded-xl"
            />
          )}
          <h2 className="text-2xl font-bold mt-2">{selectedCard.name}</h2>
          <p className="text-[var(--wb-on-surface-variant)]">{selectedCard.description}</p>
          {selectedCard.showIcon !== false && selectedCard.icon && (
            <div className="flex items-center gap-2 mt-4 bg-[var(--wb-surface-container)] p-3 rounded-lg w-max">
              <img src={selectedCard.icon} alt="icon" className="w-8 h-8 object-contain" />
              <span className="text-sm">Icon Attached</span>
            </div>
          )}
        </div>
      )}
    </Shared.atoms.Modal>
  );
};
