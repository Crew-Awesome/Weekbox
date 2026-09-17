import type { DownloadStoreState } from "./types";
import { syncTaskToast } from "./toast-sync";

/**
 * Updates current route and recalculates task toast states.
 */
export function setCurrentRouteAction(
  route: string,
  get: () => DownloadStoreState,
  set: (partial: Partial<DownloadStoreState> | ((state: DownloadStoreState) => Partial<DownloadStoreState>)) => void
): void {
  const currentTasks = { ...get().tasks };
  let hasChanges = false;
  const activeModal = get().activeModalModId;

  Object.keys(currentTasks).forEach((fileId) => {
    const task = currentTasks[fileId];
    const newToastId = syncTaskToast(task, route, activeModal);
    if (newToastId !== task.toastId) {
      currentTasks[fileId] = { ...task, toastId: newToastId };
      hasChanges = true;
    }
  });

  set({
    currentRoute: route,
    ...(hasChanges ? { tasks: currentTasks } : {}),
  });
}

/**
 * Updates active modal mod ID and recalculates task toast states.
 */
export function setModalOpenAction(
  modId: string | null,
  get: () => DownloadStoreState,
  set: (partial: Partial<DownloadStoreState> | ((state: DownloadStoreState) => Partial<DownloadStoreState>)) => void
): void {
  const currentTasks = { ...get().tasks };
  let hasChanges = false;
  const currentRoute = get().currentRoute;

  Object.keys(currentTasks).forEach((fileId) => {
    const task = currentTasks[fileId];
    const newToastId = syncTaskToast(task, currentRoute, modId);
    if (newToastId !== task.toastId) {
      currentTasks[fileId] = { ...task, toastId: newToastId };
      hasChanges = true;
    }
  });

  set({
    activeModalModId: modId,
    ...(hasChanges ? { tasks: currentTasks } : {}),
  });
}
