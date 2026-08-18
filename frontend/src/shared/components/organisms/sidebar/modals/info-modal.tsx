import React from "react";
import Shared from "@shared";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  return (
    <Shared.atoms.Modal
      isOpen={isOpen}
      onClose={onClose}

      widthClass="w-[90vw] sm:w-[500px]"
      heightClass="h-[90vh] sm:h-[400px]"
    >
      <div className="flex flex-col h-full items-center justify-center p-6 text-center">
        <h2 className="text-3xl font-bold text-[var(--wb-primary)] mb-4">
          Información
        </h2>
      </div>
    </Shared.atoms.Modal>
  );
};
