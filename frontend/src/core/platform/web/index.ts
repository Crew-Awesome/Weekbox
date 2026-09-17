import type { PlatformType, PlatformCapabilities } from "@contracts";
import type { IPlatformBridge } from "../types";
import type { BackendOperation, BackendResult } from "../../backend/types";
import { WebTransport } from "./transport";
import { WebLifecycle } from "./lifecycle";
import { WebSettings } from "./settings";
import { WebStorage } from "./storage";
import { WebProcess } from "./process";
import { WebMods } from "./mods";
import { WebEngines } from "./engines";
import { WebWindow } from "./window";
import { WebNotification } from "./notification";

export * from "./transport";
export * from "./lifecycle";
export * from "./settings";
export * from "./storage";
export * from "./process";
export * from "./mods";
export * from "./engines";
export * from "./window";
export * from "./notification";

/**
 * Web Platform Adapter API (Browser environment).
 * Composes specialized modules fulfilling SRP, OCP, LSP, ISP, and DIP.
 * Uses dynamic proxy delegation so new service methods are automatically supported.
 */
export class WebAdapter implements IPlatformBridge {
  readonly platformName: PlatformType = "web";

  readonly transport: WebTransport;
  readonly lifecycle: WebLifecycle;
  readonly settings: WebSettings;
  readonly storage: WebStorage;
  readonly process: WebProcess;
  readonly mods: WebMods;
  readonly engines: WebEngines;
  readonly window: WebWindow;
  readonly notification: WebNotification;

  [key: string]: any;

  constructor() {
    this.transport = new WebTransport();
    this.lifecycle = new WebLifecycle(this.transport);
    this.settings = new WebSettings();
    this.storage = new WebStorage();
    this.process = new WebProcess();
    this.mods = new WebMods(this.transport, this.storage);
    this.engines = new WebEngines(this.transport, this.storage);
    this.window = new WebWindow();
    this.notification = new WebNotification();

    const delegateTargets = [
      this.mods,
      this.engines,
      this.storage,
      this.process,
      this.settings,
      this.window,
      this.notification,
      this.lifecycle,
      this.transport,
    ];

    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) {
          const val = (target as any)[prop];
          return typeof val === "function" ? (...args: any[]) => val.apply(target, args) : val;
        }
        for (const delegate of delegateTargets) {
          if (delegate && typeof (delegate as any)[prop] !== "undefined") {
            const val = (delegate as any)[prop];
            return typeof val === "function" ? (...args: any[]) => val.apply(delegate, args) : val;
          }
        }
        return undefined;
      },
      has(target, prop) {
        if (prop in target) return true;
        return delegateTargets.some((d) => d && prop in d);
      },
    });
  }

  get isReady(): boolean {
    return this.lifecycle.isReady;
  }

  get capabilities(): PlatformCapabilities {
    return this.lifecycle.capabilities;
  }

  initialize(): void {
    this.lifecycle.initialize();
  }

  getVersion(): Promise<string> {
    return this.lifecycle.getVersion();
  }

  openUrl(url: string): Promise<void> {
    return this.lifecycle.openUrl(url);
  }

  call<Operation extends BackendOperation>(
    operation: Operation,
    params?: unknown,
    signal?: AbortSignal
  ): Promise<BackendResult<Operation>> {
    return this.transport.call(operation, params, signal);
  }

  onEvent(eventName: string, listener: (data: any) => void): () => void {
    return this.transport.onEvent(eventName, listener);
  }

  emitLocalEvent(eventName: string, data: any): void {
    this.transport.emitLocalEvent(eventName, data);
  }
}
