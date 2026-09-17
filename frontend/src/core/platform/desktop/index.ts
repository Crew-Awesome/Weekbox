import type { PlatformType, PlatformCapabilities } from "@contracts";
import type { IPlatformBridge } from "../types";
import type { BackendOperation, BackendResult } from "../../backend/types";
import { DesktopTransport } from "./transport";
import { DesktopLifecycle } from "./lifecycle";
import { DesktopSettings } from "./settings";
import { DesktopStorage } from "./storage";
import { DesktopProcess } from "./process";
import { DesktopMods } from "./mods";
import { DesktopEngines } from "./engines";
import { DesktopWindow } from "./window";
import { DesktopNotification } from "./notification";

export * from "./transport";
export * from "./lifecycle";
export * from "./settings";
export * from "./storage";
export * from "./process";
export * from "./mods";
export * from "./mod-registry";
export * from "./engines";
export * from "./window";
export * from "./notification";

/**
 * Desktop Platform Adapter API (Neutralinojs + Node.js extension).
 * Fully implements IPlatformBridge and utilizes dynamic proxy delegation (OCP)
 * so that any new service methods are automatically available without touching this adapter.
 */
export class DesktopAdapter implements IPlatformBridge {
  readonly platformName: PlatformType = "desktop";

  readonly transport: DesktopTransport;
  readonly lifecycle: DesktopLifecycle;
  readonly settings: DesktopSettings;
  readonly storage: DesktopStorage;
  readonly process: DesktopProcess;
  readonly mods: DesktopMods;
  readonly engines: DesktopEngines;
  readonly window: DesktopWindow;
  readonly notification: DesktopNotification;

  [key: string]: any;

  constructor() {
    this.transport = new DesktopTransport();
    this.settings = new DesktopSettings(this.transport);
    this.storage = new DesktopStorage(this.transport, this.settings);
    this.process = new DesktopProcess(this.transport);
    this.mods = new DesktopMods(this.transport, this.storage);
    this.engines = new DesktopEngines(this.transport, this.storage);
    this.window = new DesktopWindow(this.transport);
    this.notification = new DesktopNotification(this.transport);

    this.lifecycle = new DesktopLifecycle(
      this.transport,
      () => this.process.isAnyProcessRunning(),
      () => this.settings.getSettings()
    );

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
    signal?: AbortSignal,
    timeoutMs?: number
  ): Promise<BackendResult<Operation>> {
    return this.transport.call(operation, params, signal, timeoutMs);
  }

  onEvent(eventName: string, listener: (data: any) => void): () => void {
    return this.transport.onEvent(eventName, listener);
  }

  emitLocalEvent(eventName: string, data: any): void {
    this.transport.emitLocalEvent(eventName, data);
  }
}
