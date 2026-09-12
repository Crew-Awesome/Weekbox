import React from "react";
import Features from "@features";
import type { MorphModalData } from "src/utils/hooks/use-modals";

interface SidebarModalsProps {
  morphModalData: MorphModalData | null;
  closeMorphModal: () => void;
}

export const SidebarModals: React.FC<SidebarModalsProps> = ({
  morphModalData,
  closeMorphModal,
}) => {
  return (
    <>
      <Features.InfoModal
        isOpen={morphModalData?.id === "info"}
        onClose={closeMorphModal}
      />
      <Features.SettingsModal
        isOpen={morphModalData?.id === "settings"}
        onClose={closeMorphModal}
      />
    </>
  );
};

