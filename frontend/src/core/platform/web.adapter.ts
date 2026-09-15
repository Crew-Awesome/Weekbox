import type { BackendOperation, BackendResult } from "../backend/types";
import type { IPlatformBridge, PlatformType, DownloadProgressCallback } from "./types";
import { useStorageMigrationStore } from "../../store/storage-migration-store";

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
    return "1.0.0-web";
  }

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

  async downloadMod(url: string, modId?: string, modName?: string, _onProgress?: DownloadProgressCallback, _signal?: AbortSignal): Promise<void> {
    const a = document.createElement("a");
    a.href = url;
    a.download = `mod_${modId || Date.now()}_${modName || "unknown"}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async openUrl(url: string): Promise<void> {
    window.open(url, "_blank");
  }

  async registerInstalledMod(modData: any): Promise<void> {
    try {
      const list = await this.getInstalledMods();
      const updatedInstalledAt = modData.installedAt || Date.now();
      const entry = {
        installed: true,
        ...modData,
        installedAt: updatedInstalledAt,
      };
      const idx = list.findIndex((m) => String(m.id) === String(modData.id));
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...entry, installedAt: updatedInstalledAt };
      } else {
        list.push(entry);
      }
      localStorage.setItem("wb_installed_mods", JSON.stringify(list));
      const savedEntry = idx >= 0 ? list[idx] : entry;
      this.emitLocalEvent("mods:changed", { action: "installed", mod: savedEntry });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("wb:mods-changed", { detail: { action: "installed", mod: savedEntry } })
        );
      }
    } catch (e) {
      console.warn("Registered installed mod (Web error):", e);
    }
  }

  async isModInstalled(modId: string): Promise<boolean> {
    const list = await this.getInstalledMods();
    return list.some((m) => String(m.id) === String(modId));
  }

  async getInstalledMod(modId: string): Promise<any | null> {
    const list = await this.getInstalledMods();
    return list.find((m) => String(m.id) === String(modId)) || null;
  }

  async getInstalledMods(): Promise<any[]> {
    try {
      const raw = localStorage.getItem("wb_installed_mods");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async uninstallMod(modId: string): Promise<void> {
    if (useStorageMigrationStore.getState().isMigrating) {
      throw new Error("Cannot uninstall while storage migration is in progress. Please wait for the migration to complete.");
    }
    try {
      const list = await this.getInstalledMods();
      const filtered = list.filter((m) => String(m.id) !== String(modId));
      localStorage.setItem("wb_installed_mods", JSON.stringify(filtered));
      this.emitLocalEvent("mods:changed", { action: "uninstalled", modId });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("wb:mods-changed", { detail: { action: "uninstalled", modId } })
        );
      }
    } catch (e) {
      console.warn("Uninstall mod (Web error):", e);
    }
  }

  /**
   * Opens the mod folder in web environment (no-op).
   */
  async openModFolder(_modId: string, _modName?: string): Promise<void> {}

  /**
   * Updates the favorite flag in the web installed mods storage.
   */
  async setModFavorite(modId: string, isFavorite: boolean): Promise<void> {
    try {
      const list = await this.getInstalledMods();
      const idx = list.findIndex((m) => String(m.id) === String(modId));
      if (idx >= 0) {
        list[idx] = { ...list[idx], favorite: isFavorite };
        localStorage.setItem("wb_installed_mods", JSON.stringify(list));
      }
    } catch (e) {
      console.warn("Set mod favorite (Web error):", e);
    }
  }

  /**
   * Updates arbitrary properties (name, description, engine, etc.) of an installed mod in web storage.
   * @param {string} modId - The ID of the mod.
   * @param {Record<string, any>} updates - Key-value pairs to update.
   * @returns {Promise<any | null>} The updated mod entry.
   */
  async updateInstalledMod(modId: string, updates: Record<string, any>): Promise<any | null> {
    try {
      const list = await this.getInstalledMods();
      const idx = list.findIndex((m) => String(m.id) === String(modId));
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem("wb_installed_mods", JSON.stringify(list));
        this.emitLocalEvent("mods:changed", { action: "updated", mod: list[idx] });
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("wb:mods-changed", {
              detail: { action: "updated", mod: list[idx] },
            })
          );
        }
        return list[idx];
      }
    } catch (e) {
      console.warn("Update installed mod (Web error):", e);
    }
    return null;
  }

  /**
   * Stub for downloading engine in web environment.
   */
  async downloadEngine(
    url: string,
    _engineId: string,
    _version: string,
    _onProgress?: DownloadProgressCallback,
    _signal?: AbortSignal
  ): Promise<void> {
    window.open(url, "_blank");
  }

  /**
   * Stub for checking if an engine is installed in web environment.
   */
  async isEngineInstalled(_engineId: string, _version: string): Promise<boolean> {
    return false;
  }

  /**
   * Stub for opening engine directory in web environment.
   */
  async openEngineFolder(_engineId: string, _version: string): Promise<void> {}

  /**
   * Retrieves installed engines registry from localStorage.
   */
  async getInstalledEngines(): Promise<Record<string, Record<string, any>>> {
    try {
      const raw = localStorage.getItem("wb_installed_engines");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /**
   * Saves installed engine registry entry to localStorage.
   */
  async registerInstalledEngine(
    engineId: string,
    version: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const registry = await this.getInstalledEngines();
    if (!registry[engineId]) registry[engineId] = {};
    registry[engineId][version] = {
      engineId,
      version,
      installedAt: metadata?.installedAt || new Date().toISOString(),
      ...metadata,
    };
    localStorage.setItem("wb_installed_engines", JSON.stringify(registry));
    this.emitLocalEvent("engines:changed", { action: "installed", engine: registry[engineId][version] });
  }

  /**
   * Removes installed engine registry entry from localStorage.
   */
  async uninstallEngine(engineId: string, version: string): Promise<void> {
    if (useStorageMigrationStore.getState().isMigrating) {
      throw new Error("Cannot uninstall while storage migration is in progress. Please wait for the migration to complete.");
    }
    const registry = await this.getInstalledEngines();
    if (registry[engineId] && registry[engineId][version]) {
      delete registry[engineId][version];
      if (Object.keys(registry[engineId]).length === 0) {
        delete registry[engineId];
      }
      localStorage.setItem("wb_installed_engines", JSON.stringify(registry));
      this.emitLocalEvent("engines:changed", { action: "uninstalled", engineId, version });
    }
  }

  /**
   * Stub for launching game executable in web environment.
   */
  async launchExecutable(
    _folderPath: string,
    _options?: { executableName?: string; instanceId?: string; args?: string[]; env?: Record<string, string>; modFolderPath?: string; modFolderPaths?: string[] }
  ): Promise<{ ok: boolean; pid?: number; executablePath?: string; instanceId?: string; error?: string }> {
    return { ok: false, error: "Game launching is only supported in desktop mode." };
  }

  async killProcess(_instanceId: string): Promise<{ ok: boolean; error?: string }> {
    return { ok: true };
  }

  async showFolderDialog(_title: string, _defaultPath?: string): Promise<string | null> {
    return null;
  }

  async getSettings(): Promise<Record<string, any>> {
    try {
      const raw = localStorage.getItem("wb_app_settings");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  async saveSettings(settings: Record<string, any>): Promise<void> {
    try {
      localStorage.setItem("wb_app_settings", JSON.stringify(settings));
    } catch {}
  }

  async getModsPath(): Promise<string> {
    return "/virtual/mods";
  }

  async getEnginesPath(): Promise<string> {
    return "/virtual/engines";
  }

  async getDefaultPaths(): Promise<{ basePath: string; defaultModsPath: string; defaultEnginesPath: string }> {
    return {
      basePath: "/virtual",
      defaultModsPath: "/virtual/mods",
      defaultEnginesPath: "/virtual/engines",
    };
  }

  async inspectStorage(_folderPath: string): Promise<{
    count: number;
    totalBytes: number;
    formattedSize: string;
    estimatedTime: string;
    items?: Array<{ name: string; bytes: number; formattedSize: string }>;
  }> {
    return { count: 0, totalBytes: 0, formattedSize: "0 B", estimatedTime: "< 1s", items: [] };
  }

  async validateStorageFolder(
    _targetPath: string,
    _type: "mods" | "engines"
  ): Promise<{ valid: boolean; reason?: string }> {
    return { valid: true };
  }

  async migrateStorage(
    _sourcePath: string,
    _targetPath: string,
    _type: "mods" | "engines",
    _onProgress?: any,
    _selectedItemNames?: string[]
  ): Promise<{ ok: boolean; count: number }> {
    return { ok: true, count: 0 };
  }

  async isAnyProcessRunning(): Promise<boolean> {
    return false;
  }

  async isInstanceRunning(_instanceId: string): Promise<boolean> {
    return false;
  }
}
