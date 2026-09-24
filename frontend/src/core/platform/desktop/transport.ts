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
      const timeout = timeoutMs ?? 8000;
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
      return Promise.reject(new Error("The Node backend is not available."));
    }
    const defaultTimeout =
      operation === "http.downloadToFile" ||
      operation === "fs.extractArchive" ||
      operation === "fs.flattenFolder"
        ? 0
        : 300000;

    return window.NODE.call<BackendResult<Operation>>(
      operation,
      params,
      timeoutMs ?? defaultTimeout,
      signal
    );
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
