import type {
  IModService,
  DownloadProgressCallback,
  InstalledMod,
  RegisterInstalledModPayload,
} from "@contracts";
import type { WebTransport } from "../web/transport";
import type { CapacitorStorage } from "./storage";
import { CapacitorModRegistry } from "./mod-registry";

/**
 * Mod management in Mobile / Capacitor environment.
 * Persists all mod records in data/mod-installed.json and mod.json via CapacitorModRegistry.
 */
export class CapacitorMods implements IModService {
  private registry: CapacitorModRegistry;

  constructor(transport: WebTransport, _storage?: CapacitorStorage) {
    this.registry = new CapacitorModRegistry(transport);
  }

  async downloadMod(
    url: string,
    modId?: string,
    modName?: string,
    _onProgress?: DownloadProgressCallback,
    _signal?: AbortSignal
  ): Promise<void> {
    if (typeof window !== "undefined") {
      const a = document.createElement("a");
      a.href = url;
      a.download = `mod_${modId || Date.now()}_${modName || "unknown"}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
    await this.registry.unregisterInstalledMod(modId);
  }

  async openModFolder(_modId: string, _modName?: string): Promise<void> {
    console.info("[CapacitorMods] Folder exploration is restricted in mobile sandbox.");
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
