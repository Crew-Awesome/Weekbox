/**
 * Centralized download and installation state definitions for WeekBox.
 * Consumed by download-store, desktop adapter, mod details modal, and toasts.
 */

import { DownloadStatus, type DownloadStatusType } from "@contracts";

export { DownloadStatus, type DownloadStatusType };

/**
 * Helper to produce human-readable status text for UI buttons, toasts, and details modal.
 */
export function formatDownloadStatus(
  progress?: number,
  status?: string,
  defaultText: string = "Download"
): string {
  if (progress === -1) {
    return DownloadStatus.CANCELING;
  }
  if (
    status &&
    (status === DownloadStatus.FLATTENING ||
      status === DownloadStatus.EXTRACTING ||
      status === DownloadStatus.FINALIZING ||
      status === DownloadStatus.STARTING)
  ) {
    return status;
  }
  if (progress === 100) {
    return DownloadStatus.COMPLETED;
  }
  if (status && status !== DownloadStatus.DOWNLOADING && (progress === 99 || progress !== undefined)) {
    return status;
  }
  if (progress !== undefined && progress >= 0 && progress < 100) {
    return `Downloading... ${progress}%`;
  }
  return defaultText;
}
