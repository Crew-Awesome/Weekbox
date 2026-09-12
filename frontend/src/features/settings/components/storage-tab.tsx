import React, { useState } from "react";
import { HardDrive, Trash2, Folder, DownloadCloud } from "lucide-react";

export const StorageTab: React.FC = () => {
  const [concurrentDownloads, setConcurrentDownloads] = useState("3");
  const [clearing, setClearing] = useState(false);
  const [clearedMessage, setClearedMessage] = useState(false);

  const handleClearCache = () => {
    setClearing(true);
    setTimeout(() => {
      setClearing(false);
      setClearedMessage(true);
      setTimeout(() => setClearedMessage(false), 2500);
    }, 600);
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--wb-primary)]">
          <HardDrive className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Storage & Directory Paths</span>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <Folder className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Mods Folder Location
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] font-mono">
                  %APPDATA%\weekbox\mods
                </span>
              </div>
            </div>

            <button
              type="button"
              className="px-4 py-2.5 rounded-2xl bg-[var(--wb-surface-container-highest)] hover:bg-[var(--wb-surface-container-high)] text-[var(--wb-on-surface)] text-sm font-semibold border border-white/10 transition-colors cursor-pointer shrink-0"
            >
              Change Location
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <DownloadCloud className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Simultaneous Downloads
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Limit maximum concurrent network downloads
                </span>
              </div>
            </div>

            <select
              value={concurrentDownloads}
              onChange={(e) => setConcurrentDownloads(e.target.value)}
              className="bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] text-sm font-semibold px-4 py-2.5 rounded-2xl border border-white/10 outline-none cursor-pointer hover:border-[var(--wb-primary)]/50 transition-colors shrink-0"
            >
              <option value="1">1 download</option>
              <option value="2">2 downloads</option>
              <option value="3">3 downloads (recommended)</option>
              <option value="5">5 downloads</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <Trash2 className="w-6 h-6 sm:w-7 sm:h-7 text-rose-400" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Temporary Cache
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Delete residual downloaded archives and thumbnail cache
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={clearing}
              onClick={handleClearCache}
              className="px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-sm font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              {clearing ? "Clearing..." : clearedMessage ? "Cache Cleared!" : "Clear Cache"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
