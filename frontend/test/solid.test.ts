import { describe, it, expect } from "vitest";
import Core, {
  createServiceContainer,
  WebAdapter,
  DesktopAdapter,
  ModService,
  EngineService,
  ProcessService,
  StorageService,
  SettingsService,
} from "@core";

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
    it("provides explicit capabilities for Web and Desktop adapters", () => {
      const web = new WebAdapter();
      const desktop = new DesktopAdapter();

      expect(web.capabilities.canLaunchProcesses).toBe(false);
      expect(web.capabilities.canAccessNativeFileSystem).toBe(false);

      expect(desktop.capabilities.canLaunchProcesses).toBe(true);
      expect(desktop.capabilities.canAccessNativeFileSystem).toBe(true);
    });

    it("WebAdapter handles process launching gracefully without throwing unhandled exceptions", async () => {
      const web = new WebAdapter();
      const result = await web.launchExecutable("/fake/path");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("not supported in the web environment");
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
  });
});
