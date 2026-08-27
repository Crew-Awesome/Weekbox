import type { BackendOperation, BackendResult } from "../backend/types";
import type { IPlatformBridge, PlatformType } from "./types";
import neuConfig from "../../../../neutralino.config.json";

/**
 * Platform adapter for Desktop environments (Neutralinojs + Node.js Extension).
 */
export class DesktopAdapter implements IPlatformBridge {
  readonly platformName: PlatformType = "desktop";
  private _isReady: boolean = false;
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  get isReady(): boolean {
    return this._isReady;
  }

  initialize(): void {
    const neutralino = window.Neutralino;
    const NodeExt = window.NodeExtension;

    if (neutralino && NodeExt) {
      neutralino.init();
      window.NODE = new NodeExt(true);

      neutralino.events.on("pingResult", (event: { detail: any }) => {
        this.emitLocalEvent("pingResult", event.detail);
      });

      neutralino.events.on("newInstance", (event: any) => {
        console.log("RECEIVED NEW INSTANCE NATIVELY:", event);
        console.log("DETAIL IS:", event?.detail);
        this.emitLocalEvent("newInstance", event);
      });

      neutralino.events.on("deeplinkArgs", (event: any) => {
        this.emitLocalEvent("deeplinkArgs", event);
      });

      neutralino.events.on("ready", () => {
        this._isReady = true;
        this.emitLocalEvent("ready", true);

        // Start heartbeat to keep the Node backend alive
        setInterval(() => {
          this.call("system.ping" as any).catch(() => {});
        }, 5000);
      });
    }
  }

  async getVersion(): Promise<string> {
    return neuConfig.version || "1.0.0";
  }

  call<Operation extends BackendOperation>(
    operation: Operation,
    params?: unknown,
  ): Promise<BackendResult<Operation>> {
    if (!window.NODE?.call) {
      return Promise.reject(new Error("The Node backend is not available."));
    }
    return window.NODE.call<BackendResult<Operation>>(operation, params);
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
