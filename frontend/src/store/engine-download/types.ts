import type { IEngineService, INotificationService } from "@contracts";

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

export interface StartEngineDownloadParams {
  engineId: string;
  version: string;
  engineName: string;
  downloadUrl: string;
}

export interface EngineDownloadStoreDependencies {
  engines: IEngineService;
  notification: INotificationService;
}

export interface EngineDownloadStoreState {
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
  startEngineDownload: (params: StartEngineDownloadParams) => Promise<void>;
  cancelEngineDownload: () => Promise<void>;
}
