import type { IModService, INotificationService } from "@contracts";

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

export interface StartDownloadParams {
  url: string;
  fileId: string;
  modId: string;
  modName: string;
  payload: any;
}

export interface DownloadStoreDependencies {
  mods: IModService;
  notification: INotificationService;
}

export interface DownloadStoreState {
  tasks: Record<string, ActiveDownloadTask>;
  activeModalModId: string | null;
  currentRoute: string;

  setCurrentRoute: (route: string) => void;
  setModalOpen: (modId: string | null) => void;
  startDownload: (params: StartDownloadParams) => Promise<void>;
  cancelDownload: (fileId: string) => void;
}
