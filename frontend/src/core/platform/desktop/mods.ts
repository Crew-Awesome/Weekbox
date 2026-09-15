import type { IModService, DownloadProgressCallback } from "@contracts";
import { DownloadStatus } from "@contracts";
import type { DesktopTransport } from "./transport";
import type { DesktopStorage } from "./storage";
import { getDesktopBasePath } from "./settings";

/**
 * Mod management operations for Desktop environment.
 */
export class DesktopMods implements IModService {
  private transport: DesktopTransport;
  private storage: DesktopStorage;

  constructor(
    transport: DesktopTransport,
    storage: DesktopStorage
  ) {
    this.transport = transport;
    this.storage = storage;
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
    const basePath = await getDesktopBasePath();
    const dataDir = `${basePath}/data`;
    const registryPath = `${dataDir}/mod-installed.json`;

    await this.transport.call("fs.createDirectory" as any, { path: dataDir }).catch(() => {});

    const modsDir = await this.storage.getModsPath();
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
      const existing = await this.transport.call("fs.readFile" as any, { path: registryPath });
      registry = JSON.parse(existing as unknown as string);
      if (!Array.isArray(registry)) registry = [];
    } catch (e) {}

    const updatedInstalledAt = modData.installedAt || Date.now();
    const existingIndex = registry.findIndex((m) => String(m.id) === String(modData.id));
    if (existingIndex >= 0) {
      registry[existingIndex] = {
        ...registry[existingIndex],
        ...entry,
        installedAt: updatedInstalledAt,
      };
    } else {
      registry.push({
        ...entry,
        installedAt: updatedInstalledAt,
      });
    }

    const savedEntry = existingIndex >= 0 ? registry[existingIndex] : entry;

    await this.transport.call("fs.writeFile" as any, {
      path: registryPath,
      content: JSON.stringify(registry, null, 2),
    });

    try {
      const modJsonPath = `${installPath}/mod.json`;
      await this.transport
        .call("fs.writeFile" as any, {
          path: modJsonPath,
          content: JSON.stringify(savedEntry, null, 2),
        })
        .catch(() => {});
    } catch {}

    this.transport.emitLocalEvent("mods:changed", { action: "installed", mod: savedEntry });
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("wb:mods-changed", { detail: { action: "installed", mod: savedEntry } })
      );
    }
  }

  async isModInstalled(modId: string): Promise<boolean> {
    const basePath = await getDesktopBasePath();
    const registryPath = `${basePath}/data/mod-installed.json`;
    try {
      const existing = await this.transport.call("fs.readFile" as any, { path: registryPath });
      const registry = JSON.parse(existing as unknown as string);
      if (Array.isArray(registry)) {
        return registry.some((m) => String(m.id) === String(modId));
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
    const basePath = await getDesktopBasePath();
    const registryPath = `${basePath}/data/mod-installed.json`;
    try {
      const existing = await this.transport.call("fs.readFile" as any, { path: registryPath });
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
    if (this.storage.isMigrationInProgress()) {
      throw new Error("Cannot uninstall while storage migration is in progress. Please wait for the migration to complete.");
    }
    const basePath = await getDesktopBasePath();
    const registryPath = `${basePath}/data/mod-installed.json`;
    const modsDir = await this.storage.getModsPath();

    try {
      const existing = await this.transport.call("fs.readFile" as any, { path: registryPath });
      let registry = JSON.parse(existing as unknown as string);
      if (Array.isArray(registry)) {
        registry = registry.filter((m) => String(m.id) !== String(modId));
        await this.transport.call("fs.writeFile" as any, {
          path: registryPath,
          content: JSON.stringify(registry, null, 2),
        });
      }

      this.transport.emitLocalEvent("mods:changed", { action: "uninstalled", modId });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("wb:mods-changed", { detail: { action: "uninstalled", modId } })
        );
      }

      const dirContents = await this.transport.call("fs.readDirectory" as any, { path: modsDir });
      if (Array.isArray(dirContents)) {
        for (const file of dirContents) {
          if (file.entry.startsWith(`mod_${modId}_`) || file.entry.startsWith(`_temp_${modId}_`)) {
            await this.transport.call("fs.remove" as any, { path: `${modsDir}/${file.entry}` });
          }
        }
      }
    } catch (e) {
      console.warn("Failed to uninstall mod completely", e);
    }
  }

  async openModFolder(modId: string, _modName?: string): Promise<void> {
    const basePath = await getDesktopBasePath();
    const modsDir = `${basePath}/mods`;
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
    const basePath = await getDesktopBasePath();
    const registryPath = `${basePath}/data/mod-installed.json`;
    try {
      const existing = await this.transport.call("fs.readFile" as any, { path: registryPath });
      let registry = JSON.parse(existing as unknown as string);
      if (Array.isArray(registry)) {
        const idx = registry.findIndex((m) => String(m.id) === String(modId));
        if (idx >= 0) {
          registry[idx] = { ...registry[idx], favorite: isFavorite };
          await this.transport.call("fs.writeFile" as any, {
            path: registryPath,
            content: JSON.stringify(registry, null, 2),
          });

          this.transport.emitLocalEvent("mods:changed", { action: "updated", mod: registry[idx] });
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
      const dirContents = await this.transport.call("fs.readDirectory" as any, { path: modsDir });
      if (Array.isArray(dirContents)) {
        for (const file of dirContents) {
          if (file.entry.startsWith(`mod_${modId}_`)) {
            const folderPath = `${modsDir}/${file.entry}`;
            const modJsonPath = `${folderPath}/mod.json`;
            let modJson: any = {};
            try {
              const raw = await this.transport.call("fs.readFile" as any, { path: modJsonPath });
              modJson = JSON.parse(raw as unknown as string);
            } catch {
              modJson = { id: modId };
            }
            modJson.favorite = isFavorite;
            await this.transport.call("fs.writeFile" as any, {
              path: modJsonPath,
              content: JSON.stringify(modJson, null, 2),
            });
          }
        }
      }
    } catch (e) {}
  }

  async updateInstalledMod(modId: string, updates: Record<string, any>): Promise<any | null> {
    const basePath = await getDesktopBasePath();
    let updatedEntry: any = null;
    const registryPath = `${basePath}/data/mod-installed.json`;
    try {
      const existing = await this.transport.call("fs.readFile" as any, { path: registryPath });
      let registry = JSON.parse(existing as unknown as string);
      if (Array.isArray(registry)) {
        const idx = registry.findIndex((m) => String(m.id) === String(modId));
        if (idx >= 0) {
          registry[idx] = { ...registry[idx], ...updates };
          updatedEntry = registry[idx];
          await this.transport.call("fs.writeFile" as any, {
            path: registryPath,
            content: JSON.stringify(registry, null, 2),
          });

          this.transport.emitLocalEvent("mods:changed", { action: "updated", mod: registry[idx] });
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
      const dirContents = await this.transport.call("fs.readDirectory" as any, { path: modsDir });
      if (Array.isArray(dirContents)) {
        for (const file of dirContents) {
          if (file.entry.startsWith(`mod_${modId}_`)) {
            const folderPath = `${modsDir}/${file.entry}`;
            const modJsonPath = `${folderPath}/mod.json`;
            let modJson: any = {};
            try {
              const raw = await this.transport.call("fs.readFile" as any, { path: modJsonPath });
              modJson = JSON.parse(raw as unknown as string);
            } catch {
              modJson = { id: modId };
            }
            modJson = { ...modJson, ...updates };
            await this.transport.call("fs.writeFile" as any, {
              path: modJsonPath,
              content: JSON.stringify(modJson, null, 2),
            });
          }
        }
      }
    } catch (e) {}

    return updatedEntry;
  }
}
