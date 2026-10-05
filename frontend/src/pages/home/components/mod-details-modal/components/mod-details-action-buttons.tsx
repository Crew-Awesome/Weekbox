import React from "react";
import {
  Activity,
  AlertTriangle,
  ChevronUp,
  Download,
  List,
  Loader2,
  Play,
  RefreshCw,
  Square,
  Trash2,
} from "lucide-react";
import { DownloadStatus } from "../../../../../store";
import { formatFileSize } from "../types";

export interface ModDetailsActionButtonsProps {
  variant?: "mobile" | "desktop";
  isInstalled: boolean;
  hasUpdate: boolean;
  isUpdating: boolean;
  updateProgress: number;
  handleUpdateClick: () => void;
  isStorageMigrating: boolean;
  playStatus: string;
  handleStop: () => void;
  handleManage: () => void;
  handleUninstall: () => void;
  isUninstalling: boolean;
  isLoading: boolean;
  hasNoFiles: boolean;
  hasMultipleFiles: boolean;
  validFiles: any[];
  setActiveTab: (tab: any) => void;
  handleDownload: (url: string, id: string) => void;
  singleFileProgress?: number;
  singleFileStatus?: string;
  singleFileCurrentFile?: string;
  singleFileDownloaded?: number;
  singleFileTotal?: number;
  activeDownloadsCount: number;
  isDropdownOpen?: boolean;
}

export const ModDetailsActionButtons: React.FC<ModDetailsActionButtonsProps> = ({
  variant = "desktop",
  isInstalled,
  hasUpdate,
  isUpdating,
  updateProgress,
  handleUpdateClick,
  isStorageMigrating,
  playStatus,
  handleStop,
  handleManage,
  handleUninstall,
  isUninstalling,
  isLoading,
  hasNoFiles,
  hasMultipleFiles,
  validFiles,
  setActiveTab,
  handleDownload,
  singleFileProgress,
  singleFileStatus,
  singleFileCurrentFile,
  singleFileDownloaded,
  singleFileTotal,
  activeDownloadsCount,
  isDropdownOpen,
}) => {
  const isDesktop = variant === "desktop";
  const btnPadding = isDesktop ? "py-3 md:py-4 rounded-xl px-6" : "py-3 rounded-xl";
  const btnGap = isDesktop ? "gap-2 md:gap-3" : "gap-2";
  const textSize = isDesktop ? "text-base md:text-lg" : "text-base";
  const iconSize = isDesktop ? "w-5 h-5 md:w-6 md:h-6" : "w-5 h-5";

  if (isInstalled) {
    return (
      <div className={`flex ${isDesktop ? "gap-3" : "gap-2"} w-full`}>
        {(hasUpdate || isUpdating) &&
          (isUpdating ? (
            <button
              type="button"
              disabled
              className={`flex-1 bg-amber-500/25 border border-amber-500/40 text-amber-300 ${btnPadding} flex items-center justify-center ${btnGap} font-bold cursor-wait animate-pulse`}
            >
              <Loader2 className={`${iconSize} animate-spin text-amber-400`} />
              <span className={textSize}>
                {updateProgress > 0 ? `Updating ${updateProgress}%` : "Updating..."}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleUpdateClick}
              disabled={isStorageMigrating}
              className={`flex-1 bg-amber-500 hover:bg-amber-400 text-black ${btnPadding} flex items-center justify-center ${btnGap} font-black transition-all cursor-pointer shadow-md ${
                isDesktop ? "shadow-lg hover:scale-102 active:scale-98" : ""
              } ${isStorageMigrating ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
              title="A new version or update is available for this mod"
            >
              <RefreshCw className={iconSize} />
              <span className={textSize}>Update</span>
            </button>
          ))}

        {playStatus === "launching" ? (
          <button
            disabled
            className={`flex-1 ${
              isDesktop
                ? "bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] border border-white/10"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            } ${btnPadding} flex items-center justify-center ${btnGap} font-bold cursor-wait`}
          >
            <Loader2 className={`${iconSize} animate-spin ${isDesktop ? "text-[var(--wb-primary)]" : ""}`} />
            <span className={textSize}>Launching...</span>
          </button>
        ) : playStatus === "playing" ? (
          <button
            onClick={handleStop}
            className={`flex-1 bg-emerald-600/30 hover:bg-rose-600/30 text-emerald-300 hover:text-rose-300 border border-emerald-500/40 hover:border-rose-500/40 ${btnPadding} flex items-center justify-center ${btnGap} font-bold cursor-pointer transition-all group`}
            title="Click to stop process"
          >
            <Activity className={`${iconSize} text-emerald-400 group-hover:hidden animate-pulse`} />
            <Square className={`${iconSize} fill-current text-rose-400 hidden group-hover:inline`} />
            <span className={`${textSize} group-hover:hidden`}>Playing</span>
            <span className={`${textSize} hidden group-hover:inline`}>Stop</span>
          </button>
        ) : playStatus === "stopping" ? (
          <button
            disabled
            className={`flex-1 bg-amber-600/30 text-amber-300 border border-amber-500/40 ${btnPadding} flex items-center justify-center ${btnGap} font-bold cursor-not-allowed`}
          >
            <Loader2 className={`${iconSize} animate-spin text-amber-400`} />
            <span className={`${textSize} text-amber-300`}>Stopping...</span>
          </button>
        ) : playStatus === "error" ? (
          <button
            disabled
            className={`flex-1 bg-rose-600/30 text-rose-300 border border-rose-500/40 ${btnPadding} flex items-center justify-center ${btnGap} font-bold cursor-not-allowed animate-in fade-in`}
          >
            <AlertTriangle className={`${iconSize} text-rose-400`} />
            <span className={textSize}>Error</span>
          </button>
        ) : (
          <button
            onClick={handleManage}
            className={`flex-1 bg-[var(--wb-primary)] text-[var(--wb-on-primary)] ${btnPadding} flex items-center justify-center ${btnGap} transition-all duration-300 font-bold ${
              isStorageMigrating
                ? "opacity-50 cursor-not-allowed"
                : "hover:opacity-90 cursor-pointer"
            }`}
            title={
              isStorageMigrating
                ? "Cannot launch game while storage migration is in progress"
                : "Play mod"
            }
          >
            <Play className={`${iconSize} fill-current`} />
            <span className={textSize}>Play</span>
          </button>
        )}

        <button
          onClick={handleUninstall}
          disabled={isUninstalling}
          className={`flex-1 bg-red-500/10 text-red-400 ${btnPadding} flex items-center justify-center ${btnGap} transition-all duration-300 font-bold border border-red-500/20 ${
            isStorageMigrating
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-red-500/20 cursor-pointer"
          }`}
          title={
            isStorageMigrating
              ? "Cannot uninstall while storage migration is in progress"
              : "Uninstall mod"
          }
        >
          {isUninstalling ? (
            <Loader2 className={`${iconSize} animate-spin`} />
          ) : (
            <Trash2 className={iconSize} />
          )}
          <span className={textSize}>{isUninstalling ? "Uninstalling..." : "Uninstall"}</span>
        </button>
      </div>
    );
  }

  return (
    <>
      {isLoading ? (
        <button
          disabled
          className={`w-full bg-[var(--wb-primary)] text-[var(--wb-on-primary)] ${btnPadding} flex items-center justify-center ${btnGap} font-bold opacity-80 cursor-wait`}
        >
          <Loader2 className={`${iconSize} animate-spin`} />
          <span className={textSize}>Loading...</span>
        </button>
      ) : hasNoFiles ? (
        <button
          disabled
          className={`w-full bg-[var(--wb-surface-variant)] text-[var(--wb-on-surface-variant)] cursor-not-allowed ${btnPadding} flex items-center justify-center ${btnGap} font-bold opacity-60 select-none pointer-events-auto transition-none shadow-none hover:bg-[var(--wb-surface-variant)] hover:opacity-60 hover:transform-none active:transform-none`}
        >
          <Download className={`${iconSize} pointer-events-none`} />
          <span className={`${textSize} pointer-events-none`}>No downloads available</span>
        </button>
      ) : (
        <button
          onClick={() => {
            if (isStorageMigrating) return;
            if (hasMultipleFiles) {
              setActiveTab("details");
            } else if (validFiles.length === 1) {
              handleDownload(validFiles[0]._sDownloadUrl, validFiles[0]._idRow.toString());
            }
          }}
          disabled={(!hasMultipleFiles && singleFileProgress === -1) || isStorageMigrating}
          className={`${!hasMultipleFiles && singleFileProgress === -1 ? "opacity-80 cursor-wait" : isStorageMigrating ? "opacity-50 cursor-not-allowed" : "group"} relative w-full bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] ${btnPadding} flex items-center justify-center transition-all duration-300 font-bold overflow-hidden`}
        >
          {!hasMultipleFiles && singleFileProgress !== undefined && singleFileProgress >= 0 && (
            <div
              className="absolute left-0 top-0 bottom-0 bg-black/20 pointer-events-none transition-all duration-300"
              style={{ width: `${singleFileProgress}%` }}
            />
          )}

          {!hasMultipleFiles && singleFileProgress !== undefined && singleFileProgress >= 0 && singleFileProgress < 100 && (
            <div className="absolute inset-0 bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
              <span className={`text-white font-bold ${textSize}`}>Cancel Download</span>
            </div>
          )}

          {hasMultipleFiles ? (
            <>
              <div className={`flex items-center justify-center ${btnGap} relative z-10`}>
                <List className={`${iconSize} shrink-0`} />
                <div className="flex flex-col items-center justify-center leading-tight">
                  <span className={`${textSize} leading-tight font-bold`}>Multiple Files</span>
                  {activeDownloadsCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold opacity-90 mt-0.5">
                      <span>Active Downloads</span>
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--wb-on-primary)] text-[var(--wb-primary)] text-[10px] font-black leading-none shadow-sm">
                        {activeDownloadsCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <ChevronUp className={`absolute ${isDesktop ? "right-6" : "right-4"} ${iconSize} transition-transform relative z-10 ${isDropdownOpen ? "rotate-180" : ""}`} />
            </>
          ) : (
            <div className={`flex items-center justify-center ${btnGap} relative z-10 transition-opacity duration-200 ${singleFileProgress !== undefined && singleFileProgress >= 0 && singleFileProgress < 100 ? "group-hover:opacity-0" : ""}`}>
              {singleFileProgress === -1 ? (
                <>
                  <Loader2 className={`${iconSize} animate-spin opacity-80`} />
                  <span className={textSize}>Canceling...</span>
                </>
              ) : singleFileProgress === 100 ? (
                <span className={textSize}>Completed</span>
              ) : (singleFileStatus && singleFileStatus !== DownloadStatus.DOWNLOADING) || singleFileProgress === 99 ? (
                <div className={`flex items-center justify-center ${btnGap} max-w-full px-2`}>
                  <Loader2 className={`${iconSize} animate-spin shrink-0`} />
                  <div className="flex flex-col items-center leading-tight min-w-0 overflow-hidden">
                    <span className={`${textSize} truncate max-w-full`}>
                      {singleFileStatus || "Extracting archive..."}
                    </span>
                    {singleFileCurrentFile ? (
                      <span className="text-xs font-normal opacity-80 truncate max-w-[260px] md:max-w-[340px] leading-none mt-1">
                        {singleFileCurrentFile}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : singleFileProgress !== undefined ? (
                <div className={`flex items-center justify-center ${btnGap} max-w-full px-2`}>
                  <Loader2 className={`${iconSize} animate-spin shrink-0`} />
                  <div className="flex flex-col items-center leading-tight min-w-0">
                    <span className={textSize}>
                      Downloading... {singleFileProgress}%
                    </span>
                    {singleFileDownloaded !== undefined && singleFileDownloaded > 0 ? (
                      <span className="text-xs font-normal opacity-80 leading-none mt-1">
                        {formatFileSize(singleFileDownloaded)} {singleFileTotal && singleFileTotal > 0 ? `/ ${formatFileSize(singleFileTotal)}` : ""}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <>
                  <Download className={`${iconSize} shrink-0`} />
                  <div className="flex flex-col items-start leading-tight">
                    <span className={`${textSize} leading-tight`}>Download</span>
                    {validFiles[0]?._nFilesize ? (
                      <span className="text-xs font-normal opacity-80 leading-none mt-0.5">
                        {formatFileSize(validFiles[0]._nFilesize)}
                      </span>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          )}
        </button>
      )}
    </>
  );
};
