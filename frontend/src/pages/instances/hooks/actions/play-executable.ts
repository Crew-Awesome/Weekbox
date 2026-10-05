import Core from "@core";
import Utils from "@utils";
import { useProcessStore } from "../../../../store";

export interface PlayExecutableParams {
  selectedMod: any;
  isStorageMigrating: boolean;
}

/**
 * Handles launching standalone executable mods on desktop platforms.
 */
export async function playExecutable({
  selectedMod,
  isStorageMigrating,
}: PlayExecutableParams): Promise<void> {
  if (!selectedMod) return;

  if (isStorageMigrating) {
    Utils.toast.warning(
      "Cannot launch game while storage migration is in progress. Please wait for the migration to complete.",
      { title: "Storage Relocation in Progress" }
    );
    return;
  }

  try {
    const modsDir = (await Core.platform.getModsPath?.()) || "";
    const safeName = (selectedMod.name || selectedMod.title || "unknown")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();

    const folderPath = `${modsDir}/mod_${selectedMod.id}_${safeName}`;
    const instanceKey = `mod:${selectedMod.id}`;

    await useProcessStore.getState().launchInstance(instanceKey, folderPath);
  } catch (err: any) {
    Utils.toast.error(err?.message || "Could not launch executable mod.", {
      title: "Launch Error",
    });
  }
}
