import React from "react";
import {
  ExternalLink,
  Calendar,
  RefreshCw,
  Eye,
  Heart,
  Download,
  HardDrive,
  FileCheck,
  ShieldCheck,
  Hash,
  Layers,
  Loader2,
  Play,
} from "lucide-react";
import type { ModItem } from "../../../types";
import { formatFileSize } from "../types";
import { useDownloadStore } from "../../../../../store";

interface ModDetailsTabProps {
  displayCard: ModItem;
  engineName?: string;
  formatDate: (timestamp?: number) => string;
  formatFullDate?: (timestamp?: number) => string;
  onDownloadFile?: (url: string, id: string) => void;
  onManageFile?: (file?: any) => void;
  isInstalled?: boolean;
  className?: string;
}

/**
 * @description Mod Details Tab.
 * Displays available downloadable files in first view, followed by all technical details and metadata.
 */
export const ModDetailsTab: React.FC<ModDetailsTabProps> = ({
  displayCard,
  engineName,
  formatDate,
  formatFullDate,
  onDownloadFile,
  onManageFile,
  isInstalled = false,
  className = "",
}) => {
  const downloadTasks = useDownloadStore((s) => s.tasks);
  const files = Object.values(displayCard.files || {}) as any[];
  const hasUpdates =
    displayCard.updatedAt && displayCard.updatedAt !== displayCard.submittedAt;
  const updatesCount =
    displayCard.updatesCount !== undefined
      ? displayCard.updatesCount
      : displayCard.updates?.length || (hasUpdates ? 1 : 0);

  return (
    <div className={`flex flex-col gap-6 pb-6 ${className}`}>
      {/**
       * First view: Available Downloads / Files list
       */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--wb-primary)] uppercase tracking-wider">
            <HardDrive className="w-4 h-4" />
            <span>Available Downloads ({files.length})</span>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[var(--wb-surface-bright)]/40 border border-[var(--wb-outline-variant)]/20 text-center text-sm text-[var(--wb-on-surface-variant)] flex flex-col items-center justify-center gap-2">
            <HardDrive className="w-8 h-8 opacity-40 mb-1" />
            <span className="font-semibold">No downloads available</span>
            <span className="text-xs opacity-70">No downloadable files reported for this mod.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {files.map((file, idx) => {
              const task = downloadTasks[file._idRow];
              const prog = task?.progress;
              const isDownloading = prog !== undefined && prog >= 0 && prog < 100;
              const isCompleted = prog === 100;
              const cardData = displayCard as any;
              const getFileTimestamp = (val: any) => {
                if (!val) return 0;
                if (typeof val === "number") return val < 10000000000 ? val * 1000 : val;
                const t = new Date(val).getTime();
                return isNaN(t) ? 0 : t;
              };
              const installedTime = getFileTimestamp(cardData.installedAt);
              const fileTime = getFileTimestamp(file._tsDateAdded || file.date || file._tsDateModified);
              const fileHasUpdate = isInstalled && installedTime > 0 && fileTime > installedTime + 60000;

              const isFileInstalled =
                (isInstalled &&
                  (String(cardData.downloadedFileId) === String(file._idRow) ||
                    String(cardData.installedFileId) === String(file._idRow) ||
                    files.length === 1)) ||
                isCompleted;

              return (
                <div
                  key={file._idRow || `file-${idx}`}
                  className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20 hover:border-[var(--wb-primary)]/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-[var(--wb-primary)] shrink-0" />
                        <span className="text-sm font-bold text-[var(--wb-on-surface)] truncate">
                          {file._sFile}
                        </span>
                      </div>
                      {file._sDescription && (
                        <span className="text-xs text-[var(--wb-on-surface-variant)] mt-1 break-words opacity-90">
                          {file._sDescription}
                        </span>
                      )}
                    </div>

                    {file._sDownloadUrl && (
                      isFileInstalled ? (
                        <div className="shrink-0 flex items-center gap-2">
                          {fileHasUpdate && onDownloadFile && (
                            <button
                              type="button"
                              onClick={() => onDownloadFile(file._sDownloadUrl, String(file._idRow))}
                              disabled={isDownloading}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                isDownloading
                                  ? "bg-amber-500/20 text-amber-300 cursor-wait"
                                  : "bg-amber-500 hover:bg-amber-400 text-black cursor-pointer shadow-sm"
                              }`}
                              title="Update to this version"
                            >
                              {isDownloading ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                  <span>{prog}%</span>
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                                  <span>Update</span>
                                </>
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onManageFile?.(file)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] cursor-pointer shadow-sm"
                          >
                            <Play className="w-3.5 h-3.5 shrink-0 fill-current" />
                            <span>Play</span>
                          </button>
                        </div>
                      ) : onDownloadFile ? (
                        <button
                          type="button"
                          onClick={() => onDownloadFile(file._sDownloadUrl, String(file._idRow))}
                          disabled={isDownloading}
                          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isDownloading
                              ? "bg-[var(--wb-primary)] text-[var(--wb-on-primary)] cursor-wait"
                              : "bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] cursor-pointer shadow-sm"
                          }`}
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                              <span>{prog}%</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5 shrink-0" />
                              <span>Download</span>
                            </>
                          )}
                        </button>
                      ) : null
                    )}
                  </div>

                  <div className="flex items-center gap-4 flex-wrap text-xs text-[var(--wb-on-surface-variant)] opacity-80 pt-2 border-t border-[var(--wb-outline-variant)]/15">
                    <span className="font-semibold text-[var(--wb-on-surface)]">
                      {formatFileSize(file._nFilesize)}
                    </span>
                    <span>
                      {file._nDownloadCount ? `${Intl.NumberFormat().format(file._nDownloadCount)} downloads` : "0 downloads"}
                    </span>
                    {file._tsDateAdded && (
                      <span>Added {formatDate(file._tsDateAdded)}</span>
                    )}
                    {file._sAnalysisState && (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <ShieldCheck className="w-3 h-3" />
                        {file._sAnalysisState === "passed" ? "Clean / Verified" : file._sAnalysisState}
                      </span>
                    )}
                  </div>

                  {file._sMd5Checksum && (
                    <div className="flex items-center gap-1 text-[11px] text-[var(--wb-on-surface-variant)] opacity-70 font-mono">
                      <Hash className="w-3 h-3 text-[var(--wb-primary)] shrink-0" />
                      <span className="truncate">MD5: {file._sMd5Checksum}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/**
       * Quick Stats Grid
       */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--wb-primary)] uppercase tracking-wider">
          <Layers className="w-4 h-4" />
          <span>Mod Statistics</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="flex flex-col p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20">
            <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] mb-1">
              <Calendar className="w-3.5 h-3.5 text-[var(--wb-primary)]" />
              <span>Uploaded</span>
            </div>
            <span
              className="text-sm font-semibold text-[var(--wb-on-surface)] truncate"
              title={formatFullDate ? formatFullDate(displayCard.submittedAt) : undefined}
            >
              {formatDate(displayCard.submittedAt)}
            </span>
          </div>

          <div className="flex flex-col p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20">
            <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] mb-1">
              <RefreshCw className="w-3.5 h-3.5 text-[var(--wb-primary)]" />
              <span>Last Updated</span>
            </div>
            <span
              className="text-sm font-semibold text-[var(--wb-on-surface)] truncate"
              title={formatFullDate ? formatFullDate(displayCard.updatedAt) : undefined}
            >
              {displayCard.updatedAt ? formatDate(displayCard.updatedAt) : "Never"}
            </span>
          </div>

          {displayCard.installedAt && (
            <div className="flex flex-col p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20">
              <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] mb-1">
                <HardDrive className="w-3.5 h-3.5 text-[var(--wb-primary)]" />
                <span>Installed</span>
              </div>
              <span
                className="text-sm font-semibold text-[var(--wb-on-surface)] truncate"
                title={formatFullDate ? formatFullDate(displayCard.installedAt) : undefined}
              >
                {formatDate(displayCard.installedAt)}
              </span>
            </div>
          )}

          <div className="flex flex-col p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20">
            <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] mb-1">
              <Layers className="w-3.5 h-3.5 text-[var(--wb-primary)]" />
              <span>Updates</span>
            </div>
            <span className="text-sm font-semibold text-[var(--wb-on-surface)]">
              {updatesCount} {updatesCount === 1 ? "update" : "updates"}
            </span>
          </div>

          <div className="flex flex-col p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20">
            <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] mb-1">
              <Eye className="w-3.5 h-3.5 text-[var(--wb-primary)]" />
              <span>Views</span>
            </div>
            <span className="text-sm font-semibold text-[var(--wb-on-surface)]">
              {displayCard.views !== undefined ? Intl.NumberFormat().format(displayCard.views) : "N/A"}
            </span>
          </div>

          <div className="flex flex-col p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20">
            <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] mb-1">
              <Heart className="w-3.5 h-3.5 text-[var(--wb-primary)]" />
              <span>Likes</span>
            </div>
            <span className="text-sm font-semibold text-[var(--wb-on-surface)]">
              {displayCard.likes !== undefined ? Intl.NumberFormat().format(displayCard.likes) : "N/A"}
            </span>
          </div>

          <div className="flex flex-col p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20">
            <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] mb-1">
              <Download className="w-3.5 h-3.5 text-[var(--wb-primary)]" />
              <span>Downloads</span>
            </div>
            <span className="text-sm font-semibold text-[var(--wb-on-surface)]">
              {displayCard.downloads !== undefined ? Intl.NumberFormat().format(displayCard.downloads) : "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/**
       * External Links & References
       */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--wb-primary)] uppercase tracking-wider">
          <ExternalLink className="w-4 h-4" />
          <span>External Links & References</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <a
            href={`https://gamebanana.com/mods/${displayCard.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 hover:bg-[var(--wb-surface-bright)] border border-[var(--wb-outline-variant)]/20 transition-all text-xs text-[var(--wb-on-surface)] font-semibold group"
          >
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/icons/app/gamebanana.webp"
                alt="GameBanana"
                className="w-4 h-4 object-contain opacity-80"
              />
              <span>GameBanana Mod Page</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--wb-on-surface-variant)] group-hover:text-[var(--wb-primary)] transition-colors" />
          </a>

          {engineName && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20 text-xs text-[var(--wb-on-surface-variant)]">
              <span>Engine</span>
              <span className="font-semibold text-[var(--wb-on-surface)]">{engineName}</span>
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20 text-xs text-[var(--wb-on-surface-variant)]">
            <span>GameBanana Mod ID</span>
            <span className="font-mono font-bold text-[var(--wb-on-surface)]">#{displayCard.id}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20 text-xs text-[var(--wb-on-surface-variant)]">
            <span>Content Rating</span>
            <span className={`font-semibold ${displayCard.isNsfw ? "text-red-400" : "text-emerald-400"}`}>
              {displayCard.isNsfw ? "NSFW (18+)" : "Safe / All Ages"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
