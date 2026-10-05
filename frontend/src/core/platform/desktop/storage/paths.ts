import { getDesktopBasePath } from "../settings";
import type { ISettingsService } from "@contracts";
import type { DesktopTransport } from "../transport";

/**
 * Resolves standard default storage directories.
 */
export async function getDefaultPaths(transport?: DesktopTransport): Promise<{
  basePath: string;
  defaultModsPath: string;
  defaultEnginesPath: string;
}> {
  if (transport) {
    try {
      const res: any = await transport.call("storage.getDefaultPaths" as any);
      if (res?.basePath) {
        return {
          basePath: res.basePath,
          defaultModsPath: res.defaultModsPath,
          defaultEnginesPath: res.defaultEnginesPath,
        };
      }
    } catch {}
  }

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
export async function getModsPath(settings: ISettingsService, transport?: DesktopTransport): Promise<string> {
  const s = await settings.getSettings();
  if (s.modsPath && typeof s.modsPath === "string" && !s.modsPath.includes("%APPDATA%")) {
    return s.modsPath.replace(/\\/g, "/");
  }
  const def = await getDefaultPaths(transport);
  return def.defaultModsPath;
}

/**
 * Resolves the configured engines directory path.
 */
export async function getEnginesPath(settings: ISettingsService, transport?: DesktopTransport): Promise<string> {
  const s = await settings.getSettings();
  if (s.enginesPath && typeof s.enginesPath === "string" && !s.enginesPath.includes("%APPDATA%")) {
    return s.enginesPath.replace(/\\/g, "/");
  }
  const def = await getDefaultPaths(transport);
  return def.defaultEnginesPath;
}

