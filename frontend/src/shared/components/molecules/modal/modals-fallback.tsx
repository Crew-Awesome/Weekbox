import React from 'react';
import { Modal } from './modal';
import Utils from '@utils';

export const ModalsFallback: React.FC = () => {
  const { 
    isGlobalModalOpen, closeGlobalModal, 
    morphModalData, closeMorphModal 
  } = Utils.hooks.useModals();

  return (
    <>
      {/* Fallback simple modal for Sidebar actions (Info, Settings) */}
      <Modal
        isOpen={morphModalData !== null}
        onClose={closeMorphModal}
      >
        <div className="flex flex-col h-full items-center justify-center">
          <h2 className="text-3xl font-bold text-[var(--wb-primary)] mb-4">
            {morphModalData?.id === 'info' ? 'Información' : 'Configuración'}
          </h2>
          <p className="text-[var(--wb-text-muted)] text-center">
            Este modal reemplaza a la animación compleja anterior.
          </p>
        </div>
      </Modal>

      {/* Global Modal for testing from terminal */}
      <Modal isOpen={isGlobalModalOpen} onClose={closeGlobalModal}>
        <div className="flex flex-col gap-4 mt-2">
          <h2 className="text-2xl font-bold text-[var(--wb-primary)]">¡Hola desde la Terminal!</h2>
          <p className="text-[var(--wb-text-muted)] leading-relaxed">
            Esta es la ventana modal por defecto invocada vía consola. Puedes reemplazar este contenido fácilmente pasando <code className="bg-black/30 px-1 py-0.5 rounded text-[var(--wb-secondary)]">children</code> al componente <code className="bg-black/30 px-1 py-0.5 rounded text-[var(--wb-secondary)]">Shared.molecules.Modal</code>.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-[var(--wb-surface-container-high)] border border-white/5">
            <p className="text-sm">El glassmorphism de fondo está aplicado usando <code className="text-[var(--wb-primary-container)]">backdrop-blur-md</code> y un color oscuro con opacidad.</p>
          </div>
        </div>
      </Modal>
    </>
  );
};
