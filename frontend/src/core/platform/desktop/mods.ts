import type { IModService, DownloadProgressCallback } from "@contracts";
import { DownloadStatus } from "@contracts";
import type { DesktopTransport } from "./transport";
import type { DesktopStorage } from "./storage";
import { DesktopModRegistry } from "./mod-registry";

/**
 * Mod management operations for Desktop environment (SRP).
 * Focuses on download and extraction lifecycle, delegating persistence to DesktopModRegistry.
 */
export class DesktopMods implements IModService {
  private transport: DesktopTransport;
  private storage: DesktopStorage;
  readonly registry: DesktopModRegistry;

  constructor(
    transport: DesktopTransport,
    storage: DesktopStorage,
    registry?: DesktopModRegistry
  ) {
    this.transport = transport;
    this.storage = storage;
    this.registry = registry || new DesktopModRegistry(transport, storage);
  }

  async downloadMod(
    url: string,
    modId?: string,
    modName?: string,
    onProgress?: DownloadProgressCallback,
    signal?: AbortSignal
  ): Promise<void> {
    const safeName = (modName || "unknown")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();

    const id = modId || Date.now();
    const modsDir = await this.storage.getModsPath();
    const targetFolder = `${modsDir}/mod_${id}_${safeName}`;
    const tempArchivePath = `${modsDir}/_temp_${id}_${safeName}.zip`;

    let unsubscribe: (() => void) | undefined;
    const progressId = `dl_${Date.now()}_${Math.random()}`;

    if (onProgress) {
      unsubscribe = this.transport.onEvent("download:progress", (data: any) => {
        if (data && data.progressId === progressId) {
          if (
            data.flattening ||
            data.status === DownloadStatus.FLATTENING ||
            data.status === "Flattening folder structure..."
          ) {
            onProgress(99, DownloadStatus.FLATTENING);
            return;
          }

          if (data.currentFile) {
            onProgress(99, DownloadStatus.EXTRACTING, {
              currentFile: data.currentFile,
            });
            return;
          }

          let percent = 0;
          if (data.total > 0) {
            percent = Math.min(98, Math.round((data.downloaded / data.total) * 98));
          } else {
            percent = Math.min(98, Math.round(data.downloaded / (1024 * 1024)));
          }
          onProgress(percent, "Downloading...", {
            downloaded: data.downloaded,
            total: data.total,
          });
        }
      });
    }

    try {
      await this.transport.call("fs.createDirectory" as any, { path: modsDir }).catch(() => {});

      await this.transport.call(
        "http.downloadToFile" as any,
        {
          url,
          destPath: tempArchivePath,
          progressId,
          options: {},
        },
        signal,
        0
      );

      if (signal?.aborted) {
        await this.transport.call("fs.remove" as any, { path: tempArchivePath }).catch(() => {});
        return;
      }

      onProgress?.(99, DownloadStatus.EXTRACTING);

      await this.transport.call(
        "fs.extractArchive" as any,
        {
          archivePath: tempArchivePath,
          destFolder: targetFolder,
          progressId,
        },
        signal,
        0
      );

      await this.transport.call("fs.remove" as any, { path: tempArchivePath }).catch(() => {});

      onProgress?.(99, DownloadStatus.FLATTENING);
      await this.transport
        .call("fs.flattenFolder" as any, { path: targetFolder, progressId }, signal, 0)
        .catch(() => {});

      onProgress?.(100, DownloadStatus.COMPLETED);
    } catch (error: any) {
      await this.transport.call("fs.remove" as any, { path: tempArchivePath }).catch(() => {});
      if (error?.message !== "Cancelled") {
        console.error(`[Download/Extract Failed] Mod "${modName}" (ID: ${id}):`, error);
      }
      throw error;
    } finally {
      if (unsubscribe) unsubscribe();
    }
  }

  async registerInstalledMod(modData: any): Promise<void> {
    return this.registry.registerInstalledMod(modData);
  }

  async isModInstalled(modId: string): Promise<boolean> {
    return this.registry.isModInstalled(modId);
  }

  async getInstalledMod(modId: string): Promise<any | null> {
    return this.registry.getInstalledMod(modId);
  }

  async getInstalledMods(): Promise<any[]> {
    return this.registry.getInstalledMods();
  }

  async uninstallMod(modId: string): Promise<void> {
    if (this.storage.isMigrationInProgress()) {
      throw new Error(
        "Cannot uninstall while storage migration is in progress. Please wait for the migration to complete."
      );
    }

    await this.registry.unregisterInstalledMod(modId);

    const modsDir = await this.storage.getModsPath();
    try {
      const dirContents = await this.transport.call("fs.readDirectory" as any, { path: modsDir });
      if (Array.isArray(dirContents)) {
        for (const file of dirContents) {
          if (file.entry.startsWith(`mod_${modId}_`)) {
            await this.transport.call("fs.remove" as any, { path: `${modsDir}/${file.entry}` });
          }
        }
      }
    } catch (e) {
      console.warn("Failed to delete mod folder on disk:", e);
    }
  }

  async openModFolder(modId: string, _modName?: string): Promise<void> {
    const modsDir = await this.storage.getModsPath();
    try {
      const dirContents = await this.transport.call("fs.readDirectory" as any, { path: modsDir });
      if (Array.isArray(dirContents)) {
        const match = dirContents.find((f: any) => f.entry.startsWith(`mod_${modId}_`));
        if (match && window.Neutralino?.os?.open) {
          await window.Neutralino.os.open(`${modsDir}/${match.entry}`);
          return;
        }
      }
      if (window.Neutralino?.os?.open) {
        await window.Neutralino.os.open(modsDir);
      }
    } catch {
      if (window.Neutralino?.os?.open) {
        await window.Neutralino.os.open(modsDir);
      }
    }
  }

  async setModFavorite(modId: string, isFavorite: boolean): Promise<void> {
    return this.registry.setModFavorite(modId, isFavorite);
  }

  async updateInstalledMod(modId: string, updates: Record<string, any>): Promise<any | null> {
    return this.registry.updateInstalledMod(modId, updates);
  }

  async remapInstalledModPaths(targetPath: string, selectedItemNames?: string[]): Promise<void> {
    return this.registry.remapInstalledModPaths(targetPath, selectedItemNames);
  }
}
