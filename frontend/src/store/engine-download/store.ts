import { create } from "zustand";
import { container } from "../../core/container";
import type {
  EngineDownloadStoreDependencies,
  EngineDownloadStoreState,
  StartEngineDownloadParams,
} from "./types";
import { setCurrentViewAction } from "./view-sync";
import { handleStartEngineDownload, handleCancelEngineDownload } from "./download-actions";

/**
 * Creates an instance of the Engine Download Store with injected dependencies (DIP).
 */
export function createEngineDownloadStore(customDeps?: Partial<EngineDownloadStoreDependencies>) {
  const deps: EngineDownloadStoreDependencies = {
    engines: customDeps?.engines || container.engines,
    notification: customDeps?.notification || container.notification,
  };

  return create<EngineDownloadStoreState>((set, get) => ({
    currentTask: null,
    currentRoute: typeof window !== "undefined" ? window.location.pathname : "/",
    viewingCategory: null,
    viewingVersion: null,
    activeModalModId: null,
    navigateCallback: null,

    setNavigateCallback: (fn) => {
      set({ navigateCallback: fn });
    },

    setCurrentView: (params) => setCurrentViewAction(params, get, set),

    startEngineDownload: (params: StartEngineDownloadParams) =>
      handleStartEngineDownload(deps, params, get, set),

    cancelEngineDownload: () => handleCancelEngineDownload(deps, get, set),
  }));
}

/**
 * Global default engine download store hooked to DI container.
 */
export const useEngineDownloadStore = createEngineDownloadStore();
