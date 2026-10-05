import type { DesktopTransport } from "../transport";

/**
 * Opens native OS folder picker dialog with multi-tiered fallback.
 */
export async function showFolderDialog(
  transport?: DesktopTransport,
  title: string = "Select Folder",
  defaultPath?: string
): Promise<string | null> {
  const neutralino = typeof window !== "undefined" ? (window as any).Neutralino : undefined;
  const os = neutralino?.os;

  if (os?.showFolderDialog) {
    try {
      const options: Record<string, string> = {};
      if (
        defaultPath &&
        typeof defaultPath === "string" &&
        !defaultPath.includes("%") &&
        defaultPath.trim().length > 0
      ) {
        options.defaultPath = defaultPath;
      }
      const folder = await os.showFolderDialog(title, options);
      if (folder && typeof folder === "string" && folder.trim().length > 0) {
        return folder.replace(/\\/g, "/");
      }
    } catch {}
  }

  if (transport) {
    try {
      const cleanDefault = (defaultPath && !defaultPath.includes("%")) ? defaultPath : "";
      const folder = await transport.call("storage.showFolderDialog" as any, {
        title,
        defaultPath: cleanDefault,
      });
      if (folder && typeof folder === "string" && folder.trim().length > 0) {
        return folder.replace(/\\/g, "/");
      }
    } catch {}
  }

  return null;
}

