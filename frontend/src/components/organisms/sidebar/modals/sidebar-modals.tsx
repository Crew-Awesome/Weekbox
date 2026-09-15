import React from "react";
import { InfoModal } from "../../info-modal/info-modal";
import { SettingsModal } from "../../settings-modal/settings-modal";
import type { MorphModalData } from "@utils";

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
      <InfoModal
        isOpen={morphModalData?.id === "info"}
        onClose={closeMorphModal}
      />
      <SettingsModal
        isOpen={morphModalData?.id === "settings"}
        onClose={closeMorphModal}
      />
    </>
  );
};
