import { create } from "zustand";
import Core from "@core";
import { toast } from "../utils/toast";
import { DownloadStatus } from "./download-constants";
import { formatFileSize } from "../features/home/components/mod-details-modal/types";

export interface ActiveEngineDownloadTask {
  engineId: string;
  version: string;
  engineName: string;
  downloadUrl: string;
  progress: number;
  status: string;
  currentFile?: string;
  downloaded?: number;
  total?: number;
  abortController: AbortController;
  toastId: string | null;
}

interface EngineDownloadStoreState {
  currentTask: ActiveEngineDownloadTask | null;
  currentRoute: string;
  viewingCategory: string | null;
  viewingVersion: string | null;
  activeModalModId: string | null;
  navigateCallback: ((path: string) => void) | null;

  setNavigateCallback: (fn: (path: string) => void) => void;
  setCurrentView: (params: {
    route: string;
    viewingCategory?: string | null;
    viewingVersion?: string | null;
    activeModalModId?: string | null;
  }) => void;
  startEngineDownload: (params: {
    engineId: string;
    version: string;
    engineName: string;
    downloadUrl: string;
  }) => Promise<void>;
  cancelEngineDownload: () => Promise<void>;
}

/**
 * Builds the notification toast string based on download progress and current extracting file.
 */
function getEngineToastMessage(task: ActiveEngineDownloadTask): string {
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
function shouldShowEngineToast(
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
function syncEngineToast(
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

export const useEngineDownloadStore = create<EngineDownloadStoreState>((set, get) => ({
  currentTask: null,
  currentRoute: typeof window !== "undefined" ? window.location.pathname : "/",
  viewingCategory: null,
  viewingVersion: null,
  activeModalModId: null,
  navigateCallback: null,

  setNavigateCallback: (fn) => {
    set({ navigateCallback: fn });
  },

  setCurrentView: ({ route, viewingCategory, viewingVersion, activeModalModId }) => {
    set((state) => {
      const nextRoute = route !== undefined ? route : state.currentRoute;
      const nextCat = viewingCategory !== undefined ? viewingCategory : state.viewingCategory;
      const nextVer = viewingVersion !== undefined ? viewingVersion : state.viewingVersion;
      const nextModal = activeModalModId !== undefined ? activeModalModId : state.activeModalModId;

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
  },

  startEngineDownload: async ({ engineId, version, engineName, downloadUrl }) => {
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
      if (Core.platform.downloadEngine) {
        await Core.platform.downloadEngine(
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

        const finalTask = get().currentTask;
        if (finalTask?.toastId) {
          toast.update(finalTask.toastId, {
            title: "Engine Installed",
            message: `${engineName} v${version} downloaded and extracted successfully!`,
            type: "success",
            duration: 4000,
          });
        } else {
          toast.success(`${engineName} v${version} installed successfully!`, {
            title: "Engine Installed",
            duration: 4000,
          });
        }
      } else {
        await Core.platform.openUrl(downloadUrl);
        toast.info(`Download opened in browser for ${engineName} v${version}.`, {
          title: "Engine Download",
        });
      }
    } catch (err: any) {
      const finalTask = get().currentTask;
      if (abortController.signal.aborted || err?.message === "Cancelled" || err?.name === "AbortError") {
        if (finalTask?.toastId) {
          toast.dismiss(finalTask.toastId);
        }
        toast.info(`Download for ${engineName} v${version} cancelled.`, {
          title: "Download Cancelled",
          duration: 3000,
        });
      } else {
        if (finalTask?.toastId) {
          toast.update(finalTask.toastId, {
            title: "Download Error",
            message: err?.message || `Could not download ${engineName} v${version}.`,
            type: "error",
            duration: 5000,
          });
        } else {
          toast.error(err?.message || `Could not download ${engineName} v${version}.`, {
            title: "Download Error",
            duration: 5000,
          });
        }
      }
    } finally {
      set({ currentTask: null });
    }
  },

  cancelEngineDownload: async () => {
    const task = get().currentTask;
    if (!task) return;

    task.abortController.abort();

    if (task.toastId) {
      toast.dismiss(task.toastId);
    }

    /* Clean up any partial files on disk */
    try {
      let basePath = window.NL_CWD || window.NL_PATH || "";
      if (window.Neutralino?.os?.getPath) {
        const dataPath = await window.Neutralino.os.getPath("data");
        basePath = `${dataPath}/WeekBox`;
      }
      basePath = basePath.replace(/\\/g, "/");

      const safeEngineId = task.engineId
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .toLowerCase();

      const safeVersion = task.version
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "");

      const targetFolder = `${basePath}/engines/${safeEngineId}/${safeVersion}`;
      const tempArchive = `${basePath}/engines/${safeEngineId}/temp_${safeVersion}.archive`;

      if (window.NODE?.call) {
        await window.NODE.call("fs.remove", { path: tempArchive }).catch(() => {});
        await window.NODE.call("fs.remove", { path: targetFolder }).catch(() => {});
      }
    } catch {}

    set({ currentTask: null });
  },
}));
