import React, { useState, useRef, useEffect } from "react";
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
  ExternalLink,
  Check,
} from "lucide-react";

interface InstancesFooterProps {
  isExecutable: boolean;
  isBaseGameMobile?: boolean;
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
 * Responsive sticky footer with glassmorphism styling for the Instances view.
 * Displays:
 * - Left: Engine/mod icon and metadata
 * - Middle/Right: In-button progress bar during download with hover cancel
 * - Right actions: Play, Update, Uninstall, Play Store / App Store redirects, and secondary menus
 */
export const InstancesFooter: React.FC<InstancesFooterProps> = ({
  isExecutable,
  isBaseGameMobile = false,
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
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMoreMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMoreMenu]);

  const isApple =
    typeof navigator !== "undefined" &&
    (navigator.userAgent.includes("iPhone") || navigator.userAgent.includes("iPad"));

  return (
    <div className="sticky bottom-0 z-30 w-full bg-[var(--wb-surface-container)]/85 backdrop-blur-2xl border-t border-white/10 px-4 sm:px-6 md:px-10 pt-3.5 pb-28 sm:py-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
      {/** Left Metadata Section */}
      <div className="flex items-center gap-3 sm:gap-5 min-w-0 pr-0 sm:pr-6">
        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl bg-[var(--wb-surface-bright)] p-2 sm:p-2.5 flex items-center justify-center shrink-0 border border-[var(--wb-outline-variant)]/20 shadow-inner">
          {icon ? (
            <img
              src={icon}
              alt={title}
              className="w-full h-full object-contain brightness-125"
            />
          ) : (
            <HardDrive className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg md:text-2xl font-black text-[var(--wb-on-surface)] truncate leading-tight tracking-tight">
              {title || "Select an instance"}
            </span>
            {isBaseGameMobile && isInstalled && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg shrink-0">
                <Check className="w-3 h-3" />
                <span>Installed</span>
              </span>
            )}
          </div>
          {version && (
            <span className="text-xs sm:text-sm md:text-base font-bold text-[var(--wb-primary)] leading-tight mt-0.5 sm:mt-1 truncate">
              {version === "Nightly" ? "Nightly Build" : `Version ${version}`}
            </span>
          )}
        </div>
      </div>

      {/** Right Action Button Area */}
      <div className="shrink-0 flex items-center justify-end sm:justify-start gap-2.5 sm:gap-3 flex-wrap">
        {isExecutable ? (
          onPlay ? (
            playStatus === "launching" ? (
              <button
                type="button"
                disabled
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-10 py-3 sm:py-4 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] text-sm sm:text-lg font-black transition-all shadow-lg cursor-not-allowed border border-white/10"
              >
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-[var(--wb-primary)]" />
                <span>Launching...</span>
              </button>
            ) : playStatus === "playing" ? (
              <button
                type="button"
                onClick={onStop || onPlay}
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-10 py-3 sm:py-4 rounded-2xl bg-emerald-600/30 hover:bg-rose-600/30 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 hover:border-rose-500/40 text-sm sm:text-lg font-black transition-all cursor-pointer shadow-lg shadow-emerald-950/40 hover:scale-105 active:scale-95 group"
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
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-10 py-3 sm:py-4 rounded-2xl bg-amber-600/30 text-amber-300 border border-amber-500/40 text-sm sm:text-lg font-black transition-all shadow-lg cursor-not-allowed"
              >
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-amber-400" />
                <span>Stopping...</span>
              </button>
            ) : playStatus === "error" ? (
              <button
                type="button"
                disabled
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-10 py-3 sm:py-4 rounded-2xl bg-rose-600/30 text-rose-300 border border-rose-500/40 text-sm sm:text-lg font-black transition-all shadow-lg cursor-not-allowed animate-in fade-in"
              >
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400" />
                <span>Error</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onPlay}
                className={`w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-10 py-3 sm:py-4 rounded-2xl bg-[var(--wb-primary)] text-[var(--wb-on-primary)] text-sm sm:text-lg font-black transition-all shadow-lg ${
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
        ) : isBaseGameMobile ? (
          isInstalled ? (
            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2.5">
              <button
                type="button"
                onClick={onPlay}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2.5 px-3 sm:px-9 py-3 sm:py-4 rounded-2xl bg-[var(--wb-primary)] text-[var(--wb-on-primary)] text-xs sm:text-lg font-black transition-all shadow-lg hover:opacity-90 cursor-pointer hover:scale-105 active:scale-95"
                title="Launch Friday Night Funkin' mobile app"
              >
                <Play className="w-4 h-4 sm:w-6 sm:h-6 fill-current shrink-0" />
                <span className="truncate">Launch</span>
              </button>

              {onUninstall && (
                <button
                  type="button"
                  onClick={onUninstall}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 sm:py-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs sm:text-base font-bold transition-all shadow-sm hover:bg-red-500/25 cursor-pointer hover:scale-105 active:scale-95"
                  title="Uninstall Friday Night Funkin'"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span className="truncate">Uninstall</span>
                </button>
              )}

              <button
                type="button"
                onClick={onDownload}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 sm:py-4 rounded-2xl bg-[var(--wb-surface-container-high)] hover:bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] transition-all cursor-pointer border border-[var(--wb-outline-variant)]/60 text-xs sm:text-base font-bold shadow-sm hover:scale-105 active:scale-95"
                title="Open Store page"
              >
                <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="truncate">Store</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onDownload}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-9 py-3 sm:py-4 rounded-2xl bg-[var(--wb-primary)] text-[var(--wb-on-primary)] text-sm sm:text-lg font-black transition-all shadow-lg hover:opacity-90 cursor-pointer hover:scale-105 active:scale-95"
              title="Download from official store"
            >
              <ExternalLink className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>{isApple ? "Get on App Store" : "Get on Google Play"}</span>
            </button>
          )
        ) : isDownloading ? (
          <button
            type="button"
            onClick={onCancelDownload}
            onMouseEnter={() => setIsHoveringDownload(true)}
            onMouseLeave={() => setIsHoveringDownload(false)}
            className={`relative overflow-hidden flex items-center justify-between gap-4 px-6 sm:px-9 py-3 sm:py-4 rounded-2xl transition-all shadow-lg w-full sm:w-auto min-w-[240px] sm:min-w-[340px] cursor-pointer select-none ${
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
                    <span className="text-[11px] text-[var(--wb-on-surface-variant)] truncate max-w-[160px] sm:max-w-[240px] ml-7 mt-0.5 font-normal">
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
          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {onPlay && (
              playStatus === "launching" ? (
                <button
                  type="button"
                  disabled
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 sm:px-9 py-3 sm:py-4 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] text-sm sm:text-lg font-black transition-all shadow-lg cursor-not-allowed border border-white/10"
                >
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-[var(--wb-primary)]" />
                  <span>Launching...</span>
                </button>
              ) : playStatus === "playing" ? (
                <button
                  type="button"
                  onClick={onStop || onPlay}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 sm:px-9 py-3 sm:py-4 rounded-2xl bg-emerald-600/30 hover:bg-rose-600/30 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 hover:border-rose-500/40 text-sm sm:text-lg font-black transition-all cursor-pointer shadow-lg shadow-emerald-950/40 hover:scale-105 active:scale-95 group"
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
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 sm:px-9 py-3 sm:py-4 rounded-2xl bg-amber-600/30 text-amber-300 border border-amber-500/40 text-sm sm:text-lg font-black transition-all shadow-lg cursor-not-allowed"
                >
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-amber-400" />
                  <span>Stopping...</span>
                </button>
              ) : playStatus === "error" ? (
                <button
                  type="button"
                  disabled
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 sm:px-9 py-3 sm:py-4 rounded-2xl bg-rose-600/30 text-rose-300 border border-rose-500/40 text-sm sm:text-lg font-black transition-all shadow-lg cursor-not-allowed animate-in fade-in"
                >
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400" />
                  <span>Error</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onPlay}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-6 sm:px-9 py-3 sm:py-4 rounded-2xl bg-[var(--wb-primary)] text-[var(--wb-on-primary)] text-sm sm:text-lg font-black transition-all shadow-lg ${
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
                  <span>Launch</span>
                </button>
              )
            )}

            {isNightly && isNightlyOutdated && onUpdate && (
              <button
                type="button"
                onClick={onUpdate}
                className="flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-xs sm:text-base font-black transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
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
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs sm:text-base font-bold transition-all shadow-sm ${
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

            {/* 3-dots dropdown menu for secondary actions */}
            <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2 sm:p-2.5 rounded-2xl text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-white/5 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
                title="More options"
              >
                <MoreVertical className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>

              {showMoreMenu && (
                <div className="absolute bottom-full right-0 mb-3 w-56 sm:w-64 bg-[var(--wb-surface-container)] border border-[var(--wb-outline-variant)]/60 rounded-3xl p-2.5 shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  {onOpenFolder && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        onOpenFolder();
                      }}
                      className="flex items-center gap-3 w-full px-4 py-3 sm:py-3.5 rounded-2xl hover:bg-[var(--wb-surface-container-highest)] text-sm sm:text-lg font-bold text-[var(--wb-on-surface)] transition-all cursor-pointer text-left group"
                    >
                      <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--wb-primary)] shrink-0 group-hover:scale-110 transition-transform" />
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
                      className="flex items-center gap-3 w-full px-4 py-3 sm:py-3.5 rounded-2xl hover:bg-[var(--wb-surface-container-highest)] text-sm sm:text-lg font-bold text-[var(--wb-primary)] transition-all cursor-pointer text-left group"
                    >
                      <Download className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 group-hover:scale-110 transition-transform" />
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
            className={`w-full sm:w-auto flex items-center justify-center gap-3 px-6 sm:px-10 py-3 sm:py-4 rounded-2xl bg-[var(--wb-primary)] text-[var(--wb-on-primary)] text-sm sm:text-lg font-black transition-all shadow-lg ${
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
