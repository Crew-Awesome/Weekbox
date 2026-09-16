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

  downloadMod = (...args: Parameters<WebMods["downloadMod"]>) => this.mods.downloadMod(...args);
  registerInstalledMod = (...args: Parameters<WebMods["registerInstalledMod"]>) => this.mods.registerInstalledMod(...args);
  isModInstalled = (...args: Parameters<WebMods["isModInstalled"]>) => this.mods.isModInstalled(...args);
  getInstalledMod = (...args: Parameters<WebMods["getInstalledMod"]>) => this.mods.getInstalledMod(...args);
  getInstalledMods = (...args: Parameters<WebMods["getInstalledMods"]>) => this.mods.getInstalledMods(...args);
  uninstallMod = (...args: Parameters<WebMods["uninstallMod"]>) => this.mods.uninstallMod(...args);
  openModFolder = (...args: Parameters<WebMods["openModFolder"]>) => this.mods.openModFolder(...args);
  setModFavorite = (...args: Parameters<WebMods["setModFavorite"]>) => this.mods.setModFavorite(...args);
  updateInstalledMod = (...args: Parameters<WebMods["updateInstalledMod"]>) => this.mods.updateInstalledMod(...args);
  remapInstalledModPaths = (...args: Parameters<WebMods["remapInstalledModPaths"]>) => this.mods.remapInstalledModPaths(...args);

  downloadEngine = (...args: Parameters<WebEngines["downloadEngine"]>) => this.engines.downloadEngine(...args);
  isEngineInstalled = (...args: Parameters<WebEngines["isEngineInstalled"]>) => this.engines.isEngineInstalled(...args);
  openEngineFolder = (...args: Parameters<WebEngines["openEngineFolder"]>) => this.engines.openEngineFolder(...args);
  getInstalledEngines = (...args: Parameters<WebEngines["getInstalledEngines"]>) => this.engines.getInstalledEngines(...args);
  registerInstalledEngine = (...args: Parameters<WebEngines["registerInstalledEngine"]>) => this.engines.registerInstalledEngine(...args);
  uninstallEngine = (...args: Parameters<WebEngines["uninstallEngine"]>) => this.engines.uninstallEngine(...args);
  cleanupTempDownload = (...args: Parameters<WebEngines["cleanupTempDownload"]>) => this.engines.cleanupTempDownload(...args);

  launchExecutable = (...args: Parameters<WebProcess["launchExecutable"]>) => this.process.launchExecutable(...args);
  killProcess = (...args: Parameters<WebProcess["killProcess"]>) => this.process.killProcess(...args);
  isAnyProcessRunning = () => this.process.isAnyProcessRunning();
  isInstanceRunning = (...args: Parameters<WebProcess["isInstanceRunning"]>) => this.process.isInstanceRunning(...args);

  showFolderDialog = (...args: Parameters<WebStorage["showFolderDialog"]>) => this.storage.showFolderDialog(...args);
  getModsPath = () => this.storage.getModsPath();
  getEnginesPath = () => this.storage.getEnginesPath();
  getDefaultPaths = () => this.storage.getDefaultPaths();
  validateStorageFolder = (...args: Parameters<WebStorage["validateStorageFolder"]>) => this.storage.validateStorageFolder(...args);
  inspectStorage = (...args: Parameters<WebStorage["inspectStorage"]>) => this.storage.inspectStorage(...args);
  migrateStorage = (...args: Parameters<WebStorage["migrateStorage"]>) => this.storage.migrateStorage(...args);
  isMigrationInProgress = () => this.storage.isMigrationInProgress();
  setMigrationInProgress = (inProgress: boolean) => this.storage.setMigrationInProgress(inProgress);

  getSettings = () => this.settings.getSettings();
  saveSettings = (...args: Parameters<WebSettings["saveSettings"]>) => this.settings.saveSettings(...args);
}
