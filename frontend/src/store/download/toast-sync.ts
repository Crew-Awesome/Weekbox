import { toast } from "../../utils/toast";
import { DownloadStatus } from "../download-constants";
import { formatFileSize } from "../../utils/formatters";
import { useAppStore } from "../index";
import type { ActiveDownloadTask } from "./types";

/**
 * Builds the download notification toast string according to current progress.
 */
export function getTaskToastMessage(task: ActiveDownloadTask): string {
  if (task.status === DownloadStatus.FLATTENING) {
    return DownloadStatus.FLATTENING;
  }
  if (task.status === DownloadStatus.EXTRACTING && task.currentFile) {
    return `${task.status || DownloadStatus.EXTRACTING} (${task.progress}%)\n${task.currentFile}`;
  }
  if (task.downloaded !== undefined && task.downloaded > 0) {
    const dlStr = formatFileSize(task.downloaded);
    const totStr = task.total && task.total > 0 ? ` / ${formatFileSize(task.total)}` : "";
    return `${task.status || DownloadStatus.DOWNLOADING} (${task.progress}%)\n${dlStr}${totStr}`;
  }
  return `${task.status || DownloadStatus.DOWNLOADING} (${task.progress}%)`;
}

/**
 * Determines whether floating toast should be shown for this download task.
 */
export function shouldShowDownloadToast(
  modId: string,
  currentRoute: string,
  activeModalModId: string | null
): boolean {
  const isInLibrary = currentRoute.includes("library");
  if (isInLibrary) {
    if (!activeModalModId) {
      return false;
    }
    if (String(activeModalModId) === String(modId)) {
      return false;
    }
    return true;
  }
  if (String(activeModalModId) === String(modId)) {
    return false;
  }
  return true;
}

/**
 * Synchronizes toast lifecycle for an active download task.
 */
export function syncTaskToast(
  task: ActiveDownloadTask,
  currentRoute: string,
  activeModalModId: string | null
): string | null {
  const shouldShow = shouldShowDownloadToast(task.modId, currentRoute, activeModalModId);
  const msg = getTaskToastMessage(task);

  if (shouldShow) {
    if (!task.toastId) {
      return toast.show(msg, "info", {
        title: `Downloading: ${task.modName}`,
        duration: 0,
        progress: task.progress,
        action: {
          label: "View details",
          onClick: () => {
            try {
              const numericId = Number(task.modId);
              if (!isNaN(numericId)) {
                useAppStore.getState().setActiveDeepLinkModId(numericId);
              }
            } catch (e) {
              console.warn("Could not reopen modal from toast:", e);
            }
          },
        },
      });
    } else {
      toast.update(task.toastId, {
        message: msg,
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
