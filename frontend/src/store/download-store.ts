import { create } from "zustand";
import Core from "@core";
import { toast } from "../utils/toast";
import { isWindowUnfocused } from "../utils/hooks/use-notifications";
import { useAppStore } from "./index";
import { DownloadStatus } from "./download-constants";

export interface ActiveDownloadTask {
  modId: string;
  fileId: string;
  modName: string;
  progress: number;
  status: string;
  abortController: AbortController;
  toastId: string | null;
  payload: any;
}

interface DownloadStoreState {
  tasks: Record<string, ActiveDownloadTask>;
  activeModalModId: string | null;

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

export const useDownloadStore = create<DownloadStoreState>((set, get) => ({
  tasks: {},
  activeModalModId: null,

  setModalOpen: (modId: string | null) => {
    const currentTasks = { ...get().tasks };
    let hasChanges = false;

    if (modId) {
      Object.keys(currentTasks).forEach((fileId) => {
        const task = currentTasks[fileId];
        if (task.modId === modId && task.toastId) {
          toast.dismiss(task.toastId);
          currentTasks[fileId] = { ...task, toastId: null };
          hasChanges = true;
        }
      });
    } else {
      Object.keys(currentTasks).forEach((fileId) => {
        const task = currentTasks[fileId];
        if (!task.toastId && task.progress < 100) {
          const toastId = toast.show(
            `${task.status || DownloadStatus.DOWNLOADING} (${task.progress}%)`,
            "info",
            {
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
            }
          );
          currentTasks[fileId] = { ...task, toastId };
          hasChanges = true;
        }
      });
    }

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
    const isModalOpenForThisMod = get().activeModalModId === modId;

    let initialToastId: string | null = null;
    if (!isModalOpenForThisMod) {
      initialToastId = toast.show(DownloadStatus.STARTING, "info", {
        title: `Downloading: ${modName}`,
        duration: 0,
        progress: 0,
        action: {
          label: "View details",
          onClick: () => {
            const numericId = Number(modId);
            if (!isNaN(numericId)) {
              useAppStore.getState().setActiveDeepLinkModId(numericId);
            }
          },
        },
      });
    }

    const newTask: ActiveDownloadTask = {
      modId,
      fileId,
      modName,
      progress: 0,
      status: DownloadStatus.STARTING,
      abortController: controller,
      toastId: initialToastId,
      payload,
    };

    set((state) => ({
      tasks: { ...state.tasks, [fileId]: newTask },
    }));

    try {
      await Core.platform.downloadMod(
        url,
        modId,
        modName,
        (progress, statusText) => {
          const currentTask = get().tasks[fileId];
          if (!currentTask || controller.signal.aborted) return;

          const activeModal = get().activeModalModId;
          const isModalActive = activeModal === modId;
          let activeToastId = currentTask.toastId;

          if (!isModalActive) {
            const msg = `${statusText || DownloadStatus.DOWNLOADING} (${progress}%)`;
            if (!activeToastId) {
              activeToastId = toast.show(msg, "info", {
                title: `Downloading: ${modName}`,
                duration: 0,
                progress,
                action: {
                  label: "View details",
                  onClick: () => {
                    const numericId = Number(modId);
                    if (!isNaN(numericId)) {
                      useAppStore.getState().setActiveDeepLinkModId(numericId);
                    }
                  },
                },
              });
            } else {
              toast.update(activeToastId, {
                message: msg,
                progress,
              });
            }
          } else {
            if (activeToastId) {
              toast.dismiss(activeToastId);
              activeToastId = null;
            }
          }

          set((s) => {
            if (!s.tasks[fileId]) return s;
            return {
              tasks: {
                ...s.tasks,
                [fileId]: {
                  ...s.tasks[fileId],
                  progress,
                  status: statusText || s.tasks[fileId].status,
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
        console.error("Error downloading mod:", err);
        toast.error(err?.message || "Failed to download mod.", {
          title: "Download Error",
        });
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
