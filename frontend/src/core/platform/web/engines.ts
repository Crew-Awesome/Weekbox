import type { IEngineService, DownloadProgressCallback } from "@contracts";
import type { WebTransport } from "./transport";
import type { WebStorage } from "./storage";

/**
 * Engine registry operations in Web localStorage.
 */
export class WebEngines implements IEngineService {
  private transport: WebTransport;
  private storage: WebStorage;

  constructor(
    transport: WebTransport,
    storage: WebStorage
  ) {
    this.transport = transport;
    this.storage = storage;
  }

  async downloadEngine(
    url: string,
    _engineId: string,
    _version: string,
    _onProgress?: DownloadProgressCallback,
    _signal?: AbortSignal
  ): Promise<void> {
    window.open(url, "_blank");
  }

  async isEngineInstalled(engineId: string, version: string): Promise<boolean> {
    const registry = await this.getInstalledEngines();
    return !!(registry[engineId] && registry[engineId][version]);
  }

  async openEngineFolder(_engineId: string, _version: string): Promise<void> {
    console.info("[WebAdapter] openEngineFolder is not supported in the web environment.");
  }

  async getInstalledEngines(): Promise<Record<string, Record<string, any>>> {
    try {
      const raw = localStorage.getItem("wb_installed_engines");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  async registerInstalledEngine(
    engineId: string,
    version: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const registry = await this.getInstalledEngines();
    if (!registry[engineId]) registry[engineId] = {};
    registry[engineId][version] = {
      engineId,
      version,
      installedAt: metadata?.installedAt || new Date().toISOString(),
      ...metadata,
    };
    localStorage.setItem("wb_installed_engines", JSON.stringify(registry));
    this.transport.emitLocalEvent("engines:changed", { action: "installed", engine: registry[engineId][version] });
  }

  async uninstallEngine(engineId: string, version: string): Promise<void> {
    if (this.storage.isMigrationInProgress()) {
      throw new Error("Cannot uninstall while storage migration is in progress. Please wait for the migration to complete.");
    }
    const registry = await this.getInstalledEngines();
    if (registry[engineId] && registry[engineId][version]) {
      delete registry[engineId][version];
      if (Object.keys(registry[engineId]).length === 0) {
        delete registry[engineId];
      }
      localStorage.setItem("wb_installed_engines", JSON.stringify(registry));
      this.transport.emitLocalEvent("engines:changed", { action: "uninstalled", engineId, version });
    }
  }

  async cleanupTempDownload(_engineId: string, _version: string): Promise<void> {
    // No-op for web browser
  }
}
