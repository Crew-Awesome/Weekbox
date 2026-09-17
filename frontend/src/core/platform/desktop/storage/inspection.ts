import type { StorageInspectionResult } from "@contracts";
import type { DesktopTransport } from "../transport";

/**
 * Calculates total size and item counts for a storage directory.
 */
export async function inspectStorage(
  transport: DesktopTransport,
  folderPath: string
): Promise<StorageInspectionResult> {
  try {
    const res = await transport.call("storage.inspect" as any, { folderPath });
    return res as any;
  } catch {
    return { count: 0, totalBytes: 0, formattedSize: "0 B", estimatedTime: "< 1s", items: [] };
  }
}
