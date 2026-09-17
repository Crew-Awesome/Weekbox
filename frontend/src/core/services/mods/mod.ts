import type {
  IModService,
  DownloadProgressCallback,
  InstalledMod,
  RegisterInstalledModPayload,
} from "@contracts";
import { platform } from "@platform";

/**
 * Domain service managing mod downloads, registry entries, and operations (SRP / OCP).
 * Can be instantiated with any custom IModService provider (DIP).
 */
export class ModService implements IModService {
  private readonly provider: IModService;

  constructor(provider?: IModService) {
    this.provider = provider || platform.mods;
  }

  async downloadMod(
    url: string,
    modId?: string,
    modName?: string,
    onProgress?: DownloadProgressCallback,
    signal?: AbortSignal
  ): Promise<void> {
    return this.provider.downloadMod(url, modId, modName, onProgress, signal);
  }

  async registerInstalledMod(modData: RegisterInstalledModPayload): Promise<void> {
    return this.provider.registerInstalledMod(modData);
  }

  async isModInstalled(modId: string): Promise<boolean> {
    return this.provider.isModInstalled(modId);
  }

  async getInstalledMod(modId: string): Promise<InstalledMod | null> {
    return this.provider.getInstalledMod(modId);
  }

  async getInstalledMods(): Promise<InstalledMod[]> {
    return this.provider.getInstalledMods();
  }

  async uninstallMod(modId: string): Promise<void> {
    return this.provider.uninstallMod(modId);
  }

  async openModFolder(modId: string, modName?: string): Promise<void> {
    return this.provider.openModFolder(modId, modName);
  }

  async setModFavorite(modId: string, isFavorite: boolean): Promise<void> {
    return this.provider.setModFavorite(modId, isFavorite);
  }

  async updateInstalledMod(modId: string, updates: Partial<InstalledMod>): Promise<InstalledMod | null> {
    return this.provider.updateInstalledMod(modId, updates);
  }

  async remapInstalledModPaths(targetPath: string, selectedItemNames?: string[]): Promise<void> {
    return this.provider.remapInstalledModPaths(targetPath, selectedItemNames);
  }
}

export const modService = new ModService();
