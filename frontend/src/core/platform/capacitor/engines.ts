import type { IEngineService, DownloadProgressCallback } from "@contracts";
import type { WebTransport } from "../web/transport";
import { CapacitorJsonStorage } from "./json-storage";

/**
 * Engine download, verification, and registry operations in mobile/Capacitor environment.
 * Persists data to data/installed_engines.json.
 */
export class CapacitorEngines implements IEngineService {
  private transport: WebTransport;
  private readonly registryPath = "data/installed_engines.json";

  constructor(transport: WebTransport) {
    this.transport = transport;
  }

  async downloadEngine(
    url: string,
    _engineId: string,
    _version: string,
    _onProgress?: DownloadProgressCallback,
    _signal?: AbortSignal
  ): Promise<void> {
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  }

  async isEngineInstalled(engineId: string, version: string): Promise<boolean> {
    const registry = await this.getInstalledEngines();
    const safeEngineId = (engineId || "vslice")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();

    const safeVersion = (version || "latest")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const cleanVer = safeVersion.replace(/^v/, "");
    const engineData = registry[safeEngineId];
    if (!engineData) return false;

    return Object.keys(engineData).some(
      (v) => v.toLowerCase().replace(/^v/, "") === cleanVer.toLowerCase()
    );
  }

  async openEngineFolder(_engineId: string, _version: string): Promise<void> {
    console.info("[CapacitorEngines] Folder exploration is restricted in mobile sandbox.");
  }

  async getInstalledEngines(): Promise<Record<string, Record<string, any>>> {
    const data = await CapacitorJsonStorage.readJson<Record<string, Record<string, any>>>(
      this.registryPath,
      {}
    );
    return data && typeof data === "object" ? data : {};
  }

  async registerInstalledEngine(
    engineId: string,
    version: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const safeEngineId = (engineId || "vslice")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();

    const safeVersion = (version || "latest")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const registry = await this.getInstalledEngines();
    if (!registry[safeEngineId]) {
      registry[safeEngineId] = {};
    }

    registry[safeEngineId][safeVersion] = {
      engineId: safeEngineId,
      version: safeVersion,
      installedAt: metadata?.installedAt || new Date().toISOString(),
      ...(metadata || {}),
    };

    await CapacitorJsonStorage.writeJson(this.registryPath, registry);

    this.transport.emitLocalEvent("engines:changed", {
      action: "installed",
      engine: registry[safeEngineId][safeVersion],
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("wb:engines-changed", {
          detail: { action: "installed", engine: registry[safeEngineId][safeVersion] },
        })
      );
    }
  }

  async uninstallEngine(engineId: string, version: string): Promise<void> {
    const safeEngineId = (engineId || "vslice")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();

    const safeVersion = (version || "latest")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const registry = await this.getInstalledEngines();
    if (registry[safeEngineId] && registry[safeEngineId][safeVersion]) {
      delete registry[safeEngineId][safeVersion];
      if (Object.keys(registry[safeEngineId]).length === 0) {
        delete registry[safeEngineId];
      }

      await CapacitorJsonStorage.writeJson(this.registryPath, registry);

      this.transport.emitLocalEvent("engines:changed", {
        action: "uninstalled",
        engineId: safeEngineId,
        version: safeVersion,
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("wb:engines-changed", {
            detail: { action: "uninstalled", engineId: safeEngineId, version: safeVersion },
          })
        );
      }
    }
  }

  async cleanupTempDownload(_engineId: string, _version: string): Promise<void> {
    // No-op for mobile
  }
}
