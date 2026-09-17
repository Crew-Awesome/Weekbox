import type { EngineDownloadStoreState } from "./types";
import { syncEngineToast } from "./toast-sync";

/**
 * Handles view and route changes, recalculating engine toast requirements.
 */
export function setCurrentViewAction(
  params: {
    route: string;
    viewingCategory?: string | null;
    viewingVersion?: string | null;
    activeModalModId?: string | null;
  },
  _get: () => EngineDownloadStoreState,
  set: (partial: Partial<EngineDownloadStoreState> | ((state: EngineDownloadStoreState) => Partial<EngineDownloadStoreState>)) => void
): void {
  set((state) => {
    const nextRoute = params.route !== undefined ? params.route : state.currentRoute;
    const nextCat = params.viewingCategory !== undefined ? params.viewingCategory : state.viewingCategory;
    const nextVer = params.viewingVersion !== undefined ? params.viewingVersion : state.viewingVersion;
    const nextModal = params.activeModalModId !== undefined ? params.activeModalModId : state.activeModalModId;

    const nextState = {
      ...state,
      currentRoute: nextRoute,
      viewingCategory: nextCat,
      viewingVersion: nextVer,
      activeModalModId: nextModal,
    };

    if (state.currentTask) {
      const nextToastId = syncEngineToast(state.currentTask, nextState);
      return {
        ...nextState,
        currentTask: {
          ...state.currentTask,
          toastId: nextToastId,
        },
      };
    }

    return nextState;
  });
}
