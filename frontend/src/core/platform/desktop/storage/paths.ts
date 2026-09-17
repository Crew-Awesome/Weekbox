import { getDesktopBasePath } from "../settings";
import type { ISettingsService } from "@contracts";

/**
 * Resolves standard default storage directories.
 */
export async function getDefaultPaths(): Promise<{
  basePath: string;
  defaultModsPath: string;
  defaultEnginesPath: string;
}> {
  const base = await getDesktopBasePath();
  return {
    basePath: base,
    defaultModsPath: `${base}/mods`,
    defaultEnginesPath: `${base}/engines`,
  };
}

/**
 * Resolves the configured mods directory path.
 */
export async function getModsPath(settings: ISettingsService): Promise<string> {
  const s = await settings.getSettings();
  if (s.modsPath && typeof s.modsPath === "string") {
    return s.modsPath.replace(/\\/g, "/");
  }
  const base = await getDesktopBasePath();
  return `${base}/mods`;
}

/**
 * Resolves the configured engines directory path.
 */
export async function getEnginesPath(settings: ISettingsService): Promise<string> {
  const s = await settings.getSettings();
  if (s.enginesPath && typeof s.enginesPath === "string") {
    return s.enginesPath.replace(/\\/g, "/");
  }
  const base = await getDesktopBasePath();
  return `${base}/engines`;
}
