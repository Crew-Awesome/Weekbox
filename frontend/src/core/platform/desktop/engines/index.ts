import type { IEngineService, DownloadProgressCallback } from "@contracts";
import type { DesktopTransport } from "../transport";
import type { IStorageService } from "@contracts";
import { downloadEngine } from "./download";
import { isEngineInstalled } from "./verification";
import { openEngineFolder } from "./folder";
import { getInstalledEngines, registerInstalledEngine } from "./registry";
import { uninstallEngine } from "./uninstall";
import { cleanupTempDownload } from "./cleanup";

export * from "./utils";
export * from "./verification";
export * from "./folder";
export * from "./registry";
export * from "./download";
export * from "./uninstall";
export * from "./cleanup";

/**
 * Engine download, verification, registry, and folder operations for Desktop environment.
 * Composes specialized single-responsibility modules.
 */
export class DesktopEngines implements IEngineService {
  private transport: DesktopTransport;
  private storage: IStorageService;

  constructor(transport: DesktopTransport, storage: IStorageService) {
    this.transport = transport;
    this.storage = storage;
  }

  downloadEngine(
    url: string,
    engineId: string,
    version: string,
    onProgress?: DownloadProgressCallback,
    signal?: AbortSignal
  ): Promise<void> {
    return downloadEngine(
      this.transport,
      this.storage,
      (id, ver, meta) => this.registerInstalledEngine(id, ver, meta),
      url,
      engineId,
      version,
      onProgress,
      signal
    );
  }

  isEngineInstalled(engineId: string, version: string): Promise<boolean> {
    return isEngineInstalled(this.transport, this.storage, engineId, version);
  }

  openEngineFolder(engineId: string, version: string): Promise<void> {
    return openEngineFolder(this.transport, this.storage, engineId, version);
  }

  getInstalledEngines(): Promise<Record<string, Record<string, any>>> {
    return getInstalledEngines(this.transport, this.storage);
  }

  registerInstalledEngine(
    engineId: string,
    version: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    return registerInstalledEngine(this.transport, engineId, version, metadata);
  }

  uninstallEngine(engineId: string, version: string): Promise<void> {
    return uninstallEngine(this.transport, this.storage, engineId, version);
  }

  cleanupTempDownload(engineId: string, version: string): Promise<void> {
    return cleanupTempDownload(this.transport, this.storage, engineId, version);
  }
}
