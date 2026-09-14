import React, { useState } from "react";
import {
  Download,
  Play,
  Loader2,
  HardDrive,
  FolderOpen,
  Trash2,
  RefreshCw,
  MoreVertical,
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
  onUpdate?: () => void;
  onUninstall?: () => void;
  onOpenFolder?: () => void;
  onPlay?: () => void;
  isDownloading?: boolean;
  downloadProgress?: number;
  downloadStatusText?: string;
}

/**
 * Sticky footer with a higher z-index and glassmorphism styling for the Instances view.
 * Displays:
 * - Left: Large engine/mod icon and metadata
 * - Middle/Right: In-button progress bar during download
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
  onUpdate,
  onUninstall,
  onOpenFolder,
  onPlay,
  isDownloading = false,
  downloadProgress = 0,
  downloadStatusText,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

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
            <button
              type="button"
              onClick={onPlay}
              className="flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] text-base sm:text-lg font-black transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
            >
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
              <span>Play</span>
            </button>
          ) : null
        ) : isDownloading ? (
          <div className="relative overflow-hidden flex items-center justify-between gap-4 px-7 sm:px-9 py-3.5 sm:py-4 rounded-2xl bg-[var(--wb-surface-container-highest)] border border-[var(--wb-primary)]/50 text-[var(--wb-on-surface)] text-sm sm:text-base font-black shadow-lg min-w-[280px] sm:min-w-[320px]">
            <div
              className="absolute inset-0 bg-[var(--wb-primary)]/35 transition-all duration-300 pointer-events-none"
              style={{ width: `${Math.min(Math.max(downloadProgress, 0), 100)}%` }}
            />
            <div className="relative z-10 flex items-center gap-2.5 min-w-0">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--wb-primary)] shrink-0" />
              <span className="truncate">{downloadStatusText || "Downloading..."}</span>
            </div>
            <span className="relative z-10 font-mono font-black text-[var(--wb-primary)] shrink-0 ml-3">
              {downloadProgress}%
            </span>
          </div>
        ) : isInstalled ? (
          <div className="flex items-center gap-3">
            {onPlay && (
              <button
                type="button"
                onClick={onPlay}
                className="flex items-center gap-2.5 px-7 sm:px-9 py-3.5 sm:py-4 rounded-2xl bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] text-base sm:text-lg font-black transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
              >
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                <span>Play</span>
              </button>
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
                className="flex items-center gap-2 px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-sm sm:text-base font-bold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                title="Uninstall this engine version"
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
            onClick={onDownload}
            className="flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] text-base sm:text-lg font-black transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
          >
            <Download className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>Download</span>
          </button>
        ) : null}
      </div>
    </div>
  );
};

