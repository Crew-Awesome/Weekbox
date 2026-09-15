import type { BackendOperation, BackendResult } from "../../backend/types";
import type { IPlatformTransport, IPlatformEvents } from "@contracts";

/**
 * Low-level IPC transport and event bus for Desktop (Neutralino + Node.js extension).
 */
export class DesktopTransport implements IPlatformTransport, IPlatformEvents {
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  call<Operation extends BackendOperation>(
    operation: Operation,
    params?: unknown,
    signal?: AbortSignal,
    timeoutMs?: number
  ): Promise<BackendResult<Operation>> {
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
