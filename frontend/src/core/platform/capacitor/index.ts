import type { PlatformType, PlatformCapabilities } from "@contracts";
import type { IPlatformBridge } from "../types";
import type { BackendOperation, BackendResult } from "../../backend/types";
import { WebTransport } from "../web/transport";
import { CapacitorSettings } from "./settings";
import { CapacitorStorage } from "./storage";
import { CapacitorMods } from "./mods";
import { CapacitorEngines } from "./engines";
import { CapacitorLifecycle } from "./lifecycle";
import { CapacitorProcess } from "./process";
import { CapacitorWindow } from "./window";
import { CapacitorNotification } from "./notification";

export * from "./lifecycle";
export * from "./process";
export * from "./window";
export * from "./notification";
export * from "./storage";
export * from "./settings";
export * from "./mods";
export * from "./mod-registry";
export * from "./engines";
export * from "./app-launcher";
export * from "./json-storage";

/**
 * Mobile / Capacitor Platform Adapter API (Android & iOS).
 * Equivalent feature support to PC (with JSON persistence for mods and engines),
 * while respecting mobile sandboxing and excluding raw file relocation.
 * Uses dynamic proxy delegation (OCP) so that new service methods are automatically available.
 */
export class CapacitorAdapter implements IPlatformBridge {
  readonly platformName: PlatformType = "capacitor";

  readonly transport: WebTransport;
  readonly lifecycle: CapacitorLifecycle;
  readonly settings: CapacitorSettings;
  readonly storage: CapacitorStorage;
  readonly process: CapacitorProcess;
  readonly mods: CapacitorMods;
  readonly engines: CapacitorEngines;
  readonly window: CapacitorWindow;
  readonly notification: CapacitorNotification;

  [key: string]: any;

  constructor() {
    this.transport = new WebTransport();
    this.lifecycle = new CapacitorLifecycle(this.transport);
    this.settings = new CapacitorSettings();
    this.storage = new CapacitorStorage();
    this.process = new CapacitorProcess();
    this.mods = new CapacitorMods(this.transport, this.storage);
    this.engines = new CapacitorEngines(this.transport);
    this.window = new CapacitorWindow();
    this.notification = new CapacitorNotification();

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
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
    return Promise.resolve();
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
