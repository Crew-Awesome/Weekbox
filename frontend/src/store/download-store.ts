import { create } from "zustand";
import Core from "@core";
import { toast } from "../utils/toast";
import { isWindowUnfocused } from "../utils/hooks/use-notifications";
import { useAppStore } from "./index";
import { DownloadStatus } from "./download-constants";
import { formatFileSize } from "../features/home/components/mod-details-modal/types";

export interface ActiveDownloadTask {
  modId: string;
  fileId: string;
  modName: string;
  progress: number;
  status: string;
  abortController: AbortController;
  toastId: string | null;
  payload: any;
  downloaded?: number;
  total?: number;
  currentFile?: string;
}

interface DownloadStoreState {
  tasks: Record<string, ActiveDownloadTask>;
  activeModalModId: string | null;
  currentRoute: string;

  setCurrentRoute: (route: string) => void;
  setModalOpen: (modId: string | null) => void;
  startDownload: (params: {
    url: string;
    fileId: string;
    modId: string;
    modName: string;
    payload: any;
  }) => Promise<void>;
  cancelDownload: (fileId: string) => void;
}

function getTaskToastMessage(task: ActiveDownloadTask): string {
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

function shouldShowDownloadToast(
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

function syncTaskToast(
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

export const useDownloadStore = create<DownloadStoreState>((set, get) => ({
  tasks: {},
  activeModalModId: null,
  currentRoute: typeof window !== "undefined" ? window.location.hash || window.location.pathname : "/home",

  setCurrentRoute: (route: string) => {
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
  },

  setModalOpen: (modId: string | null) => {
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
  },

  startDownload: async ({ url, fileId, modId, modName, payload }) => {
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
      await Core.platform.downloadMod(
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

      await Core.platform.registerInstalledMod(payload).catch((e) =>
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
          await Core.notification.showNotification({
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
  },

  cancelDownload: (fileId: string) => {
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
  },
}));
