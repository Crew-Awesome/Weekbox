import type { BackendOperation, BackendResult } from "../backend/types";
import type { IPlatformBridge, PlatformType } from "./types";
import neuConfig from "../../../../neutralino.config.json";

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

        // Start heartbeat to keep the Node backend alive
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

  async downloadMod(url: string, modId?: string, modName?: string, onProgress?: (progress: number) => void, signal?: AbortSignal): Promise<void> {
    let basePath = window.NL_CWD || window.NL_PATH || "";
    try {
      if (window.Neutralino?.os?.getPath) {
        const dataPath = await window.Neutralino.os.getPath("data");
        // Ensure it saves in a "WeekBox" subfolder inside AppData
        basePath = `${dataPath}/WeekBox`;
      }
    } catch (e) {
      console.warn("Could not get OS data path, falling back to CWD");
    }
    
    // Normalize mod name: no accents, remove spaces and special chars
    const safeName = (modName || "unknown")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-zA-Z0-9]/g, "") // alphanumeric only
      .toLowerCase();

    const modsDir = `${basePath}/mods`;
    const destPath = `${modsDir}/mod_${modId || Date.now()}_${safeName}.zip`;

    console.log(`Downloading mod to ${destPath}`);

    let unsubscribe: (() => void) | undefined;
    const progressId = `dl_${Date.now()}_${Math.random()}`;

    if (onProgress) {
      unsubscribe = this.onEvent("download:progress", (data: any) => {
        if (data && data.progressId === progressId) {
           let percent = 0;
           if (data.total > 0) {
             percent = Math.round((data.downloaded / data.total) * 100);
           } else {
             // Fallback if content-length is missing: 1% per MB, up to 99%
             percent = Math.min(99, Math.round(data.downloaded / (1024 * 1024)));
           }
           onProgress(percent);
        }
      });
    }

    try {
      // Ensure the directory exists
      await this.call("fs.createDirectory" as any, { path: modsDir }).catch(() => {});
      
      // Delegate to the Node backend's HTTP client
      await this.call("http.downloadToFile" as any, {
        url,
        destPath,
        progressId, // tell backend to tag progress events with this ID
        options: {},
      }, signal);
    } catch (error: any) {
      if (error?.message !== "Cancelled") {
        console.error("Error downloading mod:", error);
      }
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

    // Ensure directory exists
    await this.call("fs.createDirectory" as any, { path: dataDir }).catch(() => {});

    // Compress thumbnail to base64 WebP
    let compressedThumb = "";
    if (modData.thumbnail || modData.img) {
      try {
        const imgUrl = modData.thumbnail || modData.img;
        const res = await fetch(imgUrl);
        const blob = await res.blob();
        
        const bitmap = await createImageBitmap(blob);
        const canvas = document.createElement("canvas");
        // Resize while keeping aspect ratio, max width 400
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
          compressedThumb = canvas.toDataURL("image/webp", 0.6); // Compress to webp at 60% quality
        }
      } catch (e) {
        console.warn("Failed to compress thumbnail for mod registry", e);
      }
    }

    // Prepare registry entry
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

    // Read existing registry or create new
    let registry: any[] = [];
    try {
      const existing = await this.call("fs.readFile" as any, { path: registryPath });
      registry = JSON.parse(existing as unknown as string);
      if (!Array.isArray(registry)) registry = [];
    } catch (e) {
      // File probably doesn't exist yet
    }

    // Update or push
    const existingIndex = registry.findIndex(m => m.id === modData.id);
    if (existingIndex >= 0) {
      registry[existingIndex] = entry;
    } else {
      registry.push(entry);
    }

    // Write back
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
      // 1. Remove from registry
      const existing = await this.call("fs.readFile" as any, { path: registryPath });
      let registry = JSON.parse(existing as unknown as string);
      if (Array.isArray(registry)) {
        registry = registry.filter(m => String(m.id) !== String(modId));
        await this.call("fs.writeFile" as any, { 
          path: registryPath, 
          content: JSON.stringify(registry, null, 2) 
        });
      }

      // 2. Delete related zip files
      const dirContents = await this.call("fs.readDirectory" as any, { path: modsDir });
      if (Array.isArray(dirContents)) {
        for (const file of dirContents) {
          if (file.type === "FILE" && file.entry.startsWith(`mod_${modId}_`)) {
            await this.call("fs.remove" as any, { path: `${modsDir}/${file.entry}` });
          }
        }
      }
    } catch (e) {
      console.warn("Failed to uninstall mod completely", e);
    }
  }
}
