import React, { useState } from "react";
import { Wrench, FolderArchive, RefreshCw } from "lucide-react";
import { Switch } from "./switch";
import { LanguageTab } from "./language-tab";

export const AdvancedTab: React.FC = () => {
  const [autoExtract, setAutoExtract] = useState(true);
  const [autoCheckUpdates, setAutoCheckUpdates] = useState(true);

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <LanguageTab />

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--wb-primary)]">
          <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Advanced Options</span>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 transition-colors">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <FolderArchive className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Auto-decompress Mods
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Automatically unpack archives and flatten folders upon download
                </span>
              </div>
            </div>
            <div className="shrink-0 pl-4">
              <Switch
                checked={autoExtract}
                onChange={setAutoExtract}
                ariaLabel="Toggle Auto-decompress Mods"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 transition-colors">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <RefreshCw className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Check for Updates
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Check for newer versions of Weekbox automatically on startup
                </span>
              </div>
            </div>
            <div className="shrink-0 pl-4">
              <Switch
                checked={autoCheckUpdates}
                onChange={setAutoCheckUpdates}
                ariaLabel="Toggle Check for Updates"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
