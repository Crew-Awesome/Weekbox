import { describe, it, expect, beforeEach } from "vitest";

// Lightweight browser environment setup for Node/Vitest runner
if (typeof (globalThis as any).document === "undefined") {
  const mockStyle: Record<string, string> = { zoom: "", fontSize: "" };
  (globalThis as any).document = {
    documentElement: {
      style: mockStyle,
    },
  };
}
if (typeof (globalThis as any).window === "undefined") {
  (globalThis as any).window = globalThis;
}

import { useAppStore, useSettingsStore, applyUiScale } from "../src/store";

describe("useAppStore", () => {
  beforeEach(() => {
    useAppStore.setState({
      activeDeepLinkModId: null,
      activeModItem: null,
      notFoundModId: null,
    });
  });

  it("should have correct initial state", () => {
    const state = useAppStore.getState();
    expect(state.activeDeepLinkModId).toBeNull();
    expect(state.activeModItem).toBeNull();
    expect(state.notFoundModId).toBeNull();
  });

  it("should update activeDeepLinkModId correctly", () => {
    useAppStore.getState().setActiveDeepLinkModId(42);
    expect(useAppStore.getState().activeDeepLinkModId).toBe(42);

    useAppStore.getState().setActiveDeepLinkModId(null);
    expect(useAppStore.getState().activeDeepLinkModId).toBeNull();
  });

  it("should update activeModItem correctly", () => {
    const dummyMod = { id: 123, name: "Test Mod", description: "Test Description", img: "" };
    useAppStore.getState().setActiveModItem(dummyMod);
    expect(useAppStore.getState().activeModItem).toEqual(dummyMod);

    useAppStore.getState().setActiveModItem(null);
    expect(useAppStore.getState().activeModItem).toBeNull();
  });

  it("should update notFoundModId correctly", () => {
    useAppStore.getState().setNotFoundModId(999);
    expect(useAppStore.getState().notFoundModId).toBe(999);

    useAppStore.getState().setNotFoundModId(null);
    expect(useAppStore.getState().notFoundModId).toBeNull();
  });
});

describe("useSettingsStore - uiScale", () => {
  beforeEach(() => {
    document.documentElement.style.zoom = "";
    document.documentElement.style.fontSize = "";
    useSettingsStore.setState({ uiScale: 100 });
  });

  it("should default uiScale to 100, clear zoom and reset fontSize", () => {
    expect(useSettingsStore.getState().uiScale).toBe(100);
    applyUiScale(100);
    expect(document.documentElement.style.zoom).toBe("");
    expect(document.documentElement.style.fontSize).toBe("");
  });

  it("should update uiScale and apply fontSize to documentElement without zooming viewport", async () => {
    await useSettingsStore.getState().updateSetting("uiScale", 120);
    expect(useSettingsStore.getState().uiScale).toBe(120);
    expect(document.documentElement.style.fontSize).toBe("120%");
    expect(document.documentElement.style.zoom).toBe("");

    await useSettingsStore.getState().updateSetting("uiScale", 85);
    expect(useSettingsStore.getState().uiScale).toBe(85);
    expect(document.documentElement.style.fontSize).toBe("85%");
    expect(document.documentElement.style.zoom).toBe("");
  });

  it("should reset fontSize to empty string when scale is 100", async () => {
    await useSettingsStore.getState().updateSetting("uiScale", 110);
    expect(document.documentElement.style.fontSize).toBe("110%");

    await useSettingsStore.getState().updateSetting("uiScale", 100);
    expect(document.documentElement.style.fontSize).toBe("");
    expect(document.documentElement.style.zoom).toBe("");
  });

  it("should clamp extreme values in applyUiScale", () => {
    applyUiScale(200);
    expect(document.documentElement.style.fontSize).toBe("150%");
    expect(document.documentElement.style.zoom).toBe("");

    applyUiScale(40);
    expect(document.documentElement.style.fontSize).toBe("70%");
    expect(document.documentElement.style.zoom).toBe("");
  });
});

