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
  | "http.fetchJson"
  | "http.fetchText";

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
}

export type BackendResult<Operation extends BackendOperation> =
  Operation extends keyof BackendResultMap ? BackendResultMap[Operation] : unknown;

