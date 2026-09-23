import { toast } from "../../utils/toast";
import type {
  ActiveEngineDownloadTask,
  EngineDownloadStoreDependencies,
  EngineDownloadStoreState,
  StartEngineDownloadParams,
} from "./types";
import { syncEngineToast } from "./toast-sync";

/**
 * Handles initiation, progress monitoring, and completion of an engine download.
 */
export async function handleStartEngineDownload(
  deps: EngineDownloadStoreDependencies,
  params: StartEngineDownloadParams,
  get: () => EngineDownloadStoreState,
  set: (partial: Partial<EngineDownloadStoreState> | ((state: EngineDownloadStoreState) => Partial<EngineDownloadStoreState>)) => void
): Promise<void> {
  const { engineId, version, engineName, downloadUrl } = params;
  const existing = get().currentTask;
  if (existing) {
    toast.info("An engine download is already in progress.", {
      title: "Engine Download",
    });
    return;
  }

  const abortController = new AbortController();

  const initialTask: ActiveEngineDownloadTask = {
    engineId,
    version,
    engineName,
    downloadUrl,
    progress: 0,
    status: "Starting download...",
    abortController,
    toastId: null,
  };

  set({ currentTask: initialTask });

  /* Update initial toast if user is on a different screen */
  const toastId = syncEngineToast(initialTask, get());
  set((state) => ({
    currentTask: state.currentTask ? { ...state.currentTask, toastId } : null,
  }));

  try {
    if (deps.engines.downloadEngine) {
      await deps.engines.downloadEngine(
        downloadUrl,
        engineId,
        version,
        (percent, statusText, details) => {
          set((state) => {
            if (!state.currentTask) return state;

            const updatedTask: ActiveEngineDownloadTask = {
              ...state.currentTask,
              progress: percent,
              status: statusText || state.currentTask.status,
              currentFile: details?.currentFile ?? state.currentTask.currentFile,
              downloaded: details?.downloaded ?? state.currentTask.downloaded,
              total: details?.total ?? state.currentTask.total,
            };

            const updatedToastId = syncEngineToast(updatedTask, state);
            updatedTask.toastId = updatedToastId;

            return { currentTask: updatedTask };
          });
        },
        abortController.signal
      );

      /* Dismiss active download toast on success */
      const finishedTask = get().currentTask;
      if (finishedTask?.toastId) {
        toast.dismiss(finishedTask.toastId);
      }

      toast.success(`${engineName} v${version} downloaded and installed successfully!`, {
        title: "Engine Ready",
      });

      const osNotifySetting =
        typeof window !== "undefined"
          ? localStorage.getItem("wb_system_notifications") !== "false" &&
            localStorage.getItem("wb_os_notify_download") !== "false"
          : true;

      if (osNotifySetting) {
        try {
          await deps.notification.showNotification({
            title: "WeekBox - Engine Ready",
            content: `${engineName} v${version} has been downloaded and installed.`,
            icon: "INFO",
          });
        } catch (e) {
          console.warn("Could not dispatch system notification on engine download finish:", e);
        }
      }
    }
  } catch (err: any) {
    const failedTask = get().currentTask;
    if (failedTask?.toastId) {
      toast.dismiss(failedTask.toastId);
    }

    if (err?.message !== "Cancelled") {
      console.error(`[Engine Download Error] ${engineName} v${version}:`, err);
      toast.error(
        `Failed to download ${engineName} v${version}: ${err?.message || "Unknown error"}`,
        {
          title: "Engine Download Failed",
        }
      );
    }
  } finally {
    set({ currentTask: null });
  }
}

/**
 * Handles aborting and cleaning up an in-progress engine download.
 */
export async function handleCancelEngineDownload(
  deps: EngineDownloadStoreDependencies,
  get: () => EngineDownloadStoreState,
  set: (partial: Partial<EngineDownloadStoreState> | ((state: EngineDownloadStoreState) => Partial<EngineDownloadStoreState>)) => void
): Promise<void> {
  const task = get().currentTask;
  if (!task) return;

  if (task.toastId) {
    toast.dismiss(task.toastId);
  }

  task.abortController.abort();
  set({ currentTask: null });

  try {
    await deps.engines.cleanupTempDownload(task.engineId, task.version);
  } catch (err) {
    console.warn("Failed to cleanup engine temp download on cancel:", err);
  }

  toast.info(`Cancelled download of ${task.engineName} v${task.version}.`, {
    title: "Download Cancelled",
  });
}
