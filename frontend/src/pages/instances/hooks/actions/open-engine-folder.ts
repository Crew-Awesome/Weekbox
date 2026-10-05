import Core from "@core";
import Utils from "@utils";

/**
 * Opens the local directory containing the engine installation on desktop platforms.
 */
export async function openEngineFolder(
  selectedCategory: string,
  version?: string
): Promise<void> {
  if (!version || !Core.platform.openEngineFolder) return;
  try {
    await Core.platform.openEngineFolder(selectedCategory, version);
  } catch {
    Utils.toast.error("Could not open engine directory.", {
      title: "File Manager Error",
    });
  }
}
