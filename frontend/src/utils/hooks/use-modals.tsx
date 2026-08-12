import { useState, useEffect } from 'react';

export interface MorphModalData {
  id: string;
  element: HTMLElement;
}

/**
 * @description Hook especializado en gestionar el estado global y local
 * de todos los modales de la aplicación (Global, Morphing, etc.)
 */
export const useModals = () => {
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);
  const [morphModalData, setMorphModalData] = useState<MorphModalData | null>(null);

  // Escucha de eventos globales para abrir el modal genérico (útil desde consola)
  useEffect(() => {
    const handleOpenModal = () => setIsGlobalModalOpen(true);
    window.addEventListener('open-modal', handleOpenModal);
    (window as any).openWeekboxModal = () => setIsGlobalModalOpen(true);
    
    return () => {
      window.removeEventListener('open-modal', handleOpenModal);
      delete (window as any).openWeekboxModal;
    };
  }, []);

  const openMorphModal = (id: string, element: HTMLElement) => {
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
