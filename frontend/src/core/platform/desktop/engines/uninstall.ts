import type { DesktopTransport } from "../transport";
import { sanitizeEngineId, sanitizeVersion } from "./utils";
import { unregisterInstalledEngine } from "./registry";
import type { StoragePathProvider } from "./verification";

export interface MigrationStateProvider {
  isMigrationInProgress: () => boolean;
}

/**
 * Removes engine directories and deregisters the engine from metadata.
 */
export async function uninstallEngine(
  transport: DesktopTransport,
  storage: StoragePathProvider & MigrationStateProvider,
  engineId: string,
  version: string
): Promise<void> {
  if (storage.isMigrationInProgress()) {
    throw new Error("Cannot uninstall while storage migration is in progress. Please wait for the migration to complete.");
  }

  const safeEngineId = sanitizeEngineId(engineId);
  const safeVersion = sanitizeVersion(version);

  const enginesDir = await storage.getEnginesPath();
  const targetFolder = `${enginesDir}/${safeEngineId}/${safeVersion}`;
  const altVersion = safeVersion.startsWith("v") ? safeVersion.slice(1) : `v${safeVersion}`;
  const altFolder = `${enginesDir}/${safeEngineId}/${altVersion}`;

  try {
    await transport.call("fs.remove" as any, { path: targetFolder }).catch(() => {});
    await transport.call("fs.remove" as any, { path: altFolder }).catch(() => {});
  } catch {}

  await unregisterInstalledEngine(transport, safeEngineId, safeVersion);
}
