import type { BackendOperation, BackendResult } from "../backend/types";
import type { IPlatformBridge, PlatformType } from "./types";

/**
 * Platform adapter for the Web / Standard Browser environment.
 */
export class WebAdapter implements IPlatformBridge {
  readonly platformName: PlatformType = "web";
  private _isReady: boolean = true;
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  get isReady(): boolean {
    return this._isReady;
  }

  initialize(): void {
    setTimeout(() => {
      this.emitLocalEvent("ready", true);
    }, 50);
  }

  async getVersion(): Promise<string> {
    return "1.0.0 (Web)";
  }

  async call<Operation extends BackendOperation>(
    operation: Operation,
    data?: any
  ): Promise<BackendResult<Operation>> {
    // Intercept HTTP operations and perform them natively in the browser via fetch
    if (operation === "http.fetchJson") {
      const response = await fetch(data.url, data.options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return (await response.json()) as BackendResult<Operation>;
    }
    
    if (operation === "http.fetchText") {
      const response = await fetch(data.url, data.options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return (await response.text()) as BackendResult<Operation>;
    }

    return Promise.reject(
      new Error(`Backend operation '${operation}' requires the desktop platform and cannot be run in the browser :(`),
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

  private emitLocalEvent(eventName: string, data: any): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }
}
