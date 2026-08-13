import { useState, useEffect } from 'react';

export interface MorphModalData {
  id: string;
  element: HTMLElement | null;
}

/**
 * Hook for managing the local and global state of the application's modals.
 * 
 * @returns {Object} State and setters for global and morphing modals.
 */
export const useModals = () => {
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);
  const [morphModalData, setMorphModalData] = useState<MorphModalData | null>(null);

  /**
   * Listens for global events to open the generic modal.
   * Useful for triggering the modal from outside React (e.g., console).
   */
  useEffect(() => {
    const handleOpenModal = () => setIsGlobalModalOpen(true);
    window.addEventListener('open-modal', handleOpenModal);
    (window as any).openWeekboxModal = () => setIsGlobalModalOpen(true);
    
    return () => {
      window.removeEventListener('open-modal', handleOpenModal);
      delete (window as any).openWeekboxModal;
    };
  }, []);

  const openMorphModal = (id: string, element: HTMLElement | null) => {
    setMorphModalData({ id, element });
  };

  const closeMorphModal = () => {
    setMorphModalData(null);
  };

  const closeGlobalModal = () => setIsGlobalModalOpen(false);

  return {
    isGlobalModalOpen,
    closeGlobalModal,
    morphModalData,
    openMorphModal,
    closeMorphModal,
  };
};
