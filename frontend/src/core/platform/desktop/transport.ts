import type { BackendOperation, BackendResult } from "../../backend/types";
import type { IPlatformTransport, IPlatformEvents } from "@contracts";

/**
 * Low-level IPC transport and event bus for Desktop (Neutralino + Node.js extension).
 */
export class DesktopTransport implements IPlatformTransport, IPlatformEvents {
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  async call<Operation extends BackendOperation>(
    operation: Operation,
    params?: unknown,
    signal?: AbortSignal,
    timeoutMs?: number
  ): Promise<BackendResult<Operation>> {
    if (operation === "http.fetchJson" || operation === "http.fetchText") {
      const p = (params as any) || {};
      const timeout = timeoutMs ?? 30000;
      if (window.NODE?.call) {
        try {
          return await window.NODE.call<BackendResult<Operation>>(
            operation,
            params,
            timeout,
            signal
          );
        } catch (nodeErr) {
          console.warn(
            `[DesktopTransport] Node backend failed for ${operation}, falling back to web fetch:`,
            nodeErr
          );
        }
      }
      try {
        const response = await fetch(p.url, { ...p.options, signal });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        if (operation === "http.fetchJson") {
          return (await response.json()) as BackendResult<Operation>;
        }
        return (await response.text()) as BackendResult<Operation>;
      } catch (fetchErr) {
        throw new Error(
          `Fetch failed for ${p?.url}: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`
        );
      }
    }

    if (!window.NODE?.call) {
      // Native fallbacks when Node extension is not available (e.g., Mac without Node)
      if (operation.startsWith("fs.")) {
        return this.fallbackFsOperation(operation, params);
      }
      if (operation === "http.downloadToFile") {
        return this.fallbackDownloadToFile(params, signal) as any;
      }
      return Promise.reject(new Error(`The Node backend is not available for operation: ${operation}`));
    }
    
    let defaultTimeout = 300000; 
    if (
      operation === "http.downloadToFile" ||
      operation === "fs.extractArchive" ||
      operation === "fs.flattenFolder"
    ) {
      defaultTimeout = 0; 
    } else if (
      operation === "fs.readFile" ||
      operation === "fs.readDirectory" ||
      operation === "fs.exists" ||
      operation === "fs.getStats"
    ) {
      defaultTimeout = 20000; 
    }

    return window.NODE.call<BackendResult<Operation>>(
      operation,
      params,
      timeoutMs ?? defaultTimeout,
      signal
    );
  }

  private async fallbackFsOperation(operation: string, params: any): Promise<any> {
    const fs = (window as any).Neutralino?.filesystem;
    if (!fs) throw new Error("Neutralino filesystem API not available.");
    switch (operation) {
      case "fs.createDirectory":
        return fs.createDirectory(params.path);
      case "fs.remove":
        return fs.remove(params.path);
      case "fs.readDirectory":
        return fs.readDirectory(params.path);
      case "fs.readFile":
        return fs.readFile(params.path);
      case "fs.exists":
        return fs.getStats(params.path).then(() => true).catch(() => false);
      case "fs.extractArchive":
        return this.fallbackExtractArchive(params);
      default:
        throw new Error(`Unsupported fallback fs operation: ${operation}`);
    }
  }

  private async fallbackDownloadToFile(params: any, signal?: AbortSignal): Promise<void> {
    const { url, destPath, progressId } = params;
    const isWindows = (window as any).NL_OS === "Windows";
    const neu = (window as any).Neutralino;
    
    this.emitLocalEvent("download:progress", { progressId, downloaded: 0, total: 100, status: "Starting native download..." });
    
    const cmd = isWindows 
      ? `curl.exe -L -s -o "${destPath}" "${url}"`
      : `curl -L -s -o "${destPath}" "${url}"`;
      
    return new Promise((resolve, reject) => {
      neu.os.spawnProcess(cmd).then((process: any) => {
        const checkInterval = setInterval(() => {
          neu.filesystem.getStats(destPath).then((stats: any) => {
             this.emitLocalEvent("download:progress", { progressId, downloaded: stats.size, total: 0 });
          }).catch(() => {});
        }, 1000);

        const onExit = (evt: CustomEvent) => {
          if (evt.detail.id === process.id) {
            clearInterval(checkInterval);
            neu.events.off("spawnedProcessExited", onExit);
            if (evt.detail.exitCode === 0) resolve();
            else reject(new Error(`Native download failed with code ${evt.detail.exitCode}`));
          }
        };
        neu.events.on("spawnedProcessExited", onExit);
        
        if (signal) {
          signal.addEventListener("abort", () => {
            clearInterval(checkInterval);
            neu.events.off("spawnedProcessExited", onExit);
            neu.os.updateSpawnedProcess(process.id, "exit").catch(() => {});
            reject(new Error("Cancelled"));
          }, { once: true });
        }
      }).catch(reject);
    });
  }

  private async fallbackExtractArchive(params: any): Promise<void> {
    const { archivePath, destFolder, progressId } = params;
    const isWindows = (window as any).NL_OS === "Windows";
    const neu = (window as any).Neutralino;
    
    this.emitLocalEvent("download:progress", { progressId, status: "Extracting natively..." });
    
    const cmd = isWindows
      ? `tar -xf "${archivePath}" -C "${destFolder}"`
      : `unzip -q -o "${archivePath}" -d "${destFolder}"`;
      
    await neu.filesystem.createDirectory(destFolder).catch(() => {});
    
    const execRes = await neu.os.execCommand(cmd);
    if (execRes.exitCode !== 0) {
      throw new Error(`Native extract failed: ${execRes.stdErr || "Unknown error"}`);
    }
  }

  onEvent(eventName: string, listener: (data: any) => void): () => void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName)!.add(listener);

    return () => {
      this.eventListeners.get(eventName)?.delete(listener);
    };
  }

  emitLocalEvent(eventName: string, data: any): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }
}
