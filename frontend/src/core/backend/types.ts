export type BackendOperation =
  | "backend.capabilities"
  | "backend.health"
  | "downloads.detectArchiveFormat"
  | "downloads.downloadArchive"
  | "downloads.extractArchive"
  | "downloads.googleDriveFileId"
  | "downloads.mediaFireDirectUrl"
  | "downloads.mediaFirePageError"
  | "downloads.partSizesValid"
  | "downloads.rangeSupportedFileSize"
  | "downloads.resolveExternalUrl"
  | "downloads.segments"
  | "downloads.unixMergeCommand"
  | "downloads.validateHtml"
  | "downloads.verifyArchive"
  | "downloads.windowsMergeCommand"
  | "filesystem.call"
  | "filesystem.init"
  | "filesystem.inspectMod"
  | "filesystem.installedEngines"
  | "filesystem.installedMods"
  | "filesystem.removeMod"
  | "filesystem.saveMod"
  | "gamebanana.category"
  | "gamebanana.details"
  | "gamebanana.downloadAvailable"
  | "gamebanana.downloadFiles"
  | "gamebanana.downloadOptions"
  | "gamebanana.engineForCategories"
  | "gamebanana.engineForCategory"
  | "gamebanana.engineForCategoryName"
  | "gamebanana.engineIdForSubmission"
  | "gamebanana.externalDownloadFiles"
  | "gamebanana.externalFileDetails"
  | "gamebanana.featured"
  | "gamebanana.formatBytes"
  | "gamebanana.grid"
  | "gamebanana.imageUrl"
  | "gamebanana.isDeleted"
  | "gamebanana.isExcludedCategory"
  | "gamebanana.isInCategory"
  | "gamebanana.mergePsychOnline"
  | "gamebanana.modKindForCategories"
  | "gamebanana.primaryDownloadFile"
  | "gamebanana.profile"
  | "gamebanana.psychOnline"
  | "gamebanana.requirementDetails"
  | "gamebanana.requirements"
  | "gamebanana.resolveEngine"
  | "gamebanana.ripe"
  | "gamebanana.search"
  | "gamebanana.submission"
  | "gamebanana.suggestions"
  | "gamebanana.timeAgo"
  | "gamebanana.toolDetails"
  | "gamebanana.validRecords"
  | "github.engineReleases"
  | "github.engineUpdate"
  | "network.fetch"
  | "network.setOnline"
  | "network.status"
  | "peo.details"
  | "peo.list"
  | "routing.parseDeepLink"
  | "settings.get"
  | "settings.set"
  | "state.getSelectedEngine"
  | "state.setSelectedEngine"
  | "updates.compareVersions"
  | "updates.check"
  | "updates.currentVersion"
  | "updates.install"
  | "updates.installResources"
  | "updates.installWindows"
  | "updates.normalizeVersion"
  | "updates.platformPackage"
  | "updates.releaseAsset"
  | "updates.resourcesAsset"
  | "updates.windowsPackage"
  | "system.syncProtocol";

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
  "backend.health": { ready: boolean; platform: string };
  "backend.capabilities": string[];
  "routing.parseDeepLink": { type: "mod"; id: number } | null;
  "updates.normalizeVersion": string;
  "updates.compareVersions": number;
  "network.status": { online: boolean };
  "state.getSelectedEngine": string | null;
  "settings.get": unknown;
}

export type BackendResult<Operation extends BackendOperation> =
  Operation extends keyof BackendResultMap ? BackendResultMap[Operation] : unknown;
