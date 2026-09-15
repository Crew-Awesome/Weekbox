import type { IEngineService, DownloadProgressCallback } from "@contracts";
import { DownloadStatus } from "@contracts";
import type { DesktopTransport } from "./transport";
import type { DesktopStorage } from "./storage";
import { getDesktopBasePath } from "./settings";

/**
 * Engine download, verification, registry, and folder operations for Desktop environment.
 */
export class DesktopEngines implements IEngineService {
  private transport: DesktopTransport;
  private storage: DesktopStorage;

  constructor(
    transport: DesktopTransport,
    storage: DesktopStorage
  ) {
    this.transport = transport;
    this.storage = storage;
  }

  async downloadEngine(
    url: string,
    engineId: string,
    version: string,
    onProgress?: DownloadProgressCallback,
    signal?: AbortSignal
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

    const enginesDir = await this.storage.getEnginesPath();
    const engineDir = `${enginesDir}/${safeEngineId}`;
    const targetFolder = `${engineDir}/${safeVersion}`;
    const tempArchivePath = `${enginesDir}/_temp_engine_${safeEngineId}_${safeVersion}.zip`;

    let unsubscribe: (() => void) | undefined;
    const progressId = `dl_engine_${Date.now()}_${Math.random()}`;

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
      await this.transport.call("fs.createDirectory" as any, { path: enginesDir }).catch(() => {});
      await this.transport.call("fs.createDirectory" as any, { path: engineDir }).catch(() => {});
      await this.transport.call("fs.createDirectory" as any, { path: targetFolder }).catch(() => {});

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

      await this.registerInstalledEngine(safeEngineId, safeVersion, {
        downloadUrl: url,
        installedAt: new Date().toISOString(),
      });

      onProgress?.(100, DownloadStatus.COMPLETED);

      if (typeof window !== "undefined") {
        const sysEnabled = localStorage.getItem("wb_system_notifications") !== "false";
        const isUnfocused = typeof document !== "undefined" && (!document.hasFocus() || document.hidden);
        if (sysEnabled && isUnfocused) {
          try {
            await this.transport.call("notification.show" as any, {
              title: "Engine Installed",
              content: `${engineId} v${version} has been downloaded and installed.`,
              icon: "INFO",
            });
          } catch (notifErr) {
            console.warn("Could not dispatch system notification on engine download finish:", notifErr);
          }
        }
      }
    } catch (error: any) {
      await this.transport.call("fs.remove" as any, { path: tempArchivePath }).catch(() => {});
      if (error?.message !== "Cancelled") {
        console.error(`[Download/Extract Failed] Engine "${engineId}" v${version}:`, error);
      }
      throw error;
    } finally {
      if (unsubscribe) unsubscribe();
    }
  }

  async isEngineInstalled(engineId: string, version: string): Promise<boolean> {
    const safeEngineId = (engineId || "vslice")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();

    const safeVersion = (version || "latest")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const enginesDir = await this.storage.getEnginesPath();
    const targetFolder = `${enginesDir}/${safeEngineId}/${safeVersion}`;

    try {
      const stats = await this.transport.call("fs.getStats" as any, { path: targetFolder });
      if (stats && (stats as any).isDirectory) return true;
    } catch {}

    const altVersion = safeVersion.startsWith("v") ? safeVersion.slice(1) : `v${safeVersion}`;
    const altFolder = `${enginesDir}/${safeEngineId}/${altVersion}`;
    try {
      const stats = await this.transport.call("fs.getStats" as any, { path: altFolder });
      return Boolean(stats && (stats as any).isDirectory);
    } catch {
      return false;
    }
  }

  async openEngineFolder(engineId: string, version: string): Promise<void> {
    const safeEngineId = (engineId || "vslice")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();

    const safeVersion = (version || "latest")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const enginesDir = await this.storage.getEnginesPath();
    const targetFolder = `${enginesDir}/${safeEngineId}/${safeVersion}`;
    const altVersion = safeVersion.startsWith("v") ? safeVersion.slice(1) : `v${safeVersion}`;
    const altFolder = `${enginesDir}/${safeEngineId}/${altVersion}`;
    const fallbackEngineFolder = `${enginesDir}/${safeEngineId}`;

    const tryOpen = async (folder: string) => {
      try {
        const stats = await this.transport.call("fs.getStats" as any, { path: folder });
        if (stats && (stats as any).isDirectory && window.Neutralino?.os?.open) {
          await window.Neutralino.os.open(folder);
          return true;
        }
      } catch {}
      return false;
    };

    if (await tryOpen(targetFolder)) return;
    if (await tryOpen(altFolder)) return;
    if (await tryOpen(fallbackEngineFolder)) return;

    if (window.Neutralino?.os?.open) {
      await window.Neutralino.os.open(enginesDir);
    }
  }

  async getInstalledEngines(): Promise<Record<string, Record<string, any>>> {
    const basePath = await getDesktopBasePath();
    const registryPath = `${basePath}/data/installed_engines.json`;
    let registry: Record<string, Record<string, any>> = {};

    try {
      const raw = await this.transport.call("fs.readFile" as any, { path: registryPath });
      registry = JSON.parse(raw as unknown as string) || {};
    } catch {}

    const enginesDir = await this.storage.getEnginesPath();
    try {
      const enginesExists = await this.transport
        .call("fs.exists" as any, { path: enginesDir })
        .catch(() => false);
      if (enginesExists) {
        const engineEntries = await this.transport.call("fs.readDirectory" as any, { path: enginesDir });
        if (Array.isArray(engineEntries)) {
          for (const entry of engineEntries) {
            if (entry.type === "DIRECTORY" && !entry.entry.startsWith("_") && !entry.entry.startsWith(".")) {
              const safeEngineId = entry.entry;
              const subDir = `${enginesDir}/${safeEngineId}`;
              try {
                const verEntries = await this.transport.call("fs.readDirectory" as any, { path: subDir });
                if (Array.isArray(verEntries)) {
                  for (const ver of verEntries) {
                    if (ver.type === "DIRECTORY" && !ver.entry.startsWith("_") && !ver.entry.startsWith(".")) {
                      const safeVersion = ver.entry;
                      if (!registry[safeEngineId]) {
                        registry[safeEngineId] = {};
                      }
                      if (!registry[safeEngineId][safeVersion]) {
                        registry[safeEngineId][safeVersion] = {
                          engineId: safeEngineId,
                          version: safeVersion,
                          installedAt: new Date().toISOString(),
                        };
                      }
                    }
                  }
                }
              } catch {}
            }
          }
        }
      }
    } catch {}

    return registry;
  }

  async registerInstalledEngine(
    engineId: string,
    version: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const basePath = await getDesktopBasePath();
    const dataDir = `${basePath}/data`;
    const registryPath = `${dataDir}/installed_engines.json`;

    const safeEngineId = (engineId || "vslice")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();

    const safeVersion = (version || "latest")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    await this.transport.call("fs.createDirectory" as any, { path: dataDir }).catch(() => {});

    let registry: Record<string, Record<string, any>> = {};
    try {
      const raw = await this.transport.call("fs.readFile" as any, { path: registryPath });
      registry = JSON.parse(raw as unknown as string) || {};
    } catch {}

    if (!registry[safeEngineId]) {
      registry[safeEngineId] = {};
    }

    registry[safeEngineId][safeVersion] = {
      engineId: safeEngineId,
      version: safeVersion,
      installedAt: new Date().toISOString(),
      ...(metadata || {}),
    };

    try {
      await this.transport.call("fs.writeFile" as any, {
        path: registryPath,
        content: JSON.stringify(registry, null, 2),
      });

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
    } catch (err) {
      console.warn("Could not save installed engines registry:", err);
    }
  }

  async uninstallEngine(engineId: string, version: string): Promise<void> {
    if (this.storage.isMigrationInProgress()) {
      throw new Error("Cannot uninstall while storage migration is in progress. Please wait for the migration to complete.");
    }
    const basePath = await getDesktopBasePath();

    const safeEngineId = (engineId || "vslice")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .toLowerCase();

    const safeVersion = (version || "latest")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const enginesDir = await this.storage.getEnginesPath();
    const targetFolder = `${enginesDir}/${safeEngineId}/${safeVersion}`;
    const altVersion = safeVersion.startsWith("v") ? safeVersion.slice(1) : `v${safeVersion}`;
    const altFolder = `${enginesDir}/${safeEngineId}/${altVersion}`;

    try {
      await this.transport.call("fs.remove" as any, { path: targetFolder }).catch(() => {});
      await this.transport.call("fs.remove" as any, { path: altFolder }).catch(() => {});
    } catch {}

    const registryPath = `${basePath}/data/installed_engines.json`;

    try {
      const raw = await this.transport.call("fs.readFile" as any, { path: registryPath });
      const registry = JSON.parse(raw as unknown as string) || {};
      if (registry[safeEngineId] && registry[safeEngineId][safeVersion]) {
        delete registry[safeEngineId][safeVersion];
        if (Object.keys(registry[safeEngineId]).length === 0) {
          delete registry[safeEngineId];
        }
        await this.transport.call("fs.writeFile" as any, {
          path: registryPath,
          content: JSON.stringify(registry, null, 2),
        });
      }
    } catch {}

    this.transport.emitLocalEvent("engines:changed", { action: "uninstalled", engineId: safeEngineId, version: safeVersion });
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("wb:engines-changed", {
          detail: { action: "uninstalled", engineId: safeEngineId, version: safeVersion },
        })
      );
    }
  }
}
