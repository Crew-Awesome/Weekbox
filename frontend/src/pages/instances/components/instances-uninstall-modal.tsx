import React from "react";
import { ConfirmationModal } from "@components";
import { useSettingsStore } from "../../../store";

interface InstancesUninstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  engineName?: string;
  version?: string;
}

export const InstancesUninstallModal: React.FC<InstancesUninstallModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  engineName,
  version,
}) => {
  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={async (dontAskAgain: boolean) => {
        if (dontAskAgain) {
          await useSettingsStore.getState().dismissWarning("delete-engine");
        }
        onClose();
        await onConfirm();
      }}
      title="Uninstall Engine Version"
      description={
        <span>
          Are you sure you want to uninstall{" "}
          <strong>
            {engineName} v{version}
          </strong>
          ? This engine version and all its local files will be permanently deleted from disk.
        </span>
      }
      cancelLabel="Nevermind!"
      confirmLabel="Uninstall"
      isDestructive={true}
      showDontAskAgain={true}
    />
  );
};
