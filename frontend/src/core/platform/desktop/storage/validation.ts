import type { DesktopTransport } from "../transport";

/**
 * Validates whether a target directory is safe for mod or engine storage.
 */
export async function validateStorageFolder(
  transport: DesktopTransport,
  targetPath: string,
  type: "mods" | "engines"
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const res = await transport.call("storage.validateFolder" as any, { targetPath, type });
    return res as any;
  } catch (e: any) {
    return { valid: false, reason: e?.message || "Failed to validate destination folder." };
  }
}
