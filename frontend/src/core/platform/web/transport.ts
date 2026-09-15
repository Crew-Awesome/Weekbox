import type { BackendOperation, BackendResult } from "../../backend/types";
import type { IPlatformTransport, IPlatformEvents } from "@contracts";

/**
 * Web transport and local event emitter for browser environment.
 */
export class WebTransport implements IPlatformTransport, IPlatformEvents {
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  async call<Operation extends BackendOperation>(
    operation: Operation,
    data: any = {},
    signal?: AbortSignal
  ): Promise<BackendResult<Operation>> {
    if (operation === "http.fetchJson") {
      const response = await fetch(data.url, { ...data.options, signal });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return (await response.json()) as BackendResult<Operation>;
    }

    if (operation === "http.fetchText") {
      const response = await fetch(data.url, { ...data.options, signal });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return (await response.text()) as BackendResult<Operation>;
    }

    return Promise.reject(
      new Error(`Backend operation '${operation}' requires the desktop platform and cannot be run in the browser :(`)
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
