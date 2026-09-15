import React, { useState } from "react";
import { Wrench, RefreshCw, ShieldAlert, AlertCircle, RotateCcw } from "lucide-react";
import { Switch } from "./switch";
import { useSettingsStore } from "../../../store";
import Utils from "@utils";

export const AdvancedTab: React.FC = () => {
  const [autoCheckUpdates, setAutoCheckUpdates] = useState(true);

  const {
    preventCloseOnActive,
    confirmWarnings,
    dismissedWarnings,
    updateSetting,
    resetDismissedWarnings,
  } = useSettingsStore();

  const dismissedCount = Object.keys(dismissedWarnings).length;

  const handleResetWarnings = async () => {
    await resetDismissedWarnings();
    Utils.toast.success("Dismissed confirmation warnings have been restored!", {
      title: "Warnings Reset",
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--wb-primary)]">
          <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Advanced Options</span>
        </div>

        <div className="flex flex-col gap-3.5">
          {/* Prevent Closing When Active */}
          <div className="flex items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 transition-colors">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Prevent Close on Active Tasks
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Block closing WeekBox while a game instance is running or downloads are active
                </span>
              </div>
            </div>
            <div className="shrink-0 pl-4">
              <Switch
                checked={preventCloseOnActive}
                onChange={(val) => updateSetting("preventCloseOnActive", val)}
                ariaLabel="Toggle Prevent Close on Active Tasks"
              />
            </div>
          </div>

          {/* Confirmation Warnings */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 transition-colors gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Confirmation Warnings
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Show confirmation dialogs before deleting mods, uninstallation, or moving folders
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              {dismissedCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetWarnings}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--wb-surface-container-highest)] hover:bg-white/10 text-xs font-semibold text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] border border-white/10 transition-colors cursor-pointer"
                  title="Restore warnings that were silenced with 'Don't ask me again'"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Silenced</span>
                </button>
              )}
              <Switch
                checked={confirmWarnings}
                onChange={(val) => updateSetting("confirmWarnings", val)}
                ariaLabel="Toggle Confirmation Warnings"
              />
            </div>
          </div>

          {/* Check for Updates */}
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
