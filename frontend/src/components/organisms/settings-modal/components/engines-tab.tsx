import React, { useState } from "react";
import { Cpu, FolderOpen, ChevronRight, Zap } from "lucide-react";
import { Switch } from "./switch";

export const EnginesTab: React.FC = () => {
  const [autoDetect, setAutoDetect] = useState(true);
  const [fallbackEngine, setFallbackEngine] = useState("Psych Engine 0.7.3");

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--wb-primary)]">
          <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Engine Configuration</span>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Preferred Engine
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Default engine used when launching generic or unconfigured mods
                </span>
              </div>
            </div>

            <select
              value={fallbackEngine}
              onChange={(e) => setFallbackEngine(e.target.value)}
              className="bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] text-sm font-semibold px-4 py-2.5 rounded-2xl border border-white/10 outline-none cursor-pointer hover:border-[var(--wb-primary)]/50 transition-colors shrink-0"
            >
              <option value="Psych Engine 0.7.3">Psych Engine 0.7.3</option>
              <option value="Codename Engine">Codename Engine</option>
              <option value="Kade Engine">Kade Engine</option>
              <option value="Vanilla V-Slice">Vanilla V-Slice</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 transition-colors">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <Cpu className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Auto-scan Installed Engines
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Automatically discover local engine installations in common folders
                </span>
              </div>
            </div>
            <div className="shrink-0 pl-4">
              <Switch
                checked={autoDetect}
                onChange={setAutoDetect}
                ariaLabel="Auto-scan Installed Engines"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 transition-colors">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <FolderOpen className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Custom Engines Path
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Directory where portable engine binaries are located
                </span>
              </div>
            </div>

            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--wb-surface-container-highest)] hover:bg-[var(--wb-surface-container-high)] text-[var(--wb-on-surface)] text-sm font-semibold border border-white/10 transition-colors cursor-pointer shrink-0"
            >
              <span>Browse</span>
              <ChevronRight className="w-4 h-4 text-[var(--wb-on-surface-variant)]" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
