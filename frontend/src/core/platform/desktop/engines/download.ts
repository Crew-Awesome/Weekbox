import type { DownloadProgressCallback } from "@contracts";
import { DownloadStatus } from "@contracts";
import type { DesktopTransport } from "../transport";
import { sanitizeEngineId, sanitizeVersion } from "./utils";
import type { StoragePathProvider } from "./verification";

/**
 * Executes download, extraction, structure flattening, and registration of an engine release.
 */
export async function downloadEngine(
  transport: DesktopTransport,
  storage: StoragePathProvider,
  registerFn: (engineId: string, version: string, metadata?: Record<string, any>) => Promise<void>,
  url: string,
  engineId: string,
  version: string,
  onProgress?: DownloadProgressCallback,
  signal?: AbortSignal
): Promise<void> {
  const safeEngineId = sanitizeEngineId(engineId);
  const safeVersion = sanitizeVersion(version);

  const enginesDir = await storage.getEnginesPath();
  const engineDir = `${enginesDir}/${safeEngineId}`;
  const targetFolder = `${engineDir}/${safeVersion}`;
  const tempArchivePath = `${enginesDir}/_temp_engine_${safeEngineId}_${safeVersion}.zip`;

  let unsubscribe: (() => void) | undefined;
  const progressId = `dl_engine_${Date.now()}_${Math.random()}`;

  if (onProgress) {
    unsubscribe = transport.onEvent("download:progress", (data: any) => {
      if (data && data.progressId === progressId) {
        if (
          data.flattening ||
          data.status === DownloadStatus.FLATTENING ||
          data.status === "Flattening folder structure..."
        ) {
          onProgress(99, DownloadStatus.FLATTENING);
          return;
        }

        if (data.currentFile) {
          onProgress(99, DownloadStatus.EXTRACTING, {
            currentFile: data.currentFile,
          });
          return;
        }

        let percent = 0;
        if (data.total > 0) {
          percent = Math.min(98, Math.round((data.downloaded / data.total) * 98));
        } else {
          percent = Math.min(98, Math.round(data.downloaded / (1024 * 1024)));
        }
        onProgress(percent, "Downloading...", {
          downloaded: data.downloaded,
          total: data.total,
        });
      }
    });
  }

  try {
    await transport.call("fs.createDirectory" as any, { path: enginesDir }).catch(() => {});
    await transport.call("fs.createDirectory" as any, { path: engineDir }).catch(() => {});
    await transport.call("fs.createDirectory" as any, { path: targetFolder }).catch(() => {});

    await transport.call(
      "http.downloadToFile" as any,
      {
        url,
        destPath: tempArchivePath,
        progressId,
        options: {},
      },
      signal,
      0
    );

    if (signal?.aborted) {
      await transport.call("fs.remove" as any, { path: tempArchivePath }).catch(() => {});
      return;
    }

    onProgress?.(99, DownloadStatus.EXTRACTING);

    await transport.call(
      "fs.extractArchive" as any,
      {
        archivePath: tempArchivePath,
        destFolder: targetFolder,
        progressId,
      },
      signal,
      0
    );

    await transport.call("fs.remove" as any, { path: tempArchivePath }).catch(() => {});

    onProgress?.(99, DownloadStatus.FLATTENING);
    await transport
      .call("fs.flattenFolder" as any, { path: targetFolder, progressId }, signal, 0)
      .catch(() => {});

    await registerFn(safeEngineId, safeVersion, {
      downloadUrl: url,
      installedAt: new Date().toISOString(),
    });

    onProgress?.(100, DownloadStatus.COMPLETED);

    if (typeof window !== "undefined") {
      const sysEnabled =
        localStorage.getItem("wb_system_notifications") !== "false" &&
        localStorage.getItem("wb_os_notify_download") !== "false";
      if (sysEnabled) {
        try {
          await transport.call("notification.show" as any, {
            title: "Engine Installed",
            content: `${engineId} v${version} has been downloaded and installed.`,
            icon: "INFO",
          });
        } catch (notifErr) {
          console.warn("Could not dispatch system notification on engine download finish:", notifErr);
        }
      }
    }
  } catch (error: any) {
    await transport.call("fs.remove" as any, { path: tempArchivePath }).catch(() => {});
    if (error?.message !== "Cancelled") {
      console.error(`[Download/Extract Failed] Engine "${engineId}" v${version}:`, error);
    }
    throw error;
  } finally {
    if (unsubscribe) unsubscribe();
  }
}
