/**
 * Opens native OS folder picker dialog.
 */
export async function showFolderDialog(title: string, defaultPath?: string): Promise<string | null> {
  const neutralino = typeof window !== "undefined" ? (window as any).Neutralino : undefined;
  const os = neutralino?.os;
  if (os?.showFolderDialog) {
    try {
      const folder = await os.showFolderDialog(title, {
        defaultPath: defaultPath || "",
      });
      return folder || null;
    } catch {
      return null;
    }
  }
  return null;
}
