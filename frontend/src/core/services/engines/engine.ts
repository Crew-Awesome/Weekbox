import type { IEngineService, DownloadProgressCallback } from "@contracts";
import { platform } from "@platform";

/**
 * Domain service managing engine downloads, registry entries, and operations (SRP / OCP).
 * Can be instantiated with any custom IEngineService provider (DIP).
 */
export class EngineService implements IEngineService {
  private readonly provider: IEngineService;

  constructor(provider?: IEngineService) {
    this.provider = provider || platform;
  }

  async downloadEngine(
    url: string,
    engineId: string,
    version: string,
    onProgress?: DownloadProgressCallback,
    signal?: AbortSignal
  ): Promise<void> {
    return this.provider.downloadEngine(url, engineId, version, onProgress, signal);
  }

  async isEngineInstalled(engineId: string, version: string): Promise<boolean> {
    return this.provider.isEngineInstalled(engineId, version);
  }

  async openEngineFolder(engineId: string, version: string): Promise<void> {
    return this.provider.openEngineFolder(engineId, version);
  }

  async getInstalledEngines(): Promise<Record<string, Record<string, any>>> {
    return this.provider.getInstalledEngines();
  }

  async registerInstalledEngine(
    engineId: string,
    version: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    return this.provider.registerInstalledEngine(engineId, version, metadata);
  }

  async uninstallEngine(engineId: string, version: string): Promise<void> {
    return this.provider.uninstallEngine(engineId, version);
  }

  async cleanupTempDownload(engineId: string, version: string): Promise<void> {
    return this.provider.cleanupTempDownload(engineId, version);
  }
}

export const engineService = new EngineService();
