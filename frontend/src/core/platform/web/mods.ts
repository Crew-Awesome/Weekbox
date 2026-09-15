import type { IModService, DownloadProgressCallback } from "@contracts";
import type { WebTransport } from "./transport";
import type { WebStorage } from "./storage";

/**
 * Mod management using Web localStorage and browser downloads.
 */
export class WebMods implements IModService {
  private transport: WebTransport;
  private storage: WebStorage;

  constructor(
    transport: WebTransport,
    storage: WebStorage
  ) {
    this.transport = transport;
    this.storage = storage;
  }

  async downloadMod(
    url: string,
    modId?: string,
    modName?: string,
    _onProgress?: DownloadProgressCallback,
    _signal?: AbortSignal
  ): Promise<void> {
    const a = document.createElement("a");
    a.href = url;
    a.download = `mod_${modId || Date.now()}_${modName || "unknown"}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async registerInstalledMod(modData: any): Promise<void> {
    try {
      const list = await this.getInstalledMods();
      const updatedInstalledAt = modData.installedAt || Date.now();
      const entry = {
        installed: true,
        ...modData,
        installedAt: updatedInstalledAt,
      };
      const idx = list.findIndex((m) => String(m.id) === String(modData.id));
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...entry, installedAt: updatedInstalledAt };
      } else {
        list.push(entry);
      }
      localStorage.setItem("wb_installed_mods", JSON.stringify(list));
      const savedEntry = idx >= 0 ? list[idx] : entry;
      this.transport.emitLocalEvent("mods:changed", { action: "installed", mod: savedEntry });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("wb:mods-changed", { detail: { action: "installed", mod: savedEntry } })
        );
      }
    } catch (e) {
      console.warn("Registered installed mod (Web error):", e);
    }
  }

  async isModInstalled(modId: string): Promise<boolean> {
    const list = await this.getInstalledMods();
    return list.some((m) => String(m.id) === String(modId));
  }

  async getInstalledMod(modId: string): Promise<any | null> {
    const list = await this.getInstalledMods();
    return list.find((m) => String(m.id) === String(modId)) || null;
  }

  async getInstalledMods(): Promise<any[]> {
    try {
      const raw = localStorage.getItem("wb_installed_mods");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async uninstallMod(modId: string): Promise<void> {
    if (this.storage.isMigrationInProgress()) {
      throw new Error("Cannot uninstall while storage migration is in progress. Please wait for the migration to complete.");
    }
    try {
      const list = await this.getInstalledMods();
      const filtered = list.filter((m) => String(m.id) !== String(modId));
      localStorage.setItem("wb_installed_mods", JSON.stringify(filtered));
      this.transport.emitLocalEvent("mods:changed", { action: "uninstalled", modId });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("wb:mods-changed", { detail: { action: "uninstalled", modId } })
        );
      }
    } catch (e) {
      console.warn("Uninstall mod (Web error):", e);
    }
  }

  async openModFolder(_modId: string, _modName?: string): Promise<void> {
    console.info("[WebAdapter] openModFolder is not supported in the web environment.");
  }

  async setModFavorite(modId: string, isFavorite: boolean): Promise<void> {
    try {
      const list = await this.getInstalledMods();
      const idx = list.findIndex((m) => String(m.id) === String(modId));
      if (idx >= 0) {
        list[idx] = { ...list[idx], favorite: isFavorite };
        localStorage.setItem("wb_installed_mods", JSON.stringify(list));
      }
    } catch (e) {
      console.warn("Set mod favorite (Web error):", e);
    }
  }

  async updateInstalledMod(modId: string, updates: Record<string, any>): Promise<any | null> {
    try {
      const list = await this.getInstalledMods();
      const idx = list.findIndex((m) => String(m.id) === String(modId));
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem("wb_installed_mods", JSON.stringify(list));
        this.transport.emitLocalEvent("mods:changed", { action: "updated", mod: list[idx] });
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("wb:mods-changed", {
              detail: { action: "updated", mod: list[idx] },
            })
          );
        }
        return list[idx];
      }
    } catch (e) {
      console.warn("Update installed mod (Web error):", e);
    }
    return null;
  }
}
