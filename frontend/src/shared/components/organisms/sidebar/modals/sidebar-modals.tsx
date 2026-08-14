import React from 'react';
import { InfoModal } from './info-modal';
import { ConfigModal } from './config-modal';
import type { MorphModalData } from 'src/utils/hooks/use-modals';

interface SidebarModalsProps {
  morphModalData: MorphModalData | null;
  closeMorphModal: () => void;
}

export const SidebarModals: React.FC<SidebarModalsProps> = ({ morphModalData, closeMorphModal }) => {
  return (
    <>
      <InfoModal 
        isOpen={morphModalData?.id === 'info'} 
        onClose={closeMorphModal}

      />
      <ConfigModal 
        isOpen={morphModalData?.id === 'settings'} 
        onClose={closeMorphModal}

      />
    </>
  );
};
