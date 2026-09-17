import type { WebTransport } from "../web/transport";
import type { InstalledMod, RegisterInstalledModPayload } from "@contracts";
import { compressImageToWebpBase64 } from "../../../utils/image-processor";
import { CapacitorJsonStorage } from "./json-storage";

/**
 * Dedicated repository for managing local installed mod metadata and registries in mobile/Capacitor.
 * Persists data to data/mod-installed.json and <installPath>/mod.json.
 */
export class CapacitorModRegistry {
  private transport: WebTransport;
  private readonly registryPath = "data/mod-installed.json";

  constructor(transport: WebTransport) {
    this.transport = transport;
  }

  async getInstalledMods(): Promise<InstalledMod[]> {
    const list = await CapacitorJsonStorage.readJson<InstalledMod[]>(this.registryPath, []);
    return Array.isArray(list) ? list : [];
  }

  async getInstalledMod(modId: string): Promise<InstalledMod | null> {
    const list = await this.getInstalledMods();
    return list.find((m) => String(m.id) === String(modId)) || null;
  }

  async isModInstalled(modId: string): Promise<boolean> {
    const list = await this.getInstalledMods();
    return list.some((m) => String(m.id) === String(modId));
  }

  async registerInstalledMod(modData: RegisterInstalledModPayload): Promise<void> {
    const safeName = (modData.name || modData.title || "unknown")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();

    const installPath = modData.installPath || `mods/mod_${modData.id}_${safeName}`;

    let compressedThumb = "";
    if (modData.thumbnail || modData.img) {
      try {
        compressedThumb = await compressImageToWebpBase64((modData.thumbnail || modData.img)!);
      } catch {}
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

    const registry = await this.getInstalledMods();
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

    // Save into data/mod-installed.json
    await CapacitorJsonStorage.writeJson(this.registryPath, registry);

    // Also persist individual mod.json file inside mod install directory
    try {
      await CapacitorJsonStorage.writeJson(`${installPath}/mod.json`, savedEntry);
    } catch {}

    this.transport.emitLocalEvent("mods:changed", { action: "installed", mod: savedEntry });
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("wb:mods-changed", { detail: { action: "installed", mod: savedEntry } })
      );
    }
  }

  async unregisterInstalledMod(modId: string): Promise<void> {
    try {
      const registry = await this.getInstalledMods();
      const filtered = registry.filter((m) => String(m.id) !== String(modId));
      await CapacitorJsonStorage.writeJson(this.registryPath, filtered);

      this.transport.emitLocalEvent("mods:changed", { action: "uninstalled", modId });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("wb:mods-changed", { detail: { action: "uninstalled", modId } })
        );
      }
    } catch (e) {
      console.warn("[CapacitorModRegistry] Failed to unregister mod in mod-installed.json:", e);
    }
  }

  async setModFavorite(modId: string, isFavorite: boolean): Promise<void> {
    try {
      const registry = await this.getInstalledMods();
      const idx = registry.findIndex((m) => String(m.id) === String(modId));
      if (idx >= 0) {
        registry[idx] = { ...registry[idx], favorite: isFavorite };
        await CapacitorJsonStorage.writeJson(this.registryPath, registry);

        this.transport.emitLocalEvent("mods:changed", { action: "updated", mod: registry[idx] });
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("wb:mods-changed", {
              detail: { action: "updated", mod: registry[idx] },
            })
          );
        }

        // Update mod.json if path exists
        if (registry[idx].installPath) {
          try {
            await CapacitorJsonStorage.writeJson(
              `${registry[idx].installPath}/mod.json`,
              registry[idx]
            );
          } catch {}
        }
      }
    } catch (e) {
      console.warn("[CapacitorModRegistry] Failed to update favorite in mod-installed.json:", e);
    }
  }

  async updateInstalledMod(modId: string, updates: Partial<InstalledMod>): Promise<InstalledMod | null> {
    let updatedEntry: InstalledMod | null = null;
    try {
      const registry = await this.getInstalledMods();
      const idx = registry.findIndex((m) => String(m.id) === String(modId));
      if (idx >= 0) {
        registry[idx] = { ...registry[idx], ...updates };
        updatedEntry = registry[idx];
        await CapacitorJsonStorage.writeJson(this.registryPath, registry);

        this.transport.emitLocalEvent("mods:changed", { action: "updated", mod: registry[idx] });
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("wb:mods-changed", {
              detail: { action: "updated", mod: registry[idx] },
            })
          );
        }

        if (registry[idx].installPath) {
          try {
            await CapacitorJsonStorage.writeJson(
              `${registry[idx].installPath}/mod.json`,
              registry[idx]
            );
          } catch {}
        }
      }
    } catch (e) {
      console.warn("[CapacitorModRegistry] Failed to update mod in mod-installed.json:", e);
    }
    return updatedEntry;
  }

  async remapInstalledModPaths(targetPath: string, selectedItemNames?: string[]): Promise<void> {
    try {
      let registry = await this.getInstalledMods();
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

      await CapacitorJsonStorage.writeJson(this.registryPath, registry);
      this.transport.emitLocalEvent("mods:changed", { action: "migrated" });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("wb:mods-changed", { detail: { action: "migrated" } })
        );
      }
    } catch (e) {
      console.warn("[CapacitorModRegistry] Failed to remap mod paths:", e);
    }
  }
}
