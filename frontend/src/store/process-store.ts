import { create } from "zustand";
import type { IProcessLauncher, IPlatformEvents, ITaskMonitor } from "@contracts";
import { container } from "../core/container";
import Utils from "@utils";
import { useStorageMigrationStore } from "./storage-migration-store";
import { App } from "@capacitor/app";

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
  checkRunningInstances: () => Promise<void>;
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
      const state = get();
      const direct = state.instances[instanceId]?.status;
      if (direct && direct !== "idle") {
        return direct;
      }

      // Cross-match for VSlice:
      const isVSliceQuery =
        instanceId.toLowerCase().includes("vslice") ||
        instanceId.toLowerCase().includes("base_game");

      if (isVSliceQuery) {
        const match = Object.values(state.instances).find(
          (inst) =>
            (inst.status === "playing" || inst.status === "launching" || inst.status === "stopping") &&
            (inst.folderPath?.toLowerCase().includes("vslice") ||
              inst.folderPath?.toLowerCase().includes("base_game") ||
              inst.folderPath === "vslice")
        );
        if (match) return match.status;
      }

      return "idle";
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

    checkRunningInstances: async () => {
      const currentInstances = get().instances;
      const runningEntries = Object.entries(currentInstances).filter(([_, inst]) => {
        return (
          inst.status === "playing" ||
          inst.status === "launching" ||
          inst.status === "stopping"
        );
      });

      if (runningEntries.length === 0) return;

      try {
        // 1. If platform says no process at all is running, reset all to idle
        if (deps.process.isAnyProcessRunning) {
          const anyRunning = await deps.process.isAnyProcessRunning();
          if (!anyRunning) {
            set((state) => {
              const next = { ...state.instances };
              for (const [k] of runningEntries) {
                if (next[k] && next[k].status !== "idle") {
                  next[k] = { ...next[k], status: "idle" };
                }
              }
              return { instances: next };
            });
            return;
          }
        }

        // 2. Check each specific running instance
        if (deps.process.isInstanceRunning) {
          for (const [key, inst] of runningEntries) {
            const isAlive =
              (await deps.process.isInstanceRunning(key)) ||
              (inst.folderPath ? await deps.process.isInstanceRunning(inst.folderPath) : false);

            if (!isAlive) {
              set((state) => {
                const next = { ...state.instances };
                if (next[key] && next[key].status !== "idle") {
                  next[key] = { ...next[key], status: "idle" };
                }
                return { instances: next };
              });
            }
          }
        }
      } catch {}
    },

    stopInstance: async (instanceId: string) => {
      const { instances } = get();
      let targetInstanceId = instanceId;
      let instance = instances[instanceId];

      if (
        !instance ||
        (instance.status !== "playing" &&
          instance.status !== "launching" &&
          instance.status !== "stopping")
      ) {
        // Cross-match check: If stopping a vslice engine or mod, check if any running instance has vslice folderPath
        const isVSlice =
          instanceId.toLowerCase().includes("vslice") ||
          instanceId.toLowerCase().includes("base_game");

        if (isVSlice) {
          const matchKey = Object.keys(instances).find((k) => {
            const inst = instances[k];
            return (
              (inst.status === "playing" ||
                inst.status === "launching" ||
                inst.status === "stopping") &&
              (inst.folderPath?.toLowerCase().includes("vslice") ||
                inst.folderPath?.toLowerCase().includes("base_game") ||
                inst.folderPath === "vslice" ||
                k.toLowerCase().includes("vslice"))
            );
          });
          if (matchKey) {
            targetInstanceId = matchKey;
            instance = instances[matchKey];
          }
        }
      }

      // If still not found, check if there's only 1 active running instance in the whole store
      if (
        !instance ||
        (instance.status !== "playing" &&
          instance.status !== "launching" &&
          instance.status !== "stopping")
      ) {
        const runningKeys = Object.keys(instances).filter(
          (k) =>
            instances[k].status === "playing" ||
            instances[k].status === "launching" ||
            instances[k].status === "stopping"
        );
        if (runningKeys.length === 1) {
          targetInstanceId = runningKeys[0];
          instance = instances[targetInstanceId];
        }
      }

      if (
        !instance ||
        (instance.status !== "playing" &&
          instance.status !== "launching" &&
          instance.status !== "stopping")
      ) {
        // Even if local state was idle, try to kill process on platform directly
        if (deps.process.killProcess) {
          await deps.process.killProcess(instanceId).catch(() => {});
        }
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
          ...(targetInstanceId !== instanceId && state.instances[targetInstanceId]
            ? {
                [targetInstanceId]: {
                  ...state.instances[targetInstanceId],
                  status: "stopping",
                },
              }
            : {}),
        },
      }));

      try {
        if (deps.process.killProcess) {
          await deps.process.killProcess(targetInstanceId);
          if (targetInstanceId !== instanceId) {
            await deps.process.killProcess(instanceId).catch(() => {});
          }
        }
        set((state) => {
          const next = { ...state.instances };
          if (next[instanceId]) next[instanceId] = { ...next[instanceId], status: "idle" };
          if (next[targetInstanceId]) next[targetInstanceId] = { ...next[targetInstanceId], status: "idle" };
          return { instances: next };
        });
        return true;
      } catch (err: any) {
        set((state) => {
          const next = { ...state.instances };
          if (next[instanceId]) next[instanceId] = { ...next[instanceId], status: "idle" };
          if (next[targetInstanceId]) next[targetInstanceId] = { ...next[targetInstanceId], status: "idle" };
          return { instances: next };
        });
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
  if (typeof window !== "undefined") {
    if (deps.events?.onEvent) {
      deps.events.onEvent("process:exit", (detail: any) => {
        const instanceId = detail?.instanceId;
        store.setState((state) => {
          const copy = { ...state.instances };
          if (instanceId && copy[instanceId]) {
            copy[instanceId] = {
              ...copy[instanceId],
              status: "idle",
            };
          } else {
            // Check by folderPath or PID if instanceId wasn't directly matched
            for (const [k, val] of Object.entries(copy)) {
              if (
                val.pid === detail?.pid ||
                (detail?.folderPath && val.folderPath === detail.folderPath)
              ) {
                copy[k] = { ...copy[k], status: "idle" };
              }
            }
          }
          return { instances: copy };
        });
      });
    }

    /* Periodic liveness polling */
    setInterval(() => {
      if (store.getState().hasRunningProcesses()) {
        store.getState().checkRunningInstances();
      }
    }, 1000);

    /* Check liveness on window focus & document visibilitychange */
    const handleFocusCheck = () => {
      if (store.getState().hasRunningProcesses()) {
        store.getState().checkRunningInstances();
      }
    };

    window.addEventListener("focus", handleFocusCheck);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        handleFocusCheck();
      }
    });

    /* Native mobile app resume check */
    try {
      App.addListener("resume", () => {
        handleFocusCheck();
      }).catch(() => {});

      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          handleFocusCheck();
        }
      }).catch(() => {});
    } catch {}

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
