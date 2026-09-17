import { toast } from "../../utils/toast";
import { DownloadStatus } from "../download-constants";
import { formatFileSize } from "../../utils/formatters";
import type { ActiveEngineDownloadTask, EngineDownloadStoreState } from "./types";

/**
 * Builds the notification toast string based on download progress and current extracting file.
 */
export function getEngineToastMessage(task: ActiveEngineDownloadTask): string {
  if (task.status === DownloadStatus.FLATTENING || task.status === "Flattening") {
    return DownloadStatus.FLATTENING;
  }
  if (
    (task.status === DownloadStatus.EXTRACTING || task.status === "Extracting archive...") &&
    task.currentFile
  ) {
    return `${DownloadStatus.EXTRACTING} (${task.progress}%)\n${task.currentFile}`;
  }
  if (task.downloaded !== undefined && task.downloaded > 0) {
    const dl = formatFileSize(task.downloaded);
    const tot = task.total && task.total > 0 ? ` / ${formatFileSize(task.total)}` : "";
    return `${task.status || "Downloading..."} (${task.progress}%)\n${dl}${tot}`;
  }
  return `${task.status || "Downloading..."} (${task.progress}%)`;
}

/**
 * Determines whether the floating toast should be displayed.
 * Returns true if the user navigated away from the active engine/version or opened a modal.
 */
export function shouldShowEngineToast(
  task: ActiveEngineDownloadTask,
  currentRoute: string,
  viewingCategory: string | null,
  viewingVersion: string | null,
  activeModalModId: string | null
): boolean {
  if (activeModalModId) {
    return true;
  }

  const isInstancesRoute = currentRoute.startsWith("/instances");
  if (!isInstancesRoute) {
    return true;
  }

  const matchesCategory =
    viewingCategory &&
    viewingCategory.toLowerCase() === task.engineId.toLowerCase();

  const cleanViewingVer = (viewingVersion || "").toLowerCase().replace(/^v/, "");
  const cleanTaskVer = task.version.toLowerCase().replace(/^v/, "");
  const matchesVersion = cleanViewingVer === cleanTaskVer;

  if (matchesCategory && matchesVersion) {
    return false;
  }

  return true;
}

/**
 * Synchronizes the toast notification state with the current task and active view.
 */
export function syncEngineToast(
  task: ActiveEngineDownloadTask,
  state: EngineDownloadStoreState
): string | null {
  const shouldShow = shouldShowEngineToast(
    task,
    state.currentRoute,
    state.viewingCategory,
    state.viewingVersion,
    state.activeModalModId
  );

  const message = getEngineToastMessage(task);

  if (shouldShow) {
    if (!task.toastId) {
      return toast.show(message, "info", {
        title: `Downloading: ${task.engineName} v${task.version}`,
        duration: 0,
        progress: task.progress,
        action: {
          label: "View instance",
          onClick: () => {
            const targetPath = `/instances/${task.engineId}/${task.version}`;
            if (state.navigateCallback) {
              state.navigateCallback(targetPath);
            } else if (typeof window !== "undefined") {
              window.location.hash = `#${targetPath}`;
            }
          },
        },
      });
    } else {
      toast.update(task.toastId, {
        message,
        progress: task.progress,
      });
      return task.toastId;
    }
  } else {
    if (task.toastId) {
      toast.dismiss(task.toastId);
    }
    return null;
  }
}
