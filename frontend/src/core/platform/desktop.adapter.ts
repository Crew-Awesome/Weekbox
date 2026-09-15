import type { BackendOperation, BackendResult } from "../backend/types";
import type { IPlatformBridge, PlatformType, DownloadProgressCallback } from "./types";
import neuConfig from "../../../../neutralino.config.json";
import { DownloadStatus } from "../../store/download-constants";
import { useStorageMigrationStore } from "../../store/storage-migration-store";

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

      neutralino.events.on("process:exit", (event: any) => {
        this.emitLocalEvent("process:exit", event.detail);
      });

      neutralino.events.on("windowClose", async () => {
        const settings: any = await this.getSettings().catch(() => ({}));
        const preventClose = settings?.preventCloseOnActive !== false;

        let isProcessActive = false;
        try {
          isProcessActive = await this.isAnyProcessRunning();
        } catch {}

        const hasActiveTasks =
          isProcessActive ||
          (typeof (window as any).__WB_HAS_ACTIVE_TASKS === "function"
            ? (window as any).__WB_HAS_ACTIVE_TASKS()
            : false);

        if (preventClose && hasActiveTasks) {
          const msg = isProcessActive
            ? "Cannot close WeekBox while a game instance is running. Please close the game first."
            : "Cannot close WeekBox while an installation, download, or storage migration is in progress.";

          (window.Neutralino?.os as any)?.showNotification?.("Action Blocked", msg);
          if (typeof window !== "undefined" && (window as any).wbToast) {
            (window as any).wbToast.warning(msg, {
              title: "Action Blocked",
            });
          }
          return;
        }

        try {
          await neutralino.app?.exit();
        } catch {
          window.close();
        }
      });

      neutralino.events.on("ready", () => {
        this._isReady = true;
        this.emitLocalEvent("ready", true);

        let lastPingCheck = Date.now();
        const sendHeartbeat = () => {
          this.call("system.ping" as any).catch(() => {});
        };

        sendHeartbeat();

        setInterval(() => {
          const now = Date.now();
          if (now - lastPingCheck > 12000) {
            sendHeartbeat();
          }
          lastPingCheck = now;
          sendHeartbeat();
        }, 5000);

        if (typeof window !== "undefined") {
          window.addEventListener("focus", sendHeartbeat);
          window.addEventListener("online", sendHeartbeat);
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
              sendHeartbeat();
            }
          });
        }
      });
    }
  }

  async getVersion(): Promise<string> {
    return neuConfig.version || "1.0.0";
  }

  call<Operation extends BackendOperation>(
    operation: Operation,
    params?: unknown,
    signal?: AbortSignal,
    timeoutMs?: number
  ): Promise<BackendResult<Operation>> {
    if (!window.NODE?.call) {
      return Promise.reject(new Error("The Node backend is not available."));
    }
    const defaultTimeout =
      operation === "http.downloadToFile" ||
      operation === "fs.extractArchive" ||
      operation === "fs.flattenFolder"
        ? 0
        : 300000;
    return window.NODE.call<BackendResult<Operation>>(
      operation,
      params,
      timeoutMs ?? defaultTimeout,
      signal
    );
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
    const modsDir = await this.getModsPath();
    const targetFolder = `${modsDir}/mod_${id}_${safeName}`;
    const tempArchivePath = `${modsDir}/_temp_${id}_${safeName}.zip`;

    console.log(`Downloading mod to ${tempArchivePath} for extraction into ${targetFolder}`);

    let unsubscribe: (() => void) | undefined;
    const progressId = `dl_${Date.now()}_${Math.random()}`;

    if (onProgress) {
      unsubscribe = this.onEvent("download:progress", (data: any) => {
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
      await this.call("fs.createDirectory" as any, { path: modsDir }).catch(() => {});
      
      await this.call("http.downloadToFile" as any, {
        url,
        destPath: tempArchivePath,
        progressId,
        options: {},
      }, signal, 0);

      if (signal?.aborted) {
        await this.call("fs.remove" as any, { path: tempArchivePath }).catch(() => {});
        return;
      }

      onProgress?.(99, DownloadStatus.EXTRACTING);

      await this.call("fs.extractArchive" as any, {
        archivePath: tempArchivePath,
        destFolder: targetFolder,
        progressId,
      }, signal, 0);

      await this.call("fs.remove" as any, { path: tempArchivePath }).catch(() => {});

      onProgress?.(99, DownloadStatus.FLATTENING);
      await this.call("fs.flattenFolder" as any, { path: targetFolder, progressId }, signal, 0).catch(() => {});

      onProgress?.(100, DownloadStatus.COMPLETED);
    } catch (error: any) {
      await this.call("fs.remove" as any, { path: tempArchivePath }).catch(() => {});
      if (error?.message !== "Cancelled") {
        console.error(`[Download/Extract Failed] Mod "${modName}" (ID: ${id}):`, error);
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

    const modsDir = await this.getModsPath();
    const safeName = (modData.name || modData.title || "unknown")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();
    const installPath = modData.installPath || `${modsDir}/mod_${modData.id}_${safeName}`;

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
      installedAt: modData.installedAt || Date.now(),
      id: modData.id,
      gameId: modData.gameId,
      name: modData.name || modData.title,
      title: modData.name || modData.title,
      description: modData.description,
      htmlBody: modData.htmlBody,
      installPath,
      author: modData.author,
      userId: modData.userId,
      userPfp: modData.userPfp,
      authors: modData.authors,
      credits: modData.credits,
      version: modData.version,
      updatesCount: modData.updatesCount,
      updates: modData.updates,
      externalLinks: modData.externalLinks,
      studio: modData.studio,
      categoryName: modData.categoryName,
      engineId: modData.engineId,
      engineName: modData.engineName,
      likes: modData.likes,
      views: modData.views,
      downloads: modData.downloads,
      submittedAt: modData.submittedAt,
      updatedAt: modData.updatedAt,
      timeAgo: modData.timeAgo,
      isNsfw: modData.isNsfw,
      previewMedia: modData.previewMedia,
      files: modData.files,
      img: modData.img,
      icon: modData.icon,
      thumbnailBase64: compressedThumb || modData.thumbnailBase64,
      favorite: modData.favorite !== undefined ? modData.favorite : false,
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

    this.emitLocalEvent("mods:changed", { action: "installed", mod: entry });
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("wb:mods-changed", { detail: { action: "installed", mod: entry } })
      );
    }
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

  async getInstalledMod(modId: string): Promise<any | null> {
    const list = await this.getInstalledMods();
    return list.find((m) => String(m.id) === String(modId)) || null;
  }

  async getInstalledMods(): Promise<any[]> {
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
        return registry;
      }
    } catch (e) {
      return [];
    }
    return [];
  }

  async uninstallMod(modId: string): Promise<void> {
    if (useStorageMigrationStore.getState().isMigrating) {
      throw new Error("Cannot uninstall while storage migration is in progress. Please wait for the migration to complete.");
    }
    let basePath = window.NL_CWD || window.NL_PATH || "";
    try {
      if (window.Neutralino?.os?.getPath) {
        const dataPath = await window.Neutralino.os.getPath("data");
        basePath = `${dataPath}/WeekBox`;
      }
    } catch (e) {}

    const registryPath = `${basePath}/data/mod-installed.json`;
    const modsDir = await this.getModsPath();

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

      this.emitLocalEvent("mods:changed", { action: "uninstalled", modId });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("wb:mods-changed", { detail: { action: "uninstalled", modId } })
        );
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

  /**
   * Opens the installation directory for a specific mod in the operating system file manager.
   * @param {string} modId - The ID of the mod.
   * @param {string} [modName] - The display name of the mod.
   */
  async openModFolder(modId: string, _modName?: string): Promise<void> {
    let basePath = window.NL_CWD || window.NL_PATH || "";
    try {
      if (window.Neutralino?.os?.getPath) {
        const dataPath = await window.Neutralino.os.getPath("data");
        basePath = `${dataPath}/WeekBox`;
      }
    } catch (e) {}

    const modsDir = `${basePath}/mods`;
    try {
      const dirContents = await this.call("fs.readDirectory" as any, { path: modsDir });
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

  /**
   * Updates the favorite flag in the installed mods registry and inside the mod's folder JSON.
   * @param {string} modId - The ID of the mod.
   * @param {boolean} isFavorite - Whether the mod is marked as favorite.
   */
  async setModFavorite(modId: string, isFavorite: boolean): Promise<void> {
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
      let registry = JSON.parse(existing as unknown as string);
      if (Array.isArray(registry)) {
        const idx = registry.findIndex((m) => String(m.id) === String(modId));
        if (idx >= 0) {
          registry[idx] = { ...registry[idx], favorite: isFavorite };
          await this.call("fs.writeFile" as any, {
            path: registryPath,
            content: JSON.stringify(registry, null, 2),
          });

          this.emitLocalEvent("mods:changed", { action: "updated", mod: registry[idx] });
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("wb:mods-changed", {
                detail: { action: "updated", mod: registry[idx] },
              })
            );
          }
        }
      }
    } catch (e) {
      console.warn("Failed to update favorite in mod-installed.json:", e);
    }

    const modsDir = `${basePath}/mods`;
    try {
      const dirContents = await this.call("fs.readDirectory" as any, { path: modsDir });
      if (Array.isArray(dirContents)) {
        for (const file of dirContents) {
          if (file.entry.startsWith(`mod_${modId}_`)) {
            const folderPath = `${modsDir}/${file.entry}`;
            const modJsonPath = `${folderPath}/mod.json`;
            let modJson: any = {};
            try {
              const raw = await this.call("fs.readFile" as any, { path: modJsonPath });
              modJson = JSON.parse(raw as unknown as string);
            } catch {
              modJson = { id: modId };
            }
            modJson.favorite = isFavorite;
            await this.call("fs.writeFile" as any, {
              path: modJsonPath,
              content: JSON.stringify(modJson, null, 2),
            });
          }
        }
      }
    } catch (e) {}
  }

  /**
   * Updates arbitrary properties (name, description, engine, etc.) of an installed mod in both
   * the central registry (mod-installed.json) and the local mod.json.
   * @param {string} modId - The ID of the mod.
   * @param {Record<string, any>} updates - Key-value pairs to update.
   * @returns {Promise<any | null>} The updated mod entry.
   */
  async updateInstalledMod(modId: string, updates: Record<string, any>): Promise<any | null> {
    let basePath = window.NL_CWD || window.NL_PATH || "";
    try {
      if (window.Neutralino?.os?.getPath) {
        const dataPath = await window.Neutralino.os.getPath("data");
        basePath = `${dataPath}/WeekBox`;
      }
    } catch (e) {}

    let updatedEntry: any = null;
    const registryPath = `${basePath}/data/mod-installed.json`;
    try {
      const existing = await this.call("fs.readFile" as any, { path: registryPath });
      let registry = JSON.parse(existing as unknown as string);
      if (Array.isArray(registry)) {
        const idx = registry.findIndex((m) => String(m.id) === String(modId));
        if (idx >= 0) {
          registry[idx] = { ...registry[idx], ...updates };
          updatedEntry = registry[idx];
          await this.call("fs.writeFile" as any, {
            path: registryPath,
            content: JSON.stringify(registry, null, 2),
          });

          this.emitLocalEvent("mods:changed", { action: "updated", mod: registry[idx] });
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("wb:mods-changed", {
                detail: { action: "updated", mod: registry[idx] },
              })
            );
          }
        }
      }
    } catch (e) {
      console.warn("Failed to update mod in mod-installed.json:", e);
    }

    const modsDir = `${basePath}/mods`;
    try {
      const dirContents = await this.call("fs.readDirectory" as any, { path: modsDir });
      if (Array.isArray(dirContents)) {
        for (const file of dirContents) {
          if (file.entry.startsWith(`mod_${modId}_`)) {
            const folderPath = `${modsDir}/${file.entry}`;
            const modJsonPath = `${folderPath}/mod.json`;
            let modJson: any = {};
            try {
              const raw = await this.call("fs.readFile" as any, { path: modJsonPath });
              modJson = JSON.parse(raw as unknown as string);
            } catch {
              modJson = { id: modId };
            }
            modJson = { ...modJson, ...updates };
            await this.call("fs.writeFile" as any, {
              path: modJsonPath,
              content: JSON.stringify(modJson, null, 2),
            });
          }
        }
      }
    } catch (e) {}

    return updatedEntry;
  }

  /**
   * Downloads an engine release archive, extracts it into <basePath>/engines/<engineName>/<version>, and flattens it.
   */
  async downloadEngine(
    url: string,
    engineId: string,
    version: string,
    onProgress?: DownloadProgressCallback,
    signal?: AbortSignal
  ): Promise<void> {
    let basePath = window.NL_CWD || window.NL_PATH || "";
    try {
      if (window.Neutralino?.os?.getPath) {
        const dataPath = await window.Neutralino.os.getPath("data");
        basePath = `${dataPath}/WeekBox`;
      }
    } catch (e) {
      console.warn("Could not get OS data path, falling back to CWD");
    }

    basePath = basePath.replace(/\\/g, "/");

    const safeEngineId = (engineId || "vslice")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();

    const safeVersion = (version || "latest")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const enginesDir = await this.getEnginesPath();
    const engineDir = `${enginesDir}/${safeEngineId}`;
    const targetFolder = `${engineDir}/${safeVersion}`;
    const tempArchivePath = `${enginesDir}/_temp_engine_${safeEngineId}_${safeVersion}.zip`;

    console.log(`Downloading engine to ${tempArchivePath} for extraction into ${targetFolder}`);

    let unsubscribe: (() => void) | undefined;
    const progressId = `dl_engine_${Date.now()}_${Math.random()}`;

    if (onProgress) {
      unsubscribe = this.onEvent("download:progress", (data: any) => {
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
      await this.call("fs.createDirectory" as any, { path: enginesDir }).catch(() => {});
      await this.call("fs.createDirectory" as any, { path: engineDir }).catch(() => {});
      await this.call("fs.createDirectory" as any, { path: targetFolder }).catch(() => {});

      await this.call("http.downloadToFile" as any, {
        url,
        destPath: tempArchivePath,
        progressId,
        options: {},
      }, signal, 0);

      if (signal?.aborted) {
        await this.call("fs.remove" as any, { path: tempArchivePath }).catch(() => {});
        return;
      }

      onProgress?.(99, DownloadStatus.EXTRACTING);

      await this.call("fs.extractArchive" as any, {
        archivePath: tempArchivePath,
        destFolder: targetFolder,
        progressId,
      }, signal, 0);

      await this.call("fs.remove" as any, { path: tempArchivePath }).catch(() => {});

      onProgress?.(99, DownloadStatus.FLATTENING);
      await this.call("fs.flattenFolder" as any, { path: targetFolder, progressId }, signal, 0).catch(() => {});

      await this.registerInstalledEngine(safeEngineId, safeVersion, {
        downloadUrl: url,
        installedAt: new Date().toISOString(),
      });

      onProgress?.(100, DownloadStatus.COMPLETED);

      if (typeof window !== "undefined") {
        const sysEnabled = localStorage.getItem("wb_system_notifications") !== "false";
        const isUnfocused = typeof document !== "undefined" && (!document.hasFocus() || document.hidden);
        if (sysEnabled && isUnfocused) {
          try {
            await this.call("notification.show" as any, {
              title: "Engine Installed",
              content: `${engineId} v${version} has been downloaded and installed.`,
              icon: "INFO",
            });
          } catch (notifErr) {
            console.warn("Could not dispatch system notification on engine download finish:", notifErr);
          }
        }
      }
    } catch (error: any) {
      await this.call("fs.remove" as any, { path: tempArchivePath }).catch(() => {});
      if (error?.message !== "Cancelled") {
        console.error(`[Download/Extract Failed] Engine "${engineId}" v${version}:`, error);
      }
      throw error;
    } finally {
      if (unsubscribe) unsubscribe();
    }
  }

  /**
   * Checks if an engine version is installed in <basePath>/engines/<engineName>/<version>.
   */
  async isEngineInstalled(engineId: string, version: string): Promise<boolean> {
    let basePath = window.NL_CWD || window.NL_PATH || "";
    try {
      if (window.Neutralino?.os?.getPath) {
        const dataPath = await window.Neutralino.os.getPath("data");
        basePath = `${dataPath}/WeekBox`;
      }
    } catch (e) {}
    basePath = basePath.replace(/\\/g, "/");

    const safeEngineId = (engineId || "vslice")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();

    const safeVersion = (version || "latest")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const enginesDir = await this.getEnginesPath();
    const targetFolder = `${enginesDir}/${safeEngineId}/${safeVersion}`;

    try {
      const stats = await this.call("fs.getStats" as any, { path: targetFolder });
      if (stats && stats.isDirectory) return true;
    } catch {}

    const altVersion = safeVersion.startsWith("v") ? safeVersion.slice(1) : `v${safeVersion}`;
    const altFolder = `${enginesDir}/${safeEngineId}/${altVersion}`;
    try {
      const stats = await this.call("fs.getStats" as any, { path: altFolder });
      return Boolean(stats && stats.isDirectory);
    } catch {
      return false;
    }
  }

  /**
   * Opens the directory for a specific engine version in the system file manager.
   */
  async openEngineFolder(engineId: string, version: string): Promise<void> {
    let basePath = window.NL_CWD || window.NL_PATH || "";
    try {
      if (window.Neutralino?.os?.getPath) {
        const dataPath = await window.Neutralino.os.getPath("data");
        basePath = `${dataPath}/WeekBox`;
      }
    } catch (e) {}
    basePath = basePath.replace(/\\/g, "/");

    const safeEngineId = (engineId || "vslice")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();

    const safeVersion = (version || "latest")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const enginesDir = await this.getEnginesPath();
    const targetFolder = `${enginesDir}/${safeEngineId}/${safeVersion}`;

    if (window.Neutralino?.os?.open) {
      await window.Neutralino.os.open(targetFolder);
    }
  }

  /**
   * Retrieves the registry of all installed engines from data/installed_engines.json
   * and merges any installed engine folders found directly on disk.
   */
  async getInstalledEngines(): Promise<Record<string, Record<string, any>>> {
    let basePath = window.NL_CWD || window.NL_PATH || "";
    try {
      if (window.Neutralino?.os?.getPath) {
        const dataPath = await window.Neutralino.os.getPath("data");
        basePath = `${dataPath}/WeekBox`;
      }
    } catch (e) {}
    basePath = basePath.replace(/\\/g, "/");

    const registryPath = `${basePath}/data/installed_engines.json`;
    let registry: Record<string, Record<string, any>> = {};

    try {
      const raw = await this.call("fs.readFile" as any, { path: registryPath });
      const parsed = JSON.parse(raw as unknown as string);
      if (parsed && typeof parsed === "object") {
        registry = parsed;
      }
    } catch {
      try {
        if (window.Neutralino?.filesystem?.readFile) {
          const raw = await window.Neutralino.filesystem.readFile(registryPath);
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            registry = parsed;
          }
        }
      } catch {}
    }

    try {
      const enginesFolder = await this.getEnginesPath();
      let engineDirs: any[] = [];
      try {
        const res = await this.call("fs.readDirectory" as any, { path: enginesFolder });
        engineDirs = Array.isArray(res) ? res : (res as any)?.entries || [];
      } catch {
        if (window.Neutralino?.filesystem?.readDirectory) {
          engineDirs = await window.Neutralino.filesystem.readDirectory(enginesFolder);
        }
      }

      for (const entry of engineDirs) {
        const name = typeof entry === "string" ? entry : entry?.name;
        const isDir = typeof entry === "object" ? (entry.isDirectory ?? entry.type === "DIRECTORY") : true;
        if (!name || name === "." || name === ".." || !isDir) continue;

        const engineKey = name.toLowerCase();
        if (!registry[engineKey]) {
          registry[engineKey] = {};
        }

        const versionsFolder = `${enginesFolder}/${name}`;
        let versionDirs: any[] = [];
        try {
          const vRes = await this.call("fs.readDirectory" as any, { path: versionsFolder });
          versionDirs = Array.isArray(vRes) ? vRes : (vRes as any)?.entries || [];
        } catch {
          if (window.Neutralino?.filesystem?.readDirectory) {
            versionDirs = await window.Neutralino.filesystem.readDirectory(versionsFolder);
          }
        }

        for (const vEntry of versionDirs) {
          const vName = typeof vEntry === "string" ? vEntry : vEntry?.name;
          const vIsDir = typeof vEntry === "object" ? (vEntry.isDirectory ?? vEntry.type === "DIRECTORY") : true;
          if (!vName || vName === "." || vName === ".." || !vIsDir) continue;

          if (!registry[engineKey][vName]) {
            registry[engineKey][vName] = {
              engineId: engineKey,
              version: vName,
              installedAt: new Date().toISOString(),
              path: `engines/${engineKey}/${vName}`,
            };
          }
        }
      }
    } catch {}

    return registry;
  }

  /**
   * Auto-detects and launches the game executable inside a folder using the Node backend.
   */
  async launchExecutable(
    folderPath: string,
    options?: {
      executableName?: string;
      instanceId?: string;
      args?: string[];
      env?: Record<string, string>;
      modFolderPath?: string;
      modFolderPaths?: string[];
    }
  ): Promise<{ ok: boolean; pid?: number; executablePath?: string; instanceId?: string; error?: string }> {
    return (await this.call("process.launch" as any, {
      folderPath,
      executableName: options?.executableName,
      instanceId: options?.instanceId,
      args: options?.args,
      env: options?.env,
      modFolderPath: options?.modFolderPath,
      modFolderPaths: options?.modFolderPaths,
    })) as any;
  }

  /**
   * Terminates an active game process by instance identifier.
   */
  async killProcess(instanceId: string): Promise<{ ok: boolean; error?: string }> {
    return (await this.call("process.kill" as any, { instanceId })) as any;
  }

  /**
   * Records an engine version installation in data/installed_engines.json.
   */
  async registerInstalledEngine(
    engineId: string,
    version: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    let basePath = window.NL_CWD || window.NL_PATH || "";
    try {
      if (window.Neutralino?.os?.getPath) {
        const dataPath = await window.Neutralino.os.getPath("data");
        basePath = `${dataPath}/WeekBox`;
      }
    } catch (e) {}
    basePath = basePath.replace(/\\/g, "/");

    const dataDir = `${basePath}/data`;
    const registryPath = `${dataDir}/installed_engines.json`;

    const safeEngineId = (engineId || "vslice")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();

    const safeVersion = (version || "latest")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    let registry: Record<string, Record<string, any>> = {};
    try {
      const raw = await this.call("fs.readFile" as any, { path: registryPath });
      registry = JSON.parse(raw as unknown as string) || {};
    } catch {}

    if (!registry[safeEngineId]) {
      registry[safeEngineId] = {};
    }

    const entry = {
      engineId: safeEngineId,
      version: safeVersion,
      installedAt: metadata?.installedAt || new Date().toISOString(),
      path: `engines/${safeEngineId}/${safeVersion}`,
      ...metadata,
    };

    registry[safeEngineId][safeVersion] = entry;

    try {
      await this.call("fs.createDirectory" as any, { path: dataDir }).catch(() => {});
      await this.call("fs.writeFile" as any, {
        path: registryPath,
        content: JSON.stringify(registry, null, 2),
      });

      this.emitLocalEvent("engines:changed", { action: "installed", engine: entry });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("wb:engines-changed", { detail: { action: "installed", engine: entry } })
        );
      }
    } catch (err) {
      console.warn("Could not save installed engines registry:", err);
    }
  }

  /**
   * Uninstalls an engine version, removing its files and updating data/installed_engines.json.
   */
  async uninstallEngine(engineId: string, version: string): Promise<void> {
    if (useStorageMigrationStore.getState().isMigrating) {
      throw new Error("Cannot uninstall while storage migration is in progress. Please wait for the migration to complete.");
    }
    let basePath = window.NL_CWD || window.NL_PATH || "";
    try {
      if (window.Neutralino?.os?.getPath) {
        const dataPath = await window.Neutralino.os.getPath("data");
        basePath = `${dataPath}/WeekBox`;
      }
    } catch (e) {}
    basePath = basePath.replace(/\\/g, "/");

    const safeEngineId = (engineId || "vslice")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();

    const safeVersion = (version || "latest")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const enginesDir = await this.getEnginesPath();
    const targetFolder = `${enginesDir}/${safeEngineId}/${safeVersion}`;
    const registryPath = `${basePath}/data/installed_engines.json`;

    try {
      await this.call("fs.remove" as any, { path: targetFolder }).catch(() => {});
    } catch (delErr) {
      console.warn(`Could not delete engine files at ${targetFolder}:`, delErr);
    }

    try {
      const raw = await this.call("fs.readFile" as any, { path: registryPath });
      const registry = JSON.parse(raw as unknown as string) || {};
      if (registry[safeEngineId] && registry[safeEngineId][safeVersion]) {
        delete registry[safeEngineId][safeVersion];
        if (Object.keys(registry[safeEngineId]).length === 0) {
          delete registry[safeEngineId];
        }
        await this.call("fs.writeFile" as any, {
          path: registryPath,
          content: JSON.stringify(registry, null, 2),
        });
      }
    } catch {}

    this.emitLocalEvent("engines:changed", { action: "uninstalled", engineId: safeEngineId, version: safeVersion });
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("wb:engines-changed", {
          detail: { action: "uninstalled", engineId: safeEngineId, version: safeVersion },
        })
      );
    }
  }

  private async getBasePath(): Promise<string> {
    let basePath = window.NL_CWD || window.NL_PATH || "";
    try {
      if (window.Neutralino?.os?.getPath) {
        const dataPath = await window.Neutralino.os.getPath("data");
        basePath = `${dataPath}/WeekBox`;
      }
    } catch {}
    return basePath.replace(/\\/g, "/");
  }

  async getDefaultPaths(): Promise<{ basePath: string; defaultModsPath: string; defaultEnginesPath: string }> {
    const base = await this.getBasePath();
    return {
      basePath: base,
      defaultModsPath: `${base}/mods`,
      defaultEnginesPath: `${base}/engines`,
    };
  }

  async getSettings(): Promise<Record<string, any>> {
    try {
      const base = await this.getBasePath();
      const settingsPath = `${base}/data/settings.json`;
      const exists = await this.call("fs.exists", { path: settingsPath }).catch(() => false);
      if (exists) {
        const raw = await this.call("fs.readFile", { path: settingsPath });
        return typeof raw === "string" ? JSON.parse(raw) : ((raw as any) || {});
      }
    } catch {}
    return {};
  }

  async saveSettings(settings: Record<string, any>): Promise<void> {
    try {
      const base = await this.getBasePath();
      const dataDir = `${base}/data`;
      await this.call("fs.createDirectory", { path: dataDir }).catch(() => {});
      const settingsPath = `${dataDir}/settings.json`;
      await this.call("fs.writeFile", {
        path: settingsPath,
        content: JSON.stringify(settings, null, 2),
      });
      this.emitLocalEvent("settings:changed", settings);
    } catch (err) {
      console.warn("Could not write settings.json:", err);
    }
  }

  async getModsPath(): Promise<string> {
    const settings = await this.getSettings();
    if (settings.modsPath && typeof settings.modsPath === "string") {
      return settings.modsPath.replace(/\\/g, "/");
    }
    const base = await this.getBasePath();
    return `${base}/mods`;
  }

  async getEnginesPath(): Promise<string> {
    const settings = await this.getSettings();
    if (settings.enginesPath && typeof settings.enginesPath === "string") {
      return settings.enginesPath.replace(/\\/g, "/");
    }
    const base = await this.getBasePath();
    return `${base}/engines`;
  }

  async showFolderDialog(title: string, defaultPath?: string): Promise<string | null> {
    const os = window.Neutralino?.os as any;
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

  async validateStorageFolder(
    targetPath: string,
    type: "mods" | "engines"
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const res = await this.call("storage.validateFolder" as any, { targetPath, type });
      return res as any;
    } catch (e: any) {
      return { valid: false, reason: e?.message || "Failed to validate destination folder." };
    }
  }

  async inspectStorage(folderPath: string): Promise<{
    count: number;
    totalBytes: number;
    formattedSize: string;
    estimatedTime: string;
    items?: Array<{ name: string; bytes: number; formattedSize: string }>;
  }> {
    try {
      const res = await this.call("storage.inspect" as any, { folderPath });
      return res as any;
    } catch {
      return { count: 0, totalBytes: 0, formattedSize: "0 B", estimatedTime: "< 1s", items: [] };
    }
  }

  async migrateStorage(
    sourcePath: string,
    targetPath: string,
    type: "mods" | "engines",
    onProgress?: (progress: {
      currentItem: string;
      currentIndex: number;
      totalItems: number;
      percent: number;
      remainingItems: number;
    }) => void,
    selectedItemNames?: string[]
  ): Promise<{ ok: boolean; count: number }> {
    let unsubscribe: (() => void) | undefined;
    if (onProgress) {
      unsubscribe = this.onEvent("download:progress", (data: any) => {
        if (data && data.currentItem !== undefined) {
          onProgress(data);
        }
      });
    }

    try {
      const res = await this.call("storage.migrate" as any, {
        sourcePath,
        targetPath,
        selectedItemNames,
      });

      const settings = await this.getSettings();
      if (type === "mods") {
        settings.modsPath = targetPath;
      } else {
        settings.enginesPath = targetPath;
      }
      await this.saveSettings(settings);

      /* Update installed mods registry and installPath values */
      if (type === "mods") {
        let basePath = window.NL_CWD || window.NL_PATH || "";
        try {
          if (window.Neutralino?.os?.getPath) {
            const dataPath = await window.Neutralino.os.getPath("data");
            basePath = `${dataPath}/WeekBox`;
          }
        } catch {}

        const registryPath = `${basePath}/data/mod-installed.json`;
        try {
          const existing = await this.call("fs.readFile" as any, { path: registryPath });
          let registry = JSON.parse(existing as unknown as string);
          if (Array.isArray(registry)) {
            const hasSelection = Array.isArray(selectedItemNames) && selectedItemNames.length > 0;
            const selectedSet = hasSelection ? new Set(selectedItemNames) : null;

            registry = registry
              .filter((m) => {
                if (!selectedSet) return true;
                const safeName = (m.name || m.title || "unknown")
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/[^a-zA-Z0-9]/g, "")
                  .toLowerCase();
                const expectedFolder = `mod_${m.id}_${safeName}`;
                return (
                  selectedSet.has(expectedFolder) ||
                  Array.from(selectedSet).some((name) => name.startsWith(`mod_${m.id}_`))
                );
              })
              .map((m) => {
                const safeName = (m.name || m.title || "unknown")
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/[^a-zA-Z0-9]/g, "")
                  .toLowerCase();
                return {
                  ...m,
                  installPath: `${targetPath}/mod_${m.id}_${safeName}`,
                };
              });

            await this.call("fs.writeFile" as any, {
              path: registryPath,
              content: JSON.stringify(registry, null, 2),
            });

            this.emitLocalEvent("mods:changed", { action: "migrated" });
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("wb:mods-changed", { detail: { action: "migrated" } })
              );
            }
          }
        } catch {}
      }

      this.emitLocalEvent("storage:migrated", { type, targetPath });
      return res as any;
    } finally {
      if (unsubscribe) unsubscribe();
    }
  }

  async isAnyProcessRunning(): Promise<boolean> {
    try {
      const res = await this.call("process.isAnyRunning" as any);
      return Boolean(res);
    } catch {
      return false;
    }
  }

  async isInstanceRunning(instanceId: string): Promise<boolean> {
    try {
      const res = await this.call("process.isInstanceRunning" as any, { instanceId });
      return Boolean(res);
    } catch {
      return false;
    }
  }
}

