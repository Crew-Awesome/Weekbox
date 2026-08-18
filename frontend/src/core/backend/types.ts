export type BackendOperation =
  | "fs.readDirectory"
  | "fs.createDirectory"
  | "fs.readFile"
  | "fs.readBinaryFile"
  | "fs.writeFile"
  | "fs.writeBinaryFile"
  | "fs.exists"
  | "fs.remove"
  | "fs.getStats"
  | "fs.extractArchive"
  | "http.fetchJson"
  | "http.fetchText"
  | "http.downloadToFile"
  | "window.minimize"
  | "window.maximize"
  | "window.unmaximize"
  | "window.isMaximized"
  | "window.setFullScreen"
  | "window.exitFullScreen"
  | "window.show"
  | "window.hide"
  | "window.focus"
  | "window.move"
  | "window.setSize"
  | "window.getSize"
  | "window.getPosition"
  | "window.getDisplays"
  | "window.close"
  | "window.center";

export interface BackendRequest {
  requestId: string;
  operation: BackendOperation;
  params?: unknown;
}

export interface BackendError {
  name: string;
  message: string;
}

export interface BackendResponse<T = unknown> {
  requestId: string;
  ok: boolean;
  data?: T;
  error?: BackendError;
}

export interface BackendResultMap {
  "fs.readDirectory": { entry: string; type: "FILE" | "DIRECTORY" }[];
  "fs.readFile": string;
  "fs.exists": boolean;
  "fs.extractArchive": void;
  "http.downloadToFile": void;
  "window.isMaximized": boolean;
  "window.getSize": { width: number; height: number };
  "window.getPosition": { x: number; y: number };
  "window.getDisplays": any[];
}

export type BackendResult<Operation extends BackendOperation> =
  Operation extends keyof BackendResultMap
    ? BackendResultMap[Operation]
    : unknown;
