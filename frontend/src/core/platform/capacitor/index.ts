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

  call<Operation extends BackendOperation>(
    operation: Operation,
    params?: unknown,
    signal?: AbortSignal
  ): Promise<BackendResult<Operation>> {
    return this.transport.call(operation, params, signal);
  }

  onEvent(eventName: string, handler: (data: any) => void): () => void {
    return this.transport.onEvent(eventName, handler);
  }

  emitLocalEvent(eventName: string, data?: any): void {
    this.transport.emitLocalEvent(eventName, data);
  }

  async openUrl(url: string): Promise<void> {
    if (typeof window !== "undefined") {
      window.open(url, "_system");
    }
  }

  // Domain delegates (ISP)
  downloadMod = (...args: Parameters<CapacitorMods["downloadMod"]>) => this.mods.downloadMod(...args);
  registerInstalledMod = (...args: Parameters<CapacitorMods["registerInstalledMod"]>) => this.mods.registerInstalledMod(...args);
  isModInstalled = (...args: Parameters<CapacitorMods["isModInstalled"]>) => this.mods.isModInstalled(...args);
  getInstalledMod = (...args: Parameters<CapacitorMods["getInstalledMod"]>) => this.mods.getInstalledMod(...args);
  getInstalledMods = (...args: Parameters<CapacitorMods["getInstalledMods"]>) => this.mods.getInstalledMods(...args);
  uninstallMod = (...args: Parameters<CapacitorMods["uninstallMod"]>) => this.mods.uninstallMod(...args);
  openModFolder = (...args: Parameters<CapacitorMods["openModFolder"]>) => this.mods.openModFolder(...args);
  setModFavorite = (...args: Parameters<CapacitorMods["setModFavorite"]>) => this.mods.setModFavorite(...args);
  updateInstalledMod = (...args: Parameters<CapacitorMods["updateInstalledMod"]>) => this.mods.updateInstalledMod(...args);
  remapInstalledModPaths = (...args: Parameters<CapacitorMods["remapInstalledModPaths"]>) => this.mods.remapInstalledModPaths(...args);

  downloadEngine = (...args: Parameters<CapacitorEngines["downloadEngine"]>) => this.engines.downloadEngine(...args);
  isEngineInstalled = (...args: Parameters<CapacitorEngines["isEngineInstalled"]>) => this.engines.isEngineInstalled(...args);
  openEngineFolder = (...args: Parameters<CapacitorEngines["openEngineFolder"]>) => this.engines.openEngineFolder(...args);
  getInstalledEngines = (...args: Parameters<CapacitorEngines["getInstalledEngines"]>) => this.engines.getInstalledEngines(...args);
  registerInstalledEngine = (...args: Parameters<CapacitorEngines["registerInstalledEngine"]>) => this.engines.registerInstalledEngine(...args);
  uninstallEngine = (...args: Parameters<CapacitorEngines["uninstallEngine"]>) => this.engines.uninstallEngine(...args);
  cleanupTempDownload = (...args: Parameters<CapacitorEngines["cleanupTempDownload"]>) => this.engines.cleanupTempDownload(...args);

  launchExecutable = (...args: Parameters<CapacitorProcess["launchExecutable"]>) => this.process.launchExecutable(...args);
  killProcess = (...args: Parameters<CapacitorProcess["killProcess"]>) => this.process.killProcess(...args);
  isAnyProcessRunning = () => this.process.isAnyProcessRunning();
  isInstanceRunning = (...args: Parameters<CapacitorProcess["isInstanceRunning"]>) => this.process.isInstanceRunning(...args);

  showFolderDialog = (...args: Parameters<CapacitorStorage["showFolderDialog"]>) => this.storage.showFolderDialog(...args);
  getModsPath = () => this.storage.getModsPath();
  getEnginesPath = () => this.storage.getEnginesPath();
  getDefaultPaths = () => this.storage.getDefaultPaths();
  validateStorageFolder = (...args: Parameters<CapacitorStorage["validateStorageFolder"]>) => this.storage.validateStorageFolder(...args);
  inspectStorage = (...args: Parameters<CapacitorStorage["inspectStorage"]>) => this.storage.inspectStorage(...args);
  migrateStorage = (...args: Parameters<CapacitorStorage["migrateStorage"]>) => this.storage.migrateStorage(...args);
  isMigrationInProgress = () => this.storage.isMigrationInProgress();
  setMigrationInProgress = (inProgress: boolean) => this.storage.setMigrationInProgress(inProgress);

  getSettings = () => this.settings.getSettings();
  saveSettings = (...args: Parameters<CapacitorSettings["saveSettings"]>) => this.settings.saveSettings(...args);
}
