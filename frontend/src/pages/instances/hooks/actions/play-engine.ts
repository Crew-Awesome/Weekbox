import Core, { CapacitorAppLauncher } from "@core";
import Utils from "@utils";
import { useProcessStore } from "../../../../store";

export interface PlayEngineParams {
  currentRelease: any;
  selectedCategory: string;
  isBaseGameMobile: boolean;
  currentInstanceKey: string;
  isStorageMigrating: boolean;
}

/**
 * Handles launching an engine instance:
 * - On mobile (Capacitor), launches base game or redirects to Play Store.
 * - On desktop, locates engine binary directory, aggregates installed mods
 *   matching the target engine version, and launches the process.
 */
export async function playEngine({
  currentRelease,
  selectedCategory,
  isBaseGameMobile,
  currentInstanceKey,
  isStorageMigrating,
}: PlayEngineParams): Promise<void> {
  if (!currentRelease) return;

  if (isBaseGameMobile) {
    const instanceKey = currentInstanceKey || `engine:vslice:${currentRelease.version}`;
    const launched = await useProcessStore.getState().launchInstance(instanceKey, "vslice");
    if (!launched) {
      const isInstalled = await CapacitorAppLauncher.isBaseGameInstalled();
      if (!isInstalled) {
        Utils.toast.warning("Base Game is not installed or could not be opened. Redirecting to Play Store...", {
          title: "Base Game",
        });
        await CapacitorAppLauncher.openBaseGameStore();
      }
    }
    return;
  }

  try {
    const enginesDir = (await Core.platform.getEnginesPath?.()) || "";
    const safeEngineId = (selectedCategory || "vslice")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();

    const safeVersion = (currentRelease.version || "latest")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    /* Guard against actions during storage migration */
    if (isStorageMigrating) {
      Utils.toast.warning(
        "Cannot launch game while storage migration is in progress. Please wait for the migration to complete.",
        { title: "Storage Relocation in Progress" }
      );
      return;
    }

    const folderPath = `${enginesDir}/${safeEngineId}/${safeVersion}`;
    const instanceKey = `engine:${selectedCategory}:${currentRelease.version}`;

    /* Find all installed mods matching this engine and version (including Any version) */
    const installedModsList = (await Core.platform.getInstalledMods?.()) || [];
    const modsDir = (await Core.platform.getModsPath?.()) || "";
    const currentCategory = (selectedCategory || "").toLowerCase().trim();
    const currentReleaseVer = (currentRelease.version || "").toLowerCase().trim();
    const cleanCurrentReleaseVer = currentReleaseVer.replace(/^v/, "");

    const matchingModPaths: string[] = [];

    for (const mod of installedModsList) {
      if (!mod) continue;

      const modEngId = String(mod.engineId || "").toLowerCase().trim();
      const modEngName = String(mod.engineName || "").toLowerCase().trim();

      /* Exclude standalone executable mods */
      if (
        modEngId === "executable" ||
        modEngId === "3827" ||
        modEngName.includes("executable")
      ) {
        continue;
      }

      /* Check if mod engine matches current engine category */
      const isEngineMatch =
        modEngId === currentCategory ||
        modEngName.includes(currentCategory) ||
        (currentCategory === "vslice" &&
          (modEngId === "29202" ||
            modEngName.includes("v-slice") ||
            modEngName.includes("base game"))) ||
        (currentCategory === "psych" &&
          (modEngId === "28367" || modEngName.includes("psych"))) ||
        (currentCategory === "codename" &&
          (modEngId === "34764" || modEngName.includes("codename"))) ||
        (currentCategory === "pslice" &&
          (modEngId === "43798" || modEngName.includes("p-slice"))) ||
        (currentCategory === "fpsplus" &&
          (modEngId === "43850" || modEngName.includes("fps plus"))) ||
        (currentCategory === "psychonline" &&
          (modEngId === "43788" || modEngName.includes("psych online")));

      if (!isEngineMatch) continue;

      /* Check if engine version matches or is Any version */
      const modVer = String(mod.engineVersion || "").toLowerCase().trim();
      const cleanModVer = modVer.replace(/^v/, "");

      const isVersionMatch =
        !modVer ||
        modVer === "any version" ||
        modVer === "any" ||
        cleanModVer === cleanCurrentReleaseVer ||
        cleanModVer === "latest";

      if (!isVersionMatch) continue;

      /* Determine mod folder path */
      const safeName = (mod.name || mod.title || "unknown")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();

      const modPath = mod.installPath || `${modsDir}/mod_${mod.id}_${safeName}`;
      if (!matchingModPaths.includes(modPath)) {
        matchingModPaths.push(modPath);
      }
    }

    await useProcessStore.getState().launchInstance(instanceKey, folderPath, {
      modFolderPaths: matchingModPaths,
    });
  } catch (err: any) {
    Utils.toast.error(err?.message || "Could not launch engine.", {
      title: "Launch Error",
    });
  }
}
