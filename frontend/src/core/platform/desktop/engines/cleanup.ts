import type { DesktopTransport } from "../transport";
import { sanitizeEngineId, sanitizeVersion } from "./utils";
import type { StoragePathProvider } from "./verification";

/**
 * Cleans up temporary or partial files after a cancelled or failed engine download.
 */
export async function cleanupTempDownload(
  transport: DesktopTransport,
  storage: StoragePathProvider,
  engineId: string,
  version: string
): Promise<void> {
  try {
    const enginesDir = await storage.getEnginesPath();
    const safeEngineId = sanitizeEngineId(engineId);
    const safeVersion = sanitizeVersion(version);

    const targetFolder = `${enginesDir}/${safeEngineId}/${safeVersion}`;
    const tempArchive = `${enginesDir}/${safeEngineId}/temp_${safeVersion}.archive`;
    const tempZip = `${enginesDir}/_temp_engine_${safeEngineId}_${safeVersion}.zip`;

    await transport.call("fs.remove" as any, { path: tempArchive }).catch(() => {});
    await transport.call("fs.remove" as any, { path: tempZip }).catch(() => {});
    await transport.call("fs.remove" as any, { path: targetFolder }).catch(() => {});
  } catch (err) {
    console.warn("[DesktopEngines] Failed to cleanup temp download:", err);
  }
}
