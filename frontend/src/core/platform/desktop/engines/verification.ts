import type { DesktopTransport } from "../transport";
import { sanitizeEngineId, sanitizeVersion } from "./utils";

export interface StoragePathProvider {
  getEnginesPath: () => Promise<string>;
}

/**
 * Checks whether an engine version directory exists on disk.
 */
export async function isEngineInstalled(
  transport: DesktopTransport,
  storage: StoragePathProvider,
  engineId: string,
  version: string
): Promise<boolean> {
  const safeEngineId = sanitizeEngineId(engineId);
  const safeVersion = sanitizeVersion(version);

  const enginesDir = await storage.getEnginesPath();
  const targetFolder = `${enginesDir}/${safeEngineId}/${safeVersion}`;

  try {
    const stats = await transport.call("fs.getStats" as any, { path: targetFolder });
    if (stats && (stats as any).isDirectory) return true;
  } catch {}

  const altVersion = safeVersion.startsWith("v") ? safeVersion.slice(1) : `v${safeVersion}`;
  const altFolder = `${enginesDir}/${safeEngineId}/${altVersion}`;
  try {
    const stats = await transport.call("fs.getStats" as any, { path: altFolder });
    return Boolean(stats && (stats as any).isDirectory);
  } catch {
    return false;
  }
}
