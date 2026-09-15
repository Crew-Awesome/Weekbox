import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../src/store";

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
