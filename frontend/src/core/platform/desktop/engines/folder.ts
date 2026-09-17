import type { DesktopTransport } from "../transport";
import { sanitizeEngineId, sanitizeVersion } from "./utils";
import type { StoragePathProvider } from "./verification";

/**
 * Opens a local filesystem path in the OS default file manager.
 */
export async function openPathInExplorer(transport: DesktopTransport, targetPath: string): Promise<void> {
  try {
    const neutralino = typeof window !== "undefined" ? (window as any).Neutralino : undefined;
    if (neutralino?.os?.open) {
      await neutralino.os.open(targetPath);
      return;
    }
  } catch {}

  try {
    await transport.call("os.open" as any, { path: targetPath });
  } catch {}
}

/**
 * Opens the engine folder on the local machine.
 */
export async function openEngineFolder(
  transport: DesktopTransport,
  storage: StoragePathProvider,
  engineId: string,
  version: string
): Promise<void> {
  const safeEngineId = sanitizeEngineId(engineId);
  const safeVersion = sanitizeVersion(version);

  const enginesDir = await storage.getEnginesPath();
  const targetFolder = `${enginesDir}/${safeEngineId}/${safeVersion}`;
  const altVersion = safeVersion.startsWith("v") ? safeVersion.slice(1) : `v${safeVersion}`;
  const altFolder = `${enginesDir}/${safeEngineId}/${altVersion}`;
  const fallbackEngineFolder = `${enginesDir}/${safeEngineId}`;

  const tryOpen = async (folder: string) => {
    try {
      const stats = await transport.call("fs.getStats" as any, { path: folder });
      if (stats && (stats as any).isDirectory) {
        await openPathInExplorer(transport, folder);
        return true;
      }
    } catch {}
    return false;
  };

  if (await tryOpen(targetFolder)) return;
  if (await tryOpen(altFolder)) return;
  if (await tryOpen(fallbackEngineFolder)) return;

  await openPathInExplorer(transport, enginesDir);
}
