import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./index";

describe("useAppStore", () => {
  // Reset the store before each test
  beforeEach(() => {
    useAppStore.setState({
      activeDeepLinkModId: null,
      activeModItem: null,
    });
  });

  it("should have correct initial state", () => {
    const state = useAppStore.getState();
    expect(state.activeDeepLinkModId).toBeNull();
    expect(state.activeModItem).toBeNull();
  });

  it("should update activeDeepLinkModId correctly", () => {
    useAppStore.getState().setActiveDeepLinkModId(42);
    expect(useAppStore.getState().activeDeepLinkModId).toBe(42);

    useAppStore.getState().setActiveDeepLinkModId(null);
    expect(useAppStore.getState().activeDeepLinkModId).toBeNull();
  });

  it("should update activeModItem correctly", () => {
    const dummyMod = { _idRow: 123, _sName: "Test Mod" } as any;
    useAppStore.getState().setActiveModItem(dummyMod);
    expect(useAppStore.getState().activeModItem).toEqual(dummyMod);

    useAppStore.getState().setActiveModItem(null);
    expect(useAppStore.getState().activeModItem).toBeNull();
  });
});
