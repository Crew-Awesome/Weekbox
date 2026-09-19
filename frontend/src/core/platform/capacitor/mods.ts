import { registerPlugin, Capacitor } from "@capacitor/core";
import type {
  IModService,
  DownloadProgressCallback,
  InstalledMod,
  RegisterInstalledModPayload,
} from "@contracts";
import { DownloadStatus } from "@contracts";
import type { WebTransport } from "../web/transport";
import type { CapacitorStorage } from "./storage";
import { CapacitorModRegistry } from "./mod-registry";

export interface ModFileManagerPluginInterface {
  getModsPath(): Promise<{ path: string }>;
  downloadAndExtractMod(options: {
    url: string;
    modId?: string;
    modName?: string;
    taskId?: string;
  }): Promise<{ success: boolean; installPath: string; modId: string }>;
  cancelDownload(options: { taskId: string }): Promise<void>;
  deleteModFolder(options: { modId?: string; folderPath?: string }): Promise<{ success: boolean }>;
  openFolder(options: { path?: string }): Promise<{ success?: boolean; fallbackPath?: string }>;
  addListener(
    eventName: "downloadProgress",
    listenerFunc: (data: {
      taskId: string;
      progressId: string;
      percent: number;
      status: string;
      downloaded: number;
      total: number;
      currentFile?: string;
    }) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

export const ModFileManager = registerPlugin<ModFileManagerPluginInterface>("ModFileManager");

/**
 * Mod management in Mobile / Capacitor environment.
 * Handles native background download, high-performance ZIP extraction,
 * folder flattening, and persists all mod records in data/mod-installed.json.
 */
export class CapacitorMods implements IModService {
  private registry: CapacitorModRegistry;

  constructor(transport: WebTransport, _storage?: CapacitorStorage) {
    this.registry = new CapacitorModRegistry(transport);
  }

  async getModsPath(): Promise<string> {
    const isNative =
      Capacitor.isNativePlatform?.() ||
      (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.());
    if (isNative) {
      const res = await ModFileManager.getModsPath().catch(() => ({ path: "" }));
      if (res?.path) return res.path;
    }
    return "mods";
  }

  async downloadMod(
    url: string,
    modId?: string,
    modName?: string,
    onProgress?: DownloadProgressCallback,
    signal?: AbortSignal
  ): Promise<void> {
    const isNative =
      Capacitor.isNativePlatform?.() ||
      (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.());

    if (!isNative) {
      if (typeof window !== "undefined") {
        const a = document.createElement("a");
        a.href = url;
        a.download = `mod_${modId || Date.now()}_${modName || "unknown"}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      return;
    }

    const taskId = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let progressListener: { remove: () => Promise<void> } | undefined;

    if (onProgress) {
      progressListener = await ModFileManager.addListener("downloadProgress", (data) => {
        if (data && data.taskId === taskId) {
          if (
            data.status === "Flattening folder structure..." ||
            data.status === DownloadStatus.FLATTENING
          ) {
            onProgress(99, DownloadStatus.FLATTENING);
            return;
          }

          if (
            data.status === "Extracting archive..." ||
            data.status === DownloadStatus.EXTRACTING
          ) {
            onProgress(99, DownloadStatus.EXTRACTING, {
              currentFile: data.currentFile,
            });
            return;
          }

          onProgress(data.percent, data.status, {
            downloaded: data.downloaded,
            total: data.total,
            currentFile: data.currentFile,
          });
        }
      });
    }

    const abortHandler = () => {
      ModFileManager.cancelDownload({ taskId }).catch(() => {});
    };

    if (signal) {
      signal.addEventListener("abort", abortHandler, { once: true });
    }

    try {
      const result = await ModFileManager.downloadAndExtractMod({
        url,
        modId,
        modName,
        taskId,
      });

      if (!result?.success) {
        throw new Error("Failed to download or extract mod on Android.");
      }

      onProgress?.(100, DownloadStatus.COMPLETED);
    } catch (err: any) {
      if (signal?.aborted) {
        return;
      }
      throw err;
    } finally {
      if (signal) {
        signal.removeEventListener("abort", abortHandler);
      }
      if (progressListener) {
        progressListener.remove().catch(() => {});
      }
    }
  }

  async registerInstalledMod(modData: RegisterInstalledModPayload): Promise<void> {
    await this.registry.registerInstalledMod(modData);
  }

  async isModInstalled(modId: string): Promise<boolean> {
    return this.registry.isModInstalled(modId);
  }

  async getInstalledMod(modId: string): Promise<InstalledMod | null> {
    return this.registry.getInstalledMod(modId);
  }

  async getInstalledMods(): Promise<InstalledMod[]> {
    return this.registry.getInstalledMods();
  }

  async uninstallMod(modId: string): Promise<void> {
    const mod = await this.registry.getInstalledMod(modId);
    await this.registry.unregisterInstalledMod(modId);

    const isNative =
      Capacitor.isNativePlatform?.() ||
      (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.());
    if (isNative) {
      await ModFileManager.deleteModFolder({
        modId,
        folderPath: mod?.installPath,
      }).catch((e) => console.warn("[CapacitorMods] Failed to delete physical mod folder:", e));
    }
  }

  async openFolder(path?: string): Promise<void> {
    const isNative =
      Capacitor.isNativePlatform?.() ||
      (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.());
    if (isNative) {
      const res = await ModFileManager.openFolder({ path }).catch(() => ({ success: false, fallbackPath: path }));
      if (res?.fallbackPath) {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(res.fallbackPath);
        }
      }
    }
  }

  async openModFolder(modId: string, _modName?: string): Promise<void> {
    const mod = await this.getInstalledMod(modId);
    if (mod?.installPath) {
      await this.openFolder(mod.installPath);
    } else {
      const modsDir = await this.getModsPath();
      await this.openFolder(modsDir);
    }
  }

  async setModFavorite(modId: string, isFavorite: boolean): Promise<void> {
    await this.registry.setModFavorite(modId, isFavorite);
  }

  async updateInstalledMod(modId: string, updates: Partial<InstalledMod>): Promise<InstalledMod | null> {
    return this.registry.updateInstalledMod(modId, updates);
  }

  async remapInstalledModPaths(targetPath: string, selectedItemNames?: string[]): Promise<void> {
    await this.registry.remapInstalledModPaths(targetPath, selectedItemNames);
  }
}
