import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { CapacitorAdapter } from "../src/core/platform/capacitor";

describe("Capacitor Mobile Adapter Test Suite", () => {
  let adapter: CapacitorAdapter;

  beforeEach(() => {
    storageStore.clear();
    adapter = new CapacitorAdapter();
  });

  describe("Platform Identification & Capabilities", () => {
    it("identifies platform correctly as 'capacitor'", () => {
      expect(adapter.platformName).toBe("capacitor");
    });

    it("declares accurate mobile capabilities", () => {
      const { capabilities } = adapter;
      expect(capabilities.canLaunchProcesses).toBe(false);
      expect(capabilities.canAccessNativeFileSystem).toBe(false);
      expect(capabilities.canSendOSNotifications).toBe(true);
      expect(capabilities.canShowNativeDialogs).toBe(true);
      expect(capabilities.canManageWindow).toBe(false);
      expect(capabilities.canDownloadDirectStreams).toBe(false);
      expect(capabilities.canExtractArchives).toBe(false);
    });

    it("returns mobile platform version string", async () => {
      const version = await adapter.getVersion();
      expect(version).toMatch(/^3\.0\.0-capacitor-/);
    });

    it("reports ready status and emits ready event on initialization", async () => {
      expect(adapter.isReady).toBe(true);
      const readyHandler = vi.fn();
      adapter.onEvent("ready", readyHandler);
      adapter.initialize();
      await new Promise((resolve) => setTimeout(resolve, 80));
      expect(readyHandler).toHaveBeenCalledWith(true);
    });
  });

  describe("Process Handling (Safe Mobile Stubs)", () => {
    it("gracefully denies launchExecutable with descriptive error", async () => {
      const result = await adapter.launchExecutable("/path/to/game.exe", { args: ["--fullscreen"] });
      expect(result.ok).toBe(false);
      expect(typeof result.error).toBe("string");
      expect(result.error).toMatch(/not installed|not supported/i);
    });

    it("gracefully handles killProcess without throwing", async () => {
      const result = await adapter.killProcess("1234");
      expect(result.ok).toBe(true);
    });

    it("reports no running instances or processes", async () => {
      expect(await adapter.isAnyProcessRunning()).toBe(false);
      expect(await adapter.isInstanceRunning("instance-123")).toBe(false);
    });
  });

  describe("Window Management", () => {
    it("handles window controls safely without crashing", async () => {
      await expect(adapter.window.minimize()).resolves.toBeUndefined();
      await expect(adapter.window.maximize()).resolves.toBeUndefined();
      await expect(adapter.window.toggleMaximize()).resolves.toBeUndefined();
      await expect(adapter.window.close()).resolves.toBeUndefined();
      await expect(adapter.window.focus()).resolves.toBeUndefined();
    });

    it("returns viewport dimensions for window size", async () => {
      const size = await adapter.window.getSize();
      expect(size).toHaveProperty("width");
      expect(size).toHaveProperty("height");
      expect(typeof size.width).toBe("number");
      expect(typeof size.height).toBe("number");
    });

    it("reports mobile window as always maximized", async () => {
      expect(await adapter.window.isMaximized()).toBe(true);
    });
  });

  describe("Notifications", () => {
    it("dispatches notifications with fallback method", async () => {
      const result = await adapter.notification.showNotification({
        title: "Test Alert",
        content: "Testing mobile notifications",
      });
      expect(result.ok).toBe(true);
      expect(["web-notification", "mobile-fallback"]).toContain(result.method);
    });
  });

  describe("Storage & Settings Integration", () => {
    it("provides storage paths and default locations", async () => {
      const paths = await adapter.getDefaultPaths();
      expect(paths).toBeDefined();
      expect(paths).toHaveProperty("basePath");
      expect(paths).toHaveProperty("defaultModsPath");
      expect(paths).toHaveProperty("defaultEnginesPath");
    });

    it("reads and saves settings via WebSettings backend", async () => {
      await adapter.saveSettings({ language: "es", theme: "dark" });
      const loaded = await adapter.getSettings();
      expect(loaded.language).toBe("es");
      expect(loaded.theme).toBe("dark");
    });

    it("manages storage migration flags safely", () => {
      expect(adapter.isMigrationInProgress()).toBe(false);
      adapter.setMigrationInProgress(true);
      expect(adapter.isMigrationInProgress()).toBe(true);
      adapter.setMigrationInProgress(false);
      expect(adapter.isMigrationInProgress()).toBe(false);
    });
  });

  describe("Mod & Engine Safe Stubs", () => {
    it("returns empty installed lists by default in sandbox", async () => {
      const mods = await adapter.getInstalledMods();
      expect(Array.isArray(mods)).toBe(true);

      const engines = await adapter.getInstalledEngines();
      expect(typeof engines).toBe("object");
    });

    it("handles folder opening requests safely", async () => {
      await expect(adapter.openModFolder("mod-1")).resolves.toBeUndefined();
      await expect(adapter.openEngineFolder("vslice", "1.0")).resolves.toBeUndefined();
    });
  });
});
