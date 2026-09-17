import type { DesktopTransport } from "./transport";
import type { IStorageService, InstalledMod, RegisterInstalledModPayload } from "@contracts";
import { getDesktopBasePath } from "./settings";
import { compressImageToWebpBase64 } from "../../../utils/image-processor";

/**
 * Dedicated repository for managing local installed mod metadata and registries (SRP).
 * Isolates reading and persisting data/mod-installed.json and mod.json files.
 */
export class DesktopModRegistry {
  private transport: DesktopTransport;
  private storage: Pick<IStorageService, "getModsPath">;

  constructor(transport: DesktopTransport, storage: Pick<IStorageService, "getModsPath">) {
    this.transport = transport;
    this.storage = storage;
  }

  private async getRegistryPath(): Promise<string> {
    const basePath = await getDesktopBasePath();
    return `${basePath}/data/mod-installed.json`;
  }

  async getInstalledMods(): Promise<InstalledMod[]> {
    const registryPath = await this.getRegistryPath();
    try {
      const existing = await this.transport.call("fs.readFile" as any, { path: registryPath });
      const registry = JSON.parse(existing as unknown as string);
      if (Array.isArray(registry)) {
        return registry as InstalledMod[];
      }
    } catch {
      return [];
    }
    return [];
  }

  async getInstalledMod(modId: string): Promise<InstalledMod | null> {
    const list = await this.getInstalledMods();
    return list.find((m) => String(m.id) === String(modId)) || null;
  }

  async isModInstalled(modId: string): Promise<boolean> {
    const registryPath = await this.getRegistryPath();
    try {
      const existing = await this.transport.call("fs.readFile" as any, { path: registryPath });
      const registry = JSON.parse(existing as unknown as string);
      if (Array.isArray(registry)) {
        return registry.some((m) => String(m.id) === String(modId));
      }
    } catch {
      return false;
    }
    return false;
  }

  async registerInstalledMod(modData: RegisterInstalledModPayload): Promise<void> {
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
      compressedThumb = await compressImageToWebpBase64((modData.thumbnail || modData.img)!);
    }

    const entry = {
      installed: true,
      installedAt: modData.installedAt || Date.now(),
      id: Number(modData.id),
      gameId: modData.gameId,
      name: modData.name || modData.title || "Mod",
      title: modData.name || modData.title || "Mod",
      description: modData.description || "",
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
      img: modData.img || "",
      icon: modData.icon,
      thumbnailBase64: compressedThumb || modData.thumbnailBase64,
      favorite: modData.favorite !== undefined ? modData.favorite : false,
    };

    let registry: any[] = [];
    try {
      const existing = await this.transport.call("fs.readFile" as any, { path: registryPath });
      registry = JSON.parse(existing as unknown as string);
      if (!Array.isArray(registry)) registry = [];
    } catch {}

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

  async unregisterInstalledMod(modId: string): Promise<void> {
    const registryPath = await this.getRegistryPath();
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
    } catch (e) {
      console.warn("Failed to unregister mod in mod-installed.json:", e);
    }
  }

  async setModFavorite(modId: string, isFavorite: boolean): Promise<void> {
    const registryPath = await this.getRegistryPath();
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

    const modsDir = await this.storage.getModsPath();
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
    } catch {}
  }

  async updateInstalledMod(modId: string, updates: Partial<InstalledMod>): Promise<InstalledMod | null> {
    const registryPath = await this.getRegistryPath();
    let updatedEntry: InstalledMod | null = null;
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

    const modsDir = await this.storage.getModsPath();
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
    } catch {}

    return updatedEntry;
  }

  async remapInstalledModPaths(targetPath: string, selectedItemNames?: string[]): Promise<void> {
    const registryPath = await this.getRegistryPath();
    try {
      const existing = await this.transport.call("fs.readFile" as any, { path: registryPath });
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

        await this.transport.call("fs.writeFile" as any, {
          path: registryPath,
          content: JSON.stringify(registry, null, 2),
        });

        this.transport.emitLocalEvent("mods:changed", { action: "migrated" });
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("wb:mods-changed", { detail: { action: "migrated" } })
          );
        }
      }
    } catch (e) {
      console.warn("[DesktopModRegistry] Failed to remap mod paths:", e);
    }
  }
}
