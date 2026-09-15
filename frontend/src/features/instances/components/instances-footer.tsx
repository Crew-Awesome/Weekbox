import React, { useState } from "react";
import {
  Download,
  Play,
  Square,
  Loader2,
  HardDrive,
  FolderOpen,
  Trash2,
  RefreshCw,
  MoreVertical,
  X,
  Activity,
  AlertTriangle,
} from "lucide-react";

interface InstancesFooterProps {
  isExecutable: boolean;
  icon?: string;
  title: string;
  version: string;
  downloadUrl?: string | null;
  isInstalled?: boolean;
  isNightly?: boolean;
  isNightlyOutdated?: boolean;
  onDownload?: () => void;
  onCancelDownload?: () => void;
  onUpdate?: () => void;
  onUninstall?: () => void;
  onOpenFolder?: () => void;
  onPlay?: () => void;
  onStop?: () => void;
  playStatus?: "idle" | "launching" | "playing" | "stopping" | "error";
  isStorageMigrating?: boolean;
  isDownloading?: boolean;
  downloadProgress?: number;
  downloadStatusText?: string;
  currentExtractingFile?: string;
}

/**
 * Sticky footer with a higher z-index and glassmorphism styling for the Instances view.
 * Displays:
 * - Left: Large engine/mod icon and metadata
 * - Middle/Right: In-button progress bar during download with hover cancel and extracting filename
 * - Right actions: Play, Update (if Nightly is outdated), Uninstall, and 3-dots menu (Open Folder, Reinstall)
 */
export const InstancesFooter: React.FC<InstancesFooterProps> = ({
  isExecutable,
  icon,
  title,
  version,
  downloadUrl,
  isInstalled = false,
  isNightly = false,
  isNightlyOutdated = false,
  onDownload,
  onCancelDownload,
  onUpdate,
  onUninstall,
  onOpenFolder,
  onPlay,
  onStop,
  playStatus = "idle",
  isStorageMigrating = false,
  isDownloading = false,
  downloadProgress = 0,
  downloadStatusText,
  currentExtractingFile,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [isHoveringDownload, setIsHoveringDownload] = useState<boolean>(false);

  return (
    <div className="sticky bottom-0 z-50 w-full bg-[var(--wb-surface-container)]/70 backdrop-blur-2xl border-t border-white/10 px-6 md:px-10 py-5 sm:py-6 flex items-center justify-between shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
      {/** Left Metadata Section */}
      <div className="flex items-center gap-5 min-w-0 pr-6">
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[var(--wb-surface-bright)] p-2.5 flex items-center justify-center shrink-0 border border-[var(--wb-outline-variant)]/20 shadow-inner">
          {icon ? (
            <img
              src={icon}
              alt={title}
              className="w-full h-full object-contain brightness-125"
            />
          ) : (
            <HardDrive className="w-7 h-7 text-[var(--wb-primary)]" />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-lg sm:text-xl md:text-2xl font-black text-[var(--wb-on-surface)] truncate leading-tight tracking-tight">
            {title || "Select an instance"}
          </span>
          {version && (
            <span className="text-sm sm:text-base font-bold text-[var(--wb-primary)] leading-tight mt-1 truncate">
              {version === "Nightly" ? "Nightly Build" : `Version ${version}`}
            </span>
          )}
        </div>
      </div>

      {/** Right Action Button Area */}
      <div className="shrink-0 flex items-center gap-3">
        {isExecutable ? (
          onPlay ? (
            playStatus === "launching" ? (
              <button
                type="button"
                disabled
                className="flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] text-base sm:text-lg font-black transition-all shadow-lg cursor-not-allowed border border-white/10"
              >
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-[var(--wb-primary)]" />
                <span>Launching...</span>
              </button>
            ) : playStatus === "playing" ? (
              <button
                type="button"
                onClick={onStop || onPlay}
                className="flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl bg-emerald-600/30 hover:bg-rose-600/30 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 hover:border-rose-500/40 text-base sm:text-lg font-black transition-all cursor-pointer shadow-lg shadow-emerald-950/40 hover:scale-105 active:scale-95 group"
                title="Click to stop process"
              >
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 group-hover:hidden animate-pulse" />
                <Square className="w-5 h-5 sm:w-6 sm:h-6 fill-current text-rose-400 hidden group-hover:inline" />
                <span className="group-hover:hidden">Playing</span>
                <span className="hidden group-hover:inline">Stop</span>
              </button>
            ) : playStatus === "stopping" ? (
              <button
                type="button"
                disabled
                className="flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl bg-amber-600/30 text-amber-300 border border-amber-500/40 text-base sm:text-lg font-black transition-all shadow-lg cursor-not-allowed"
              >
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-amber-400" />
                <span>Stopping...</span>
              </button>
            ) : playStatus === "error" ? (
              <button
                type="button"
                disabled
                className="flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl bg-rose-600/30 text-rose-300 border border-rose-500/40 text-base sm:text-lg font-black transition-all shadow-lg cursor-not-allowed animate-in fade-in"
              >
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400" />
                <span>Error</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onPlay}
                className={`flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl bg-[var(--wb-primary)] text-[var(--wb-on-primary)] text-base sm:text-lg font-black transition-all shadow-lg ${
                  isStorageMigrating
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:opacity-90 cursor-pointer hover:scale-105 active:scale-95"
                }`}
                title={
                  isStorageMigrating
                    ? "Cannot launch game while storage migration is in progress"
                    : "Play mod"
                }
              >
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                <span>Play</span>
              </button>
            )
          ) : null
        ) : isDownloading ? (
          <button
            type="button"
            onClick={onCancelDownload}
            onMouseEnter={() => setIsHoveringDownload(true)}
            onMouseLeave={() => setIsHoveringDownload(false)}
            className={`relative overflow-hidden flex items-center justify-between gap-4 px-7 sm:px-9 py-3.5 sm:py-4 rounded-2xl transition-all shadow-lg min-w-[280px] sm:min-w-[340px] cursor-pointer select-none ${
              isHoveringDownload
                ? "bg-red-500/20 border-2 border-red-500/80 text-red-300"
                : "bg-[var(--wb-surface-container-highest)] border border-[var(--wb-primary)]/50 text-[var(--wb-on-surface)]"
            }`}
            title={isHoveringDownload ? "Click to cancel download" : undefined}
          >
            {!isHoveringDownload && (
              <div
                className="absolute inset-0 bg-[var(--wb-primary)]/35 transition-all duration-300 pointer-events-none"
                style={{ width: `${Math.min(Math.max(downloadProgress, 0), 100)}%` }}
              />
            )}

            {isHoveringDownload ? (
              <div className="relative z-10 flex items-center gap-2.5 min-w-0 w-full justify-center text-red-400 font-extrabold animate-in fade-in duration-150">
                <X className="w-5 h-5 shrink-0" />
                <span className="text-sm sm:text-base tracking-wide">Cancel Download</span>
              </div>
            ) : (
              <>
                <div className="relative z-10 flex flex-col items-start min-w-0 text-left">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Loader2 className="w-5 h-5 animate-spin text-[var(--wb-primary)] shrink-0" />
                    <span className="truncate text-sm sm:text-base font-black">
                      {downloadStatusText || "Downloading..."}
                    </span>
                  </div>
                  {currentExtractingFile && (
                    <span className="text-[11px] text-[var(--wb-on-surface-variant)] truncate max-w-[200px] sm:max-w-[240px] ml-7 mt-0.5 font-normal">
                      {currentExtractingFile}
                    </span>
                  )}
                </div>
                <span className="relative z-10 font-mono font-black text-[var(--wb-primary)] shrink-0 ml-3">
                  {downloadProgress}%
                </span>
              </>
            )}
          </button>
        ) : isInstalled ? (
          <div className="flex items-center gap-3">
            {onPlay && (
              playStatus === "launching" ? (
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-2.5 px-7 sm:px-9 py-3.5 sm:py-4 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] text-base sm:text-lg font-black transition-all shadow-lg cursor-not-allowed border border-white/10"
                >
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-[var(--wb-primary)]" />
                  <span>Launching...</span>
                </button>
              ) : playStatus === "playing" ? (
                <button
                  type="button"
                  onClick={onStop || onPlay}
                  className="flex items-center gap-2.5 px-7 sm:px-9 py-3.5 sm:py-4 rounded-2xl bg-emerald-600/30 hover:bg-rose-600/30 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 hover:border-rose-500/40 text-base sm:text-lg font-black transition-all cursor-pointer shadow-lg shadow-emerald-950/40 hover:scale-105 active:scale-95 group"
                  title="Click to stop process"
                >
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 group-hover:hidden animate-pulse" />
                  <Square className="w-5 h-5 sm:w-6 sm:h-6 fill-current text-rose-400 hidden group-hover:inline" />
                  <span className="group-hover:hidden">Playing</span>
                  <span className="hidden group-hover:inline">Stop</span>
                </button>
              ) : playStatus === "stopping" ? (
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-2.5 px-7 sm:px-9 py-3.5 sm:py-4 rounded-2xl bg-amber-600/30 text-amber-300 border border-amber-500/40 text-base sm:text-lg font-black transition-all shadow-lg cursor-not-allowed"
                >
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-amber-400" />
                  <span>Stopping...</span>
                </button>
              ) : playStatus === "error" ? (
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-2.5 px-7 sm:px-9 py-3.5 sm:py-4 rounded-2xl bg-rose-600/30 text-rose-300 border border-rose-500/40 text-base sm:text-lg font-black transition-all shadow-lg cursor-not-allowed animate-in fade-in"
                >
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400" />
                  <span>Error</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onPlay}
                  className={`flex items-center gap-2.5 px-7 sm:px-9 py-3.5 sm:py-4 rounded-2xl bg-[var(--wb-primary)] text-[var(--wb-on-primary)] text-base sm:text-lg font-black transition-all shadow-lg ${
                    isStorageMigrating
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:opacity-90 cursor-pointer hover:scale-105 active:scale-95"
                  }`}
                  title={
                    isStorageMigrating
                      ? "Cannot launch game while storage migration is in progress"
                      : "Launch game"
                  }
                >
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                  <span>Play</span>
                </button>
              )
            )}

            {isNightly && isNightlyOutdated && onUpdate && (
              <button
                type="button"
                onClick={onUpdate}
                className="flex items-center gap-2 px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-sm sm:text-base font-black transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
                title="Update Nightly build"
              >
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Update</span>
              </button>
            )}

            {onUninstall && (
              <button
                type="button"
                onClick={onUninstall}
                className={`flex items-center gap-2 px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm sm:text-base font-bold transition-all shadow-sm ${
                  isStorageMigrating
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-red-500/25 cursor-pointer hover:scale-105 active:scale-95"
                }`}
                title={
                  isStorageMigrating
                    ? "Cannot uninstall while storage migration is in progress"
                    : "Uninstall this engine version"
                }
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Uninstall</span>
              </button>
            )}

            {/** 3-dots dropdown menu for secondary actions */}
            <div className="relative" onMouseLeave={() => setShowMoreMenu(false)}>
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-3.5 sm:p-4 rounded-2xl bg-[var(--wb-surface-bright)] hover:bg-[var(--wb-surface-container-highest)] border border-[var(--wb-outline-variant)]/30 text-[var(--wb-on-surface)] flex items-center justify-center transition-all cursor-pointer shadow-md"
                title="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMoreMenu && (
                <div className="absolute bottom-full right-0 mb-3 w-48 bg-[var(--wb-surface-container)] border border-[var(--wb-outline-variant)]/40 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-1">
                  {onOpenFolder && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        onOpenFolder();
                      }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl hover:bg-[var(--wb-surface-container-highest)] text-sm font-bold text-[var(--wb-on-surface)] transition-colors cursor-pointer text-left"
                    >
                      <FolderOpen className="w-4 h-4 text-[var(--wb-primary)]" />
                      <span>Open Folder</span>
                    </button>
                  )}

                  {downloadUrl && onDownload && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        onDownload();
                      }}
                      className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl hover:bg-[var(--wb-surface-container-highest)] text-sm font-bold text-[var(--wb-primary)] transition-colors cursor-pointer text-left"
                    >
                      <Download className="w-4 h-4" />
                      <span>Reinstall</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : downloadUrl ? (
          <button
            type="button"
            disabled={isStorageMigrating}
            onClick={onDownload}
            className={`flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl bg-[var(--wb-primary)] text-[var(--wb-on-primary)] text-base sm:text-lg font-black transition-all shadow-lg ${
              isStorageMigrating
                ? "opacity-50 cursor-not-allowed pointer-events-none"
                : "hover:opacity-90 cursor-pointer hover:scale-105 active:scale-95"
            }`}
            title={isStorageMigrating ? "Cannot download while storage is being relocated" : undefined}
          >
            <Download className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>{isStorageMigrating ? "Moving..." : "Download"}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
};

