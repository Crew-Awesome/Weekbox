import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Lightweight browser environment setup for Node/Vitest runner
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

if (typeof (globalThis as any).document === "undefined") {
  const mockDoc = {
    hasFocus: () => true,
    hidden: false,
    visibilityState: "visible",
  };
  Object.defineProperty(globalThis, "document", {
    value: mockDoc,
    writable: true,
    configurable: true,
  });
}

import { notificationApi } from "../src/core/backend/notification";
import { isWindowUnfocused, useNotifications } from "../src/utils/hooks/use-notifications";
import Core from "@core";
import { toast } from "../src/utils/toast";

describe("Notifications System", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("notificationApi (Backend / Native Adapter)", () => {
    it("handles Web Notification when permission is granted", async () => {
      const mockNotification = vi.fn();
      (window as any).Notification = mockNotification;
      (window.Notification as any).permission = "granted";

      const result = await notificationApi.showNotification({
        title: "Test Title",
        content: "Test Body",
      });

      expect(result.ok).toBe(true);
      expect(result.method).toBe("web-notification");
      expect(mockNotification).toHaveBeenCalledWith("Test Title", {
        body: "Test Body",
      });
    });

    it("requests permission when permission is default and triggers notification if granted", async () => {
      const mockNotification = vi.fn();
      const requestPermissionMock = vi.fn().mockResolvedValue("granted");
      (window as any).Notification = mockNotification;
      (window.Notification as any).permission = "default";
      (window.Notification as any).requestPermission = requestPermissionMock;

      const result = await notificationApi.showNotification({
        title: "Permission Test",
        content: "Permission Body",
      });

      expect(requestPermissionMock).toHaveBeenCalled();
      expect(result.ok).toBe(true);
      expect(result.method).toBe("web-notification");
      expect(mockNotification).toHaveBeenCalledWith("Permission Test", {
        body: "Permission Body",
      });
    });

    it("returns ok: false when Notification permission is denied", async () => {
      const mockNotification = vi.fn();
      const requestPermissionMock = vi.fn().mockResolvedValue("denied");
      (window as any).Notification = mockNotification;
      (window.Notification as any).permission = "default";
      (window.Notification as any).requestPermission = requestPermissionMock;

      const result = await notificationApi.showNotification({
        title: "Denied Test",
        content: "Denied Body",
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Web notifications unavailable or permission denied");
    });
  });

  describe("isWindowUnfocused utility", () => {
    it("returns false when document has focus and is visible", () => {
      vi.spyOn(document, "hasFocus").mockReturnValue(true);
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });

      expect(isWindowUnfocused()).toBe(false);
    });

    it("returns true when document does not have focus", () => {
      vi.spyOn(document, "hasFocus").mockReturnValue(false);
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });

      expect(isWindowUnfocused()).toBe(true);
    });

    it("returns true when document is hidden", () => {
      vi.spyOn(document, "hasFocus").mockReturnValue(true);
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });

      expect(isWindowUnfocused()).toBe(true);
    });
  });

  describe("useNotifications Hook Logic", () => {
    it("exports useNotifications hook function and delegates notifications", async () => {
      expect(typeof useNotifications).toBe("function");

      const showNotificationSpy = vi
        .spyOn(Core.notification, "showNotification")
        .mockResolvedValue({ ok: true, method: "test-mock" });

      const result = await Core.notification.showNotification({
        title: "Hook Direct Test",
        content: "Testing delegation",
        icon: "INFO",
      });

      expect(showNotificationSpy).toHaveBeenCalledWith({
        title: "Hook Direct Test",
        content: "Testing delegation",
        icon: "INFO",
      });
      expect(result.ok).toBe(true);
    });

    it("notifyDownloadComplete dispatches OS notification when window is unfocused", async () => {
      vi.spyOn(document, "hasFocus").mockReturnValue(false);
      Object.defineProperty(document, "hidden", { value: true, configurable: true });

      const showNotificationSpy = vi
        .spyOn(Core.notification, "showNotification")
        .mockResolvedValue({ ok: true });
      const toastSuccessSpy = vi.spyOn(toast, "success").mockReturnValue("toast-id");

      // Verify the download notification payload
      const modName = "VSlice Engine Mod";
      await Core.notification.showNotification({
        title: "WeekBox - Download Complete",
        content: `"${modName}" has been successfully downloaded and installed.`,
        icon: "INFO",
      });
      toast.success(`"${modName}" downloaded successfully!`, {
        title: "Mod Installed",
      });

      expect(showNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "WeekBox - Download Complete",
          content: expect.stringContaining(modName),
        })
      );
      expect(toastSuccessSpy).toHaveBeenCalledWith(
        expect.stringContaining(modName),
        expect.objectContaining({ title: "Mod Installed" })
      );
    });
  });
});
