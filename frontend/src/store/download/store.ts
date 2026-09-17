import { create } from "zustand";
import { container } from "../../core/container";
import type {
  DownloadStoreDependencies,
  DownloadStoreState,
  StartDownloadParams,
} from "./types";
import { setCurrentRouteAction, setModalOpenAction } from "./route-sync";
import { handleStartDownload, handleCancelDownload } from "./download-actions";

/**
 * Creates an instance of the Download Store with injected dependencies (DIP).
 */
export function createDownloadStore(customDeps?: Partial<DownloadStoreDependencies>) {
  const deps: DownloadStoreDependencies = {
    mods: customDeps?.mods || container.mods,
    notification: customDeps?.notification || container.notification,
  };

  return create<DownloadStoreState>((set, get) => ({
    tasks: {},
    activeModalModId: null,
    currentRoute:
      typeof window !== "undefined"
        ? window.location.hash || window.location.pathname
        : "/home",

    setCurrentRoute: (route: string) => setCurrentRouteAction(route, get, set),

    setModalOpen: (modId: string | null) => setModalOpenAction(modId, get, set),

    startDownload: (params: StartDownloadParams) =>
      handleStartDownload(deps, params, get, set),

    cancelDownload: (fileId: string) => handleCancelDownload(fileId, get, set),
  }));
}

/**
 * Global default download store hooked to DI container.
 */
export const useDownloadStore = createDownloadStore();
