import type { BackendOperation, BackendResult } from "../backend/types";
import type { IPlatformBridge, PlatformType } from "./types";
import neuConfig from "../../../../neutralino.config.json";
import { DownloadStatus } from "../../store/download-constants";

/**
 * Platform adapter for Desktop environments (Neutralinojs + Node.js Extension).
 */
export class DesktopAdapter implements IPlatformBridge {
  readonly platformName: PlatformType = "desktop";
  private _isReady: boolean = false;
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  get isReady(): boolean {
    return this._isReady;
  }

  initialize(): void {
    const neutralino = window.Neutralino;
    const NodeExt = window.NodeExtension;

    if (neutralino && NodeExt) {
      neutralino.init();
      window.NODE = new NodeExt(true);

      neutralino.events.on("pingResult", (event: { detail: any }) => {
        this.emitLocalEvent("pingResult", event.detail);
      });

      neutralino.events.on("newInstance", (event: any) => {
        console.log("RECEIVED NEW INSTANCE NATIVELY:", event);
        console.log("DETAIL IS:", event?.detail);
        this.emitLocalEvent("newInstance", event);
      });

      neutralino.events.on("deeplinkArgs", (event: any) => {
        this.emitLocalEvent("deeplinkArgs", event);
      });

      neutralino.events.on("download:progress", (event: any) => {
        this.emitLocalEvent("download:progress", event.detail);
      });

      neutralino.events.on("ready", () => {
        this._isReady = true;
        this.emitLocalEvent("ready", true);

        setInterval(() => {
          this.call("system.ping" as any).catch(() => {});
        }, 5000);
      });
    }
  }

  async getVersion(): Promise<string> {
    return neuConfig.version || "1.0.0";
  }

  call<Operation extends BackendOperation>(
    operation: Operation,
    params?: unknown,
    signal?: AbortSignal
  ): Promise<BackendResult<Operation>> {
    if (!window.NODE?.call) {
      return Promise.reject(new Error("The Node backend is not available."));
    }
    return window.NODE.call<BackendResult<Operation>>(operation, params, 300000, signal);
  }

  onEvent(eventName: string, listener: (data: any) => void): () => void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName)!.add(listener);

    return () => {
      this.eventListeners.get(eventName)?.delete(listener);
    };
  }

  private emitLocalEvent(eventName: string, data: any): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  async downloadMod(url: string, modId?: string, modName?: string, onProgress?: (progress: number, statusText?: string) => void, signal?: AbortSignal): Promise<void> {
    let basePath = window.NL_CWD || window.NL_PATH || "";
    try {
      if (window.Neutralino?.os?.getPath) {
        const dataPath = await window.Neutralino.os.getPath("data");
        basePath = `${dataPath}/WeekBox`;
      }
    } catch (e) {
      console.warn("Could not get OS data path, falling back to CWD");
    }
    
    const safeName = (modName || "unknown")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();

    const id = modId || Date.now();
    const modsDir = `${basePath}/mods`;
    const targetFolder = `${modsDir}/mod_${id}_${safeName}`;
    const tempArchivePath = `${modsDir}/_temp_${id}_${safeName}.zip`;

    console.log(`Downloading mod to ${tempArchivePath} for extraction into ${targetFolder}`);

    let unsubscribe: (() => void) | undefined;
    const progressId = `dl_${Date.now()}_${Math.random()}`;

    if (onProgress) {
      unsubscribe = this.onEvent("download:progress", (data: any) => {
        if (data && data.progressId === progressId) {
           let percent = 0;
           if (data.total > 0) {
             percent = Math.min(98, Math.round((data.downloaded / data.total) * 98));
           } else {
             percent = Math.min(98, Math.round(data.downloaded / (1024 * 1024)));
           }
           onProgress(percent, "Downloading...");
        }
      });
    }

    try {
      await this.call("fs.createDirectory" as any, { path: modsDir }).catch(() => {});
      
      await this.call("http.downloadToFile" as any, {
        url,
        destPath: tempArchivePath,
        progressId,
        options: {},
      }, signal);

      if (signal?.aborted) {
        await this.call("fs.remove" as any, { path: tempArchivePath }).catch(() => {});
        return;
      }

      onProgress?.(99, DownloadStatus.EXTRACTING);

      await this.call("fs.extractArchive" as any, {
        archivePath: tempArchivePath,
        destFolder: targetFolder,
      }, signal);

      await this.call("fs.remove" as any, { path: tempArchivePath }).catch(() => {});

      onProgress?.(99, DownloadStatus.FLATTENING);
      await this.call("fs.flattenFolder" as any, { path: targetFolder }, signal).catch(() => {});

      onProgress?.(100, DownloadStatus.COMPLETED);
    } catch (error: any) {
      await this.call("fs.remove" as any, { path: tempArchivePath }).catch(() => {});
      if (error?.message !== "Cancelled") {
        console.error("Error downloading/extracting mod:", error);
      }
      throw error;
    } finally {
      if (unsubscribe) unsubscribe();
    }
  }

  async openUrl(url: string): Promise<void> {
    if (window.Neutralino?.os?.open) {
      await window.Neutralino.os.open(url);
    } else {
      window.open(url, "_blank");
    }
  }

  async registerInstalledMod(modData: any): Promise<void> {
    let basePath = window.NL_CWD || window.NL_PATH || "";
    try {
      if (window.Neutralino?.os?.getPath) {
        const dataPath = await window.Neutralino.os.getPath("data");
        basePath = `${dataPath}/WeekBox`;
      }
    } catch (e) {
      console.warn("Could not get OS data path");
    }

    const dataDir = `${basePath}/data`;
    const registryPath = `${dataDir}/mod-installed.json`;

    await this.call("fs.createDirectory" as any, { path: dataDir }).catch(() => {});

    let compressedThumb = "";
    if (modData.thumbnail || modData.img) {
      try {
        const imgUrl = modData.thumbnail || modData.img;
        const res = await fetch(imgUrl);
        const blob = await res.blob();
        
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 400;
        let width = bitmap.width;
        let height = bitmap.height;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, width, height);
          compressedThumb = canvas.toDataURL("image/webp", 0.6);
        }
      } catch (e) {
        console.warn("Failed to compress thumbnail for mod registry", e);
      }
    }

    const entry = {
      installed: true,
      installedAt: Date.now(),
      id: modData.id,
      gameId: modData.gameId,
      title: modData.name || modData.title,
      description: modData.description,
      htmlBody: modData.htmlBody,
      author: modData.author,
      userId: modData.userId,
      userPfp: modData.userPfp,
      authors: modData.authors,
      likes: modData.likes,
      views: modData.views,
      downloads: modData.downloads,
      submittedAt: modData.submittedAt,
      updatedAt: modData.updatedAt,
      timeAgo: modData.timeAgo,
      isNsfw: modData.isNsfw,
      previewMedia: modData.previewMedia,
      files: modData.files,
      thumbnailBase64: compressedThumb
    };

    let registry: any[] = [];
    try {
      const existing = await this.call("fs.readFile" as any, { path: registryPath });
      registry = JSON.parse(existing as unknown as string);
      if (!Array.isArray(registry)) registry = [];
    } catch (e) {
    }

    const existingIndex = registry.findIndex(m => m.id === modData.id);
    if (existingIndex >= 0) {
      registry[existingIndex] = entry;
    } else {
      registry.push(entry);
    }

    await this.call("fs.writeFile" as any, { 
      path: registryPath, 
      content: JSON.stringify(registry, null, 2) 
    });
  }

  async isModInstalled(modId: string): Promise<boolean> {
    let basePath = window.NL_CWD || window.NL_PATH || "";
    try {
      if (window.Neutralino?.os?.getPath) {
        const dataPath = await window.Neutralino.os.getPath("data");
        basePath = `${dataPath}/WeekBox`;
      }
    } catch (e) {}

    const registryPath = `${basePath}/data/mod-installed.json`;
    try {
      const existing = await this.call("fs.readFile" as any, { path: registryPath });
      const registry = JSON.parse(existing as unknown as string);
      if (Array.isArray(registry)) {
        return registry.some(m => String(m.id) === String(modId));
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  async uninstallMod(modId: string): Promise<void> {
    let basePath = window.NL_CWD || window.NL_PATH || "";
    try {
      if (window.Neutralino?.os?.getPath) {
        const dataPath = await window.Neutralino.os.getPath("data");
        basePath = `${dataPath}/WeekBox`;
      }
    } catch (e) {}

    const registryPath = `${basePath}/data/mod-installed.json`;
    const modsDir = `${basePath}/mods`;

    try {
      const existing = await this.call("fs.readFile" as any, { path: registryPath });
      let registry = JSON.parse(existing as unknown as string);
      if (Array.isArray(registry)) {
        registry = registry.filter(m => String(m.id) !== String(modId));
        await this.call("fs.writeFile" as any, { 
          path: registryPath, 
          content: JSON.stringify(registry, null, 2) 
        });
      }

      const dirContents = await this.call("fs.readDirectory" as any, { path: modsDir });
      if (Array.isArray(dirContents)) {
        for (const file of dirContents) {
          if (file.entry.startsWith(`mod_${modId}_`) || file.entry.startsWith(`_temp_${modId}_`)) {
            await this.call("fs.remove" as any, { path: `${modsDir}/${file.entry}` });
          }
        }
      }
    } catch (e) {
      console.warn("Failed to uninstall mod completely", e);
    }
  }
}
