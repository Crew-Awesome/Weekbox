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
    const res = await transport.call("storage.validateFolder" as any, { targetPath, type }, undefined, 8000);
    return res as any;
  } catch (e: any) {
    console.warn("[validateStorageFolder] Validation call failed, permitting folder as fallback:", e?.message);
    return { valid: true };
  }
}
