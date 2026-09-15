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

export * from "./transport";
export * from "./lifecycle";
export * from "./settings";
export * from "./storage";
export * from "./process";
export * from "./mods";
export * from "./engines";

/**
 * Desktop Platform Adapter API (Neutralinojs + Node.js extension).
 * Composes specialized modules fulfilling SRP, OCP, LSP, ISP, and DIP.
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

  constructor() {
    this.transport = new DesktopTransport();
    this.settings = new DesktopSettings(this.transport);
    this.storage = new DesktopStorage(this.transport, this.settings);
    this.process = new DesktopProcess(this.transport);
    this.mods = new DesktopMods(this.transport, this.storage);
    this.engines = new DesktopEngines(this.transport, this.storage);

    this.lifecycle = new DesktopLifecycle(
      this.transport,
      () => this.process.isAnyProcessRunning(),
      () => this.settings.getSettings()
    );
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

  downloadMod = (...args: Parameters<DesktopMods["downloadMod"]>) => this.mods.downloadMod(...args);
  registerInstalledMod = (...args: Parameters<DesktopMods["registerInstalledMod"]>) => this.mods.registerInstalledMod(...args);
  isModInstalled = (...args: Parameters<DesktopMods["isModInstalled"]>) => this.mods.isModInstalled(...args);
  getInstalledMod = (...args: Parameters<DesktopMods["getInstalledMod"]>) => this.mods.getInstalledMod(...args);
  getInstalledMods = (...args: Parameters<DesktopMods["getInstalledMods"]>) => this.mods.getInstalledMods(...args);
  uninstallMod = (...args: Parameters<DesktopMods["uninstallMod"]>) => this.mods.uninstallMod(...args);
  openModFolder = (...args: Parameters<DesktopMods["openModFolder"]>) => this.mods.openModFolder(...args);
  setModFavorite = (...args: Parameters<DesktopMods["setModFavorite"]>) => this.mods.setModFavorite(...args);
  updateInstalledMod = (...args: Parameters<DesktopMods["updateInstalledMod"]>) => this.mods.updateInstalledMod(...args);

  downloadEngine = (...args: Parameters<DesktopEngines["downloadEngine"]>) => this.engines.downloadEngine(...args);
  isEngineInstalled = (...args: Parameters<DesktopEngines["isEngineInstalled"]>) => this.engines.isEngineInstalled(...args);
  openEngineFolder = (...args: Parameters<DesktopEngines["openEngineFolder"]>) => this.engines.openEngineFolder(...args);
  getInstalledEngines = (...args: Parameters<DesktopEngines["getInstalledEngines"]>) => this.engines.getInstalledEngines(...args);
  registerInstalledEngine = (...args: Parameters<DesktopEngines["registerInstalledEngine"]>) => this.engines.registerInstalledEngine(...args);
  uninstallEngine = (...args: Parameters<DesktopEngines["uninstallEngine"]>) => this.engines.uninstallEngine(...args);

  launchExecutable = (...args: Parameters<DesktopProcess["launchExecutable"]>) => this.process.launchExecutable(...args);
  killProcess = (...args: Parameters<DesktopProcess["killProcess"]>) => this.process.killProcess(...args);
  isAnyProcessRunning = () => this.process.isAnyProcessRunning();
  isInstanceRunning = (...args: Parameters<DesktopProcess["isInstanceRunning"]>) => this.process.isInstanceRunning(...args);

  showFolderDialog = (...args: Parameters<DesktopStorage["showFolderDialog"]>) => this.storage.showFolderDialog(...args);
  getModsPath = () => this.storage.getModsPath();
  getEnginesPath = () => this.storage.getEnginesPath();
  getDefaultPaths = () => this.storage.getDefaultPaths();
  validateStorageFolder = (...args: Parameters<DesktopStorage["validateStorageFolder"]>) => this.storage.validateStorageFolder(...args);
  inspectStorage = (...args: Parameters<DesktopStorage["inspectStorage"]>) => this.storage.inspectStorage(...args);
  migrateStorage = (...args: Parameters<DesktopStorage["migrateStorage"]>) => this.storage.migrateStorage(...args);
  isMigrationInProgress = () => this.storage.isMigrationInProgress();
  setMigrationInProgress = (inProgress: boolean) => this.storage.setMigrationInProgress(inProgress);

  getSettings = () => this.settings.getSettings();
  saveSettings = (...args: Parameters<DesktopSettings["saveSettings"]>) => this.settings.saveSettings(...args);
}
