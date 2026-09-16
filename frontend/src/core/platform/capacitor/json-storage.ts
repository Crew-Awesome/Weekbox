import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";

/**
 * Utility helper to read and write JSON files in mobile/Capacitor storage.
 * Ensures mod-installed.json, installed_engines.json, and settings.json
 * are saved as real JSON files on mobile just like on PC.
 */
export class CapacitorJsonStorage {
  private static isNative(): boolean {
    return (
      (typeof Capacitor !== "undefined" &&
        typeof Capacitor.isNativePlatform === "function" &&
        Capacitor.isNativePlatform()) ||
      (typeof window !== "undefined" && Boolean((window as any).Capacitor?.isNativePlatform?.()))
    );
  }

  /**
   * Reads a JSON file from app data storage.
   * Falls back to localStorage if not in a native filesystem environment.
   */
  static async readJson<T = any>(filePath: string, fallback: T): Promise<T> {
    const cleanPath = filePath.replace(/^[/\\]+/, "");
    const storageKey = `wb_cap_${cleanPath.replace(/[/\\.]+/g, "_")}`;

    if (this.isNative()) {
      try {
        const result = await Filesystem.readFile({
          path: cleanPath,
          directory: Directory.Data,
          encoding: Encoding.UTF8,
        });

        const raw = typeof result.data === "string" ? result.data : JSON.stringify(result.data);
        const parsed = JSON.parse(raw);
        return parsed as T;
      } catch {
        // If file doesn't exist yet in Filesystem, check localStorage backup
        try {
          const backup = localStorage.getItem(storageKey);
          if (backup) return JSON.parse(backup) as T;
        } catch {}
        return fallback;
      }
    }

    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Writes a JSON file to app data storage.
   * Automatically ensures parent directories exist.
   */
  static async writeJson<T = any>(filePath: string, data: T): Promise<void> {
    const cleanPath = filePath.replace(/^[/\\]+/, "");
    const storageKey = `wb_cap_${cleanPath.replace(/[/\\.]+/g, "_")}`;
    const serialized = JSON.stringify(data, null, 2);

    // Always keep localStorage updated as immediate synchronous cache/backup
    try {
      localStorage.setItem(storageKey, serialized);
    } catch {}

    if (this.isNative()) {
      try {
        // Ensure parent directory exists
        const lastSlash = cleanPath.lastIndexOf("/");
        if (lastSlash > 0) {
          const parentDir = cleanPath.substring(0, lastSlash);
          await Filesystem.mkdir({
            path: parentDir,
            directory: Directory.Data,
            recursive: true,
          }).catch(() => {});
        }

        await Filesystem.writeFile({
          path: cleanPath,
          data: serialized,
          directory: Directory.Data,
          encoding: Encoding.UTF8,
          recursive: true,
        });
      } catch (err) {
        console.warn(`[CapacitorJsonStorage] Could not write ${cleanPath} to native filesystem:`, err);
      }
    }
  }

  /**
   * Deletes a JSON file or directory in app data storage.
   */
  static async deletePath(filePath: string): Promise<void> {
    const cleanPath = filePath.replace(/^[/\\]+/, "");
    const storageKey = `wb_cap_${cleanPath.replace(/[/\\.]+/g, "_")}`;

    try {
      localStorage.removeItem(storageKey);
    } catch {}

    if (this.isNative()) {
      try {
        await Filesystem.deleteFile({
          path: cleanPath,
          directory: Directory.Data,
        });
      } catch {}
    }
  }
}
