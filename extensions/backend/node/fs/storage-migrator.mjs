import fs from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

/**
 * Formats byte count to human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Estimates transfer time based on byte size (45 MB/s).
 * @param {number} bytes
 * @returns {string}
 */
export function estimateTime(bytes) {
  if (bytes < 1024 * 1024) return "< 1s";
  const seconds = Math.max(1, Math.round(bytes / (45 * 1024 * 1024)));
  if (seconds < 60) return `~${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  return `~${minutes}m ${remSec}s`;
}

/**
 * Storage inspection, validation and migration operations (SRP).
 */
export const storageMigratorApi = {
  async inspectStorage(folderPath) {
    if (!folderPath) {
      return { count: 0, totalBytes: 0, formattedSize: "0 B", estimatedTime: "< 1s" };
    }

    try {
      await fs.access(folderPath, constants.F_OK);
    } catch {
      return { count: 0, totalBytes: 0, formattedSize: "0 B", estimatedTime: "< 1s" };
    }

    const calcDirSize = async (dir) => {
      let total = 0;
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            total += await calcDirSize(full);
          } else if (entry.isFile()) {
            try {
              const stat = await fs.stat(full);
              total += stat.size;
            } catch {}
          }
        }
      } catch {}
      return total;
    };

    try {
      const entries = await fs.readdir(folderPath, { withFileTypes: true });
      const topItems = entries.filter((e) => !e.name.startsWith("."));
      let totalBytes = 0;

      const itemsList = [];
      for (const item of topItems) {
        const full = path.join(folderPath, item.name);
        let itemBytes = 0;
        if (item.isDirectory()) {
          itemBytes = await calcDirSize(full);
        } else {
          try {
            const stat = await fs.stat(full);
            itemBytes = stat.size;
          } catch {}
        }
        totalBytes += itemBytes;
        itemsList.push({
          name: item.name,
          bytes: itemBytes,
          formattedSize: formatBytes(itemBytes),
        });
      }

      return {
        count: topItems.length,
        totalBytes,
        formattedSize: formatBytes(totalBytes),
        estimatedTime: estimateTime(totalBytes),
        items: itemsList,
      };
    } catch {
      return { count: 0, totalBytes: 0, formattedSize: "0 B", estimatedTime: "< 1s", items: [] };
    }
  },

  async validateStorageFolder(targetPath, type) {
    if (!targetPath) {
      return { valid: false, reason: "Target directory path cannot be empty." };
    }

    try {
      await fs.access(targetPath, constants.F_OK);
    } catch {
      return { valid: true };
    }

    try {
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      const dirEntries = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
      if (dirEntries.length === 0) {
        return { valid: true };
      }

      if (type === "mods") {
        const modRegex = /^mod_\d+_.+$/i;
        const hasForeignDir = dirEntries.some((d) => !modRegex.test(d.name));
        if (hasForeignDir) {
          return {
            valid: false,
            reason: "Target folder is occupied by foreign folders. Please select an empty folder or a valid WeekBox storage directory.",
          };
        }
      } else if (type === "engines") {
        const knownEngines = [
          "vslice",
          "psych",
          "codename",
          "leather",
          "kade",
          "micup",
          "fpsplus",
          "yacker",
        ];
        const hasForeignDir = dirEntries.some(
          (d) => !knownEngines.includes(d.name.toLowerCase()) && !d.name.startsWith("engine_")
        );
        if (hasForeignDir) {
          return {
            valid: false,
            reason: "Target folder is occupied by foreign folders. Please select an empty folder or a valid WeekBox storage directory.",
          };
        }
      }

      return { valid: true };
    } catch (err) {
      return {
        valid: false,
        reason: err?.message || "Failed to inspect destination folder.",
      };
    }
  },

  async migrateStorage({ sourcePath, targetPath, selectedItemNames }, onProgress) {
    if (!sourcePath || !targetPath) {
      throw new Error("Both sourcePath and targetPath are required.");
    }
    const cleanSource = path.resolve(sourcePath);
    const cleanTarget = path.resolve(targetPath);

    if (cleanSource.toLowerCase() === cleanTarget.toLowerCase()) {
      return { ok: true, count: 0 };
    }

    try {
      await fs.access(cleanSource, constants.F_OK);
    } catch {
      await fs.mkdir(cleanTarget, { recursive: true });
      return { ok: true, count: 0 };
    }

    await fs.mkdir(cleanTarget, { recursive: true });
    const entries = await fs.readdir(cleanSource, { withFileTypes: true });
    const items = entries.filter((e) => !e.name.startsWith("."));
    const totalItems = items.length;

    const hasSelectionFilter = Array.isArray(selectedItemNames) && selectedItemNames.length > 0;
    const selectedSet = hasSelectionFilter ? new Set(selectedItemNames) : null;

    const ensureWritable = async (filePath) => {
      try {
        await fs.chmod(filePath, 0o666);
      } catch {}
    };

    const copyDirResilient = async (src, dst) => {
      await fs.mkdir(dst, { recursive: true });
      const dirents = await fs.readdir(src, { withFileTypes: true });
      for (const dirent of dirents) {
        const sPath = path.join(src, dirent.name);
        const dPath = path.join(dst, dirent.name);
        if (dirent.isDirectory()) {
          await copyDirResilient(sPath, dPath);
        } else {
          try {
            await ensureWritable(dPath);
            await fs.copyFile(sPath, dPath);
          } catch (copyErr) {
            try {
              const sStat = await fs.stat(sPath);
              const dStat = await fs.stat(dPath);
              if (sStat.size === dStat.size) {
                continue;
              }
            } catch {}

            try {
              await new Promise((r) => setTimeout(r, 200));
              await ensureWritable(dPath);
              await fs.copyFile(sPath, dPath);
            } catch (retryErr) {
              console.warn(`Could not copy file ${dirent.name}:`, retryErr?.message);
            }
          }
        }
      }
    };

    const removeDirResilient = async (dir) => {
      try {
        await fs.rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
      } catch (rmErr) {
        console.warn(`Could not completely remove source dir ${dir}:`, rmErr?.message);
      }
    };

    for (let i = 0; i < totalItems; i++) {
      const item = items[i];
      const srcItemPath = path.join(cleanSource, item.name);
      const destItemPath = path.join(cleanTarget, item.name);

      const isSelected = selectedSet ? selectedSet.has(item.name) : true;

      if (typeof onProgress === "function") {
        onProgress({
          currentItem: isSelected ? item.name : `Deleting ${item.name}`,
          currentIndex: i + 1,
          totalItems,
          percent: Math.round(((i) / totalItems) * 100),
          remainingItems: totalItems - i,
        });
      }

      if (isSelected) {
        let movedViaRename = false;
        try {
          await fs.rename(srcItemPath, destItemPath);
          movedViaRename = true;
        } catch (renameErr) {
          movedViaRename = false;
        }

        if (!movedViaRename) {
          if (item.isDirectory()) {
            await copyDirResilient(srcItemPath, destItemPath);
          } else {
            try {
              await ensureWritable(destItemPath);
              await fs.copyFile(srcItemPath, destItemPath);
            } catch (fileCopyErr) {
              console.warn(`Could not copy top-level file ${item.name}:`, fileCopyErr?.message);
            }
          }
          await removeDirResilient(srcItemPath);
        }
      } else {
        await removeDirResilient(srcItemPath);
      }
    }

    if (typeof onProgress === "function") {
      onProgress({
        currentItem: "Finished",
        currentIndex: totalItems,
        totalItems,
        percent: 100,
        remainingItems: 0,
      });
    }

    return { ok: true, count: totalItems };
  },
};
