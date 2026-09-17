import { toast } from "../../utils/toast";
import { isWindowUnfocused } from "../../utils/hooks/use-notifications";
import { DownloadStatus } from "../download-constants";
import type {
  ActiveDownloadTask,
  DownloadStoreDependencies,
  DownloadStoreState,
  StartDownloadParams,
} from "./types";
import { syncTaskToast } from "./toast-sync";

/**
 * Handles initiation and lifecycle of a mod download task.
 */
export async function handleStartDownload(
  deps: DownloadStoreDependencies,
  params: StartDownloadParams,
  get: () => DownloadStoreState,
  set: (partial: Partial<DownloadStoreState> | ((state: DownloadStoreState) => Partial<DownloadStoreState>)) => void
): Promise<void> {
  const { url, fileId, modId, modName, payload } = params;
  if (get().tasks[fileId]) {
    return;
  }

  const controller = new AbortController();
  const newTask: ActiveDownloadTask = {
    modId,
    fileId,
    modName,
    progress: 0,
    status: DownloadStatus.STARTING,
    abortController: controller,
    toastId: null,
    payload,
  };

  const initialToastId = syncTaskToast(newTask, get().currentRoute, get().activeModalModId);
  newTask.toastId = initialToastId;

  set((state) => ({
    tasks: { ...state.tasks, [fileId]: newTask },
  }));

  try {
    await deps.mods.downloadMod(
      url,
      modId,
      modName,
      (progress, statusText, details) => {
        const currentTask = get().tasks[fileId];
        if (!currentTask || controller.signal.aborted) return;

        const activeModal = get().activeModalModId;
        const currentRoute = get().currentRoute;

        const downloaded = details?.downloaded ?? currentTask.downloaded;
        const total = details?.total ?? currentTask.total;
        const currentFile = details?.currentFile ?? (statusText === DownloadStatus.EXTRACTING ? currentTask.currentFile : undefined);

        const updatedTask: ActiveDownloadTask = {
          ...currentTask,
          progress,
          status: statusText || currentTask.status,
          downloaded,
          total,
          currentFile,
        };

        const activeToastId = syncTaskToast(updatedTask, currentRoute, activeModal);

        set((s) => {
          if (!s.tasks[fileId]) return s;
          return {
            tasks: {
              ...s.tasks,
              [fileId]: {
                ...updatedTask,
                toastId: activeToastId,
              },
            },
          };
        });
      },
      controller.signal
    );

    await deps.mods.registerInstalledMod(payload).catch((e) =>
      console.warn("Failed to register installed mod:", e)
    );

    const finishedTask = get().tasks[fileId];
    if (finishedTask?.toastId) {
      toast.dismiss(finishedTask.toastId);
    }

    const isUnfocused = isWindowUnfocused();
    const osNotifySetting =
      typeof window !== "undefined"
        ? localStorage.getItem("wb_os_notify_download") !== "false"
        : true;
    const toastNotifySetting =
      typeof window !== "undefined"
        ? localStorage.getItem("wb_toast_notify_download") !== "false"
        : true;

    if (osNotifySetting && isUnfocused) {
      try {
        await deps.notification.showNotification({
          title: "WeekBox - Download Complete",
          content: `"${modName}" has been successfully downloaded and installed.`,
          icon: "INFO",
        });
      } catch (e) {
        console.warn("Could not send native OS notification on download finish:", e);
      }
    }

    if (toastNotifySetting) {
      toast.success(`"${modName}" downloaded successfully!`, {
        title: "Mod Installed",
      });
    }
  } catch (err: any) {
    const failedTask = get().tasks[fileId];
    if (failedTask?.toastId) {
      toast.dismiss(failedTask.toastId);
    }

    if (err?.message !== "Cancelled") {
      const engineInfo = payload?.engineId || payload?.engineName || "Unknown Engine";
      const categoryInfo = payload?.__featuredCategoryId || payload?.categoryName || "FNF Mod";
      console.error(
        `[Download Error] Mod "${modName}" (ID: ${modId}, Engine: ${engineInfo}, Category: ${categoryInfo}):`,
        err
      );
      toast.error(
        `Mod "${modName}" (ID: ${modId}, Engine: ${engineInfo}): ${err?.message || "Failed to download mod."}`,
        {
          title: "Download Error",
        }
      );
    }
  } finally {
    set((s) => {
      const next = { ...s.tasks };
      delete next[fileId];
      return { tasks: next };
    });
  }
}

/**
 * Cancels an active download task by file ID.
 */
export function handleCancelDownload(
  fileId: string,
  get: () => DownloadStoreState,
  set: (partial: Partial<DownloadStoreState> | ((state: DownloadStoreState) => Partial<DownloadStoreState>)) => void
): void {
  const task = get().tasks[fileId];
  if (task) {
    if (task.toastId) {
      toast.dismiss(task.toastId);
    }
    task.abortController.abort();
    set((s) => {
      const next = { ...s.tasks };
      delete next[fileId];
      return { tasks: next };
    });
  }
}
