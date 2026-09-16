import { describe, it, expect } from "vitest";

const storageStore = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => storageStore.get(key) ?? null,
  setItem: (key: string, val: string) => { storageStore.set(key, String(val)); },
  removeItem: (key: string) => { storageStore.delete(key); },
  clear: () => { storageStore.clear(); },
};

Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

if (typeof (globalThis as any).window === "undefined") {
  Object.defineProperty(globalThis, "window", {
    value: globalThis,
    writable: true,
    configurable: true,
  });
}
(globalThis as any).window.localStorage = mockLocalStorage;

import Core, {
  createServiceContainer,
  WebAdapter,
  DesktopAdapter,
  CapacitorAdapter,
  ModService,
  EngineService,
  ProcessService,
  StorageService,
  SettingsService,
} from "@core";
import { taskMonitor } from "../src/core/platform/task-monitor";
import { useSettingsStore } from "../src/store/settings-store";

describe("SOLID Architecture Verification", () => {
  describe("ISP (Interface Segregation Principle)", () => {
    it("exposes granular domain services through Core and container", () => {
      expect(Core.services.mods).toBeDefined();
      expect(Core.services.storage).toBeDefined();
      expect(Core.services.process).toBeDefined();
      expect(Core.services.settings).toBeDefined();
      expect(Core.services.engines).toBeDefined();

      expect(typeof Core.services.mods.downloadMod).toBe("function");
      expect(typeof Core.services.storage.getModsPath).toBe("function");
      expect(typeof Core.services.process.launchExecutable).toBe("function");
    });

    it("allows consumers to depend only on specific service contracts", () => {
      const customModService = new ModService();
      expect(typeof customModService.downloadMod).toBe("function");
      expect(typeof customModService.getInstalledMods).toBe("function");
    });
  });

  describe("LSP (Liskov Substitution Principle)", () => {
    it("provides explicit capabilities for Web, Desktop, and Capacitor adapters", () => {
      const web = new WebAdapter();
      const desktop = new DesktopAdapter();
      const capacitor = new CapacitorAdapter();

      expect(web.capabilities.canLaunchProcesses).toBe(false);
      expect(web.capabilities.canAccessNativeFileSystem).toBe(false);

      expect(desktop.capabilities.canLaunchProcesses).toBe(true);
      expect(desktop.capabilities.canAccessNativeFileSystem).toBe(true);

      expect(capacitor.capabilities.canLaunchProcesses).toBe(false);
      expect(capacitor.platformName).toBe("capacitor");
    });

    it("WebAdapter handles process launching gracefully without throwing unhandled exceptions", async () => {
      const web = new WebAdapter();
      const result = await web.launchExecutable("/fake/path");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("not supported in the web environment");
    });

    it("CapacitorAdapter handles process launching gracefully without throwing unhandled exceptions", async () => {
      const capacitor = new CapacitorAdapter();
      const result = await capacitor.launchExecutable("/fake/path");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("not supported in the mobile/Capacitor environment");
    });

    it("WebAdapter handles folder opening as a safe no-op", async () => {
      const web = new WebAdapter();
      await expect(web.openModFolder("123")).resolves.toBeUndefined();
      await expect(web.openEngineFolder("vslice", "1.0")).resolves.toBeUndefined();
    });
  });

  describe("DIP (Dependency Inversion Principle)", () => {
    it("creates an isolated service container with injected bridge", () => {
      const customBridge = new WebAdapter();
      const customContainer = createServiceContainer(customBridge);

      expect(customContainer.platform).toBe(customBridge);
      expect(customContainer.mods).toBeDefined();
      expect(customContainer.engines).toBeDefined();
    });

    it("allows substituting mock providers in domain services", async () => {
      const mockStorageProvider = {
        showFolderDialog: async () => "/custom/path",
        getModsPath: async () => "/custom/mods",
        getEnginesPath: async () => "/custom/engines",
        getDefaultPaths: async () => ({ basePath: "/b", defaultModsPath: "/m", defaultEnginesPath: "/e" }),
        validateStorageFolder: async () => ({ valid: true }),
        inspectStorage: async () => ({ count: 0, totalBytes: 0, formattedSize: "0 B", estimatedTime: "0s" }),
        migrateStorage: async () => ({ ok: true, count: 0 }),
        isMigrationInProgress: () => false,
        setMigrationInProgress: () => {},
      };

      const storageService = new StorageService(mockStorageProvider);
      expect(await storageService.getModsPath()).toBe("/custom/mods");
      expect(await storageService.showFolderDialog("Pick")).toBe("/custom/path");
    });

    it("manages migration lock internally without coupling to UI store", () => {
      const web = new WebAdapter();
      expect(web.isMigrationInProgress()).toBe(false);
      web.setMigrationInProgress(true);
      expect(web.isMigrationInProgress()).toBe(true);
      web.setMigrationInProgress(false);
      expect(web.isMigrationInProgress()).toBe(false);
    });
  });

  describe("SRP (Single Responsibility Principle)", () => {
    it("domain services delegate to focused providers", () => {
      const modService = new ModService();
      const engineService = new EngineService();
      const processService = new ProcessService();
      const storageService = new StorageService();
      const settingsService = new SettingsService();

      expect(modService).toBeInstanceOf(ModService);
      expect(engineService).toBeInstanceOf(EngineService);
      expect(processService).toBeInstanceOf(ProcessService);
      expect(storageService).toBeInstanceOf(StorageService);
      expect(settingsService).toBeInstanceOf(SettingsService);
    });

    it("task monitor tracks active background tasks without window monkey-patching", () => {
      expect(taskMonitor).toBeDefined();
      expect(Core.container.taskMonitor).toBeDefined();
      expect(taskMonitor.hasActiveTasks()).toBe(false);

      const unregister = taskMonitor.registerActiveTaskChecker(() => true);
      expect(taskMonitor.hasActiveTasks()).toBe(true);

      unregister();
      expect(taskMonitor.hasActiveTasks()).toBe(false);
    });

    it("segregates window and notification contracts on the platform bridge", () => {
      const web = new WebAdapter();
      expect(web.window).toBeDefined();
      expect(web.notification).toBeDefined();
      expect(typeof web.window.minimize).toBe("function");
      expect(typeof web.window.maximize).toBe("function");
      expect(typeof web.window.close).toBe("function");
      expect(typeof web.notification.showNotification).toBe("function");
    });

    it("persists autoCheckUpdates setting to localStorage and settings.json sync", async () => {
      const { updateSetting, autoCheckUpdates } = useSettingsStore.getState();
      expect(typeof autoCheckUpdates).toBe("boolean");

      await updateSetting("autoCheckUpdates", false);
      expect(useSettingsStore.getState().autoCheckUpdates).toBe(false);

      const storedRaw = localStorage.getItem("wb_app_settings");
      expect(storedRaw).not.toBeNull();
      const parsed = JSON.parse(storedRaw || "{}");
      expect(parsed.autoCheckUpdates).toBe(false);

      await updateSetting("autoCheckUpdates", true);
      expect(useSettingsStore.getState().autoCheckUpdates).toBe(true);
      const parsedUpdated = JSON.parse(localStorage.getItem("wb_app_settings") || "{}");
      expect(parsedUpdated.autoCheckUpdates).toBe(true);
    });

    it("isolates mod metadata persistence in DesktopModRegistry (SRP)", () => {
      const desktop = new DesktopAdapter();
      expect(desktop.mods.registry).toBeDefined();
      expect(typeof desktop.mods.registry.registerInstalledMod).toBe("function");
      expect(typeof desktop.mods.registry.getInstalledMods).toBe("function");
      expect(typeof desktop.mods.registry.unregisterInstalledMod).toBe("function");
    });

    it("domain services are wired to service container for stores consumption (DIP)", () => {
      expect(Core.services.mods).toBeDefined();
      expect(Core.services.storage).toBeDefined();
      expect(Core.services.engines).toBeDefined();
      expect(Core.services.settings).toBeDefined();
      expect(Core.services.process).toBeDefined();

      expect(typeof Core.services.mods.getInstalledMods).toBe("function");
      expect(typeof Core.services.storage.getDefaultPaths).toBe("function");
      expect(typeof Core.services.settings.getSettings).toBe("function");
    });
  });
});
