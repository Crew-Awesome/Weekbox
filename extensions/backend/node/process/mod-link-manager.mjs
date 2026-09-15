import fs from "fs";
import path from "path";

/**
 * Registry of active mod links:
 * Map<string, Array<string>> (instanceId -> array of created link paths)
 */
const activeLinks = new Map();

export const modLinkManager = {
  /**
   * Creates a directory junction (Windows) or directory symlink (macOS/Linux)
   * pointing to the mod folder inside the target engine's "mods/" directory.
   *
   * @param {object} params
   * @param {string} params.engineFolderPath - Engine root folder where game runs.
   * @param {string} params.modFolderPath - Mod source folder to link.
   * @param {string} params.instanceId - Instance/process key for lifecycle tracking.
   * @returns {{ ok: boolean, linkPath?: string, error?: string }}
   */
  createModLink({ engineFolderPath, modFolderPath, instanceId }) {
    if (!engineFolderPath || !modFolderPath) {
      return { ok: false, error: "Missing engineFolderPath or modFolderPath" };
    }

    try {
      if (!fs.existsSync(engineFolderPath)) {
        return { ok: false, error: `Engine folder does not exist: ${engineFolderPath}` };
      }
      if (!fs.existsSync(modFolderPath)) {
        return { ok: false, error: `Mod folder does not exist: ${modFolderPath}` };
      }

      /* 1. Ensure the engine's "mods" subfolder exists */
      const engineModsDir = path.join(engineFolderPath, "mods");
      if (!fs.existsSync(engineModsDir)) {
        fs.mkdirSync(engineModsDir, { recursive: true });
      }

      /* 2. Destination path inside engine's mods folder */
      const modFolderName = path.basename(modFolderPath);
      const linkPath = path.join(engineModsDir, modFolderName);

      /* 3. Safely remove any existing link/reparse point at target path */
      this.removeLinkPath(linkPath);

      /* 4. Create platform-appropriate shortcut/symlink */
      const isWin = process.platform === "win32";
      if (isWin) {
        /*
         * On Windows, "junction" links directories without requiring
         * elevated administrator privileges or Windows Developer Mode.
         */
        fs.symlinkSync(path.resolve(modFolderPath), path.resolve(linkPath), "junction");
      } else {
        /* Standard directory symlink on macOS and Linux */
        fs.symlinkSync(path.resolve(modFolderPath), path.resolve(linkPath), "dir");
      }

      /* 5. Register in tracking map */
      const key = instanceId || engineFolderPath;
      const currentList = activeLinks.get(key) || [];
      currentList.push(linkPath);
      activeLinks.set(key, currentList);

      return { ok: true, linkPath };
    } catch (err) {
      console.error("[ModLinkManager] Error creating mod link:", err);
      return { ok: false, error: err?.message || String(err) };
    }
  },

  /**
   * Safely deletes a link or directory junction without modifying the original mod files.
   * @param {string} linkPath - Path to remove.
   */
  removeLinkPath(linkPath) {
    try {
      const stat = fs.lstatSync(linkPath);
      if (stat.isSymbolicLink()) {
        fs.unlinkSync(linkPath);
      } else if (process.platform === "win32" && stat.isDirectory()) {
        /* On Windows, rmdirSync safely removes the junction pointer only */
        fs.rmdirSync(linkPath);
      }
    } catch {
      /* File might not exist or already removed; ignore safely */
    }
  },

  /**
   * Cleans up all mod links associated with an instance identifier.
   * @param {string} instanceId
   */
  cleanupModLinks(instanceId) {
    const list = activeLinks.get(instanceId);
    if (list && Array.isArray(list)) {
      for (const linkPath of list) {
        this.removeLinkPath(linkPath);
      }
      activeLinks.delete(instanceId);
    }
  },

  /**
   * Cleans up all tracked mod links across all running instances.
   */
  cleanupAll() {
    for (const [key, list] of activeLinks.entries()) {
      if (Array.isArray(list)) {
        for (const linkPath of list) {
          this.removeLinkPath(linkPath);
        }
      }
    }
    activeLinks.clear();
  },
};
