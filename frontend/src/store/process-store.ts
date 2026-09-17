import { create } from "zustand";
import type { IProcessLauncher, IPlatformEvents, ITaskMonitor } from "@contracts";
import { container } from "../core/container";
import Utils from "@utils";
import { useStorageMigrationStore } from "./storage-migration-store";

export type PlayStatus = "idle" | "launching" | "playing" | "stopping" | "error";

export interface ProcessInstanceState {
  status: PlayStatus;
  pid?: number;
  folderPath?: string;
  error?: string;
}

export interface ProcessStoreDependencies {
  process: IProcessLauncher;
  events?: IPlatformEvents;
  taskMonitor?: ITaskMonitor;
}

export interface ProcessStoreState {
  instances: Record<string, ProcessInstanceState>;
  getPlayState: (instanceId: string) => PlayStatus;
  hasRunningProcesses: () => boolean;
  launchInstance: (
    instanceId: string,
    folderPath: string,
    options?:
      | {
          preferredExe?: string;
          args?: string[];
          modFolderPath?: string;
          modFolderPaths?: string[];
        }
      | string
  ) => Promise<boolean>;
  stopInstance: (instanceId: string) => Promise<boolean>;
  resetInstance: (instanceId: string) => void;
}

/**
 * Creates an instance of the Process Store with injected dependencies (DIP / ISP).
 */
export function createProcessStore(customDeps?: Partial<ProcessStoreDependencies>) {
  const deps: ProcessStoreDependencies = {
    process: customDeps?.process || container.process,
    events: customDeps?.events || container.platform,
    taskMonitor: customDeps?.taskMonitor || container.taskMonitor,
  };

  const store = create<ProcessStoreState>((set, get) => ({
    instances: {},

    getPlayState: (instanceId: string) => {
      return get().instances[instanceId]?.status || "idle";
    },

    hasRunningProcesses: () => {
      const { instances } = get();
      return Object.values(instances).some(
        (inst) =>
          inst.status === "playing" ||
          inst.status === "launching" ||
          inst.status === "stopping"
      );
    },

    resetInstance: (instanceId: string) => {
      set((state) => {
        const copy = { ...state.instances };
        delete copy[instanceId];
        return { instances: copy };
      });
    },

    stopInstance: async (instanceId: string) => {
      const instance = get().instances[instanceId];
      if (!instance || (instance.status !== "playing" && instance.status !== "launching")) {
        return false;
      }

      /* Set status immediately to stopping */
      set((state) => ({
        instances: {
          ...state.instances,
          [instanceId]: {
            ...state.instances[instanceId],
            status: "stopping",
          },
        },
      }));

      try {
        if (deps.process.killProcess) {
          await deps.process.killProcess(instanceId);
        }
        return true;
      } catch (err: any) {
        Utils.toast.error(err?.message || "Failed to stop game process.", {
          title: "Stop Error",
        });
        return false;
      }
    },

    launchInstance: async (
      instanceId: string,
      folderPath: string,
      options?:
        | {
            preferredExe?: string;
            args?: string[];
            modFolderPath?: string;
            modFolderPaths?: string[];
          }
        | string
    ) => {
      const preferredExe = typeof options === "string" ? options : options?.preferredExe;
      const args = typeof options === "object" ? options?.args : undefined;
      const modFolderPath = typeof options === "object" ? options?.modFolderPath : undefined;
      const modFolderPaths = typeof options === "object" ? options?.modFolderPaths : undefined;

      /* Guard: prevent launching any game while storage relocation is in progress */
      if (useStorageMigrationStore.getState().isMigrating) {
        Utils.toast.warning(
          "Cannot launch game while storage migration is in progress. Please wait for the migration to complete.",
          { title: "Storage Relocation in Progress" }
        );
        return false;
      }

      /* Set state immediately to launching */
      set((state) => ({
        instances: {
          ...state.instances,
          [instanceId]: {
            status: "launching",
            folderPath,
          },
        },
      }));

      try {
        if (!deps.process.launchExecutable) {
          throw new Error("Game launching is not available on this platform.");
        }

        const res = await deps.process.launchExecutable(folderPath, {
          executableName: preferredExe,
          instanceId,
          args,
          modFolderPath,
          modFolderPaths,
        });

        if (!res.ok) {
          throw new Error(res.error || "Failed to launch game executable.");
        }

        /* Process launched successfully */
        set((state) => ({
          instances: {
            ...state.instances,
            [instanceId]: {
              status: "playing",
              pid: res.pid,
              folderPath,
            },
          },
        }));

        return true;
      } catch (err: any) {
        const errMsg = err?.message || String(err);

        /* Transition to error state */
        set((state) => ({
          instances: {
            ...state.instances,
            [instanceId]: {
              status: "error",
              folderPath,
              error: errMsg,
            },
          },
        }));

        Utils.toast.error(errMsg, {
          title: "Launch Failed",
        });

        /* Revert back to idle after 1 second */
        setTimeout(() => {
          set((state) => {
            const current = state.instances[instanceId];
            if (current && current.status === "error") {
              return {
                instances: {
                  ...state.instances,
                  [instanceId]: {
                    status: "idle",
                    folderPath,
                  },
                },
              };
            }
            return state;
          });
        }, 1000);

        return false;
      }
    },
  }));

  /* Subscribe to platform process exit events */
  if (typeof window !== "undefined" && deps.events?.onEvent) {
    deps.events.onEvent("process:exit", (detail: any) => {
      const instanceId = detail?.instanceId;
      if (instanceId) {
        store.setState((state) => {
          const copy = { ...state.instances };
          if (copy[instanceId]) {
            copy[instanceId] = {
              ...copy[instanceId],
              status: "idle",
            };
          }
          return { instances: copy };
        });
      }
    });

    /* Register active tasks checker via typed TaskMonitor (DIP) */
    deps.taskMonitor?.registerActiveTaskChecker(() => {
      return store.getState().hasRunningProcesses();
    });
  }

  return store;
}

/**
 * Global default process store.
 */
export const useProcessStore = createProcessStore();
