import React from "react";
import { Moon, Sun, Palette } from "lucide-react";
import { useTheme } from "../hooks/use-theme";
import { Switch } from "./switch";

export const AppearanceTab: React.FC = () => {
  const { isDark, setTheme } = useTheme();

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--wb-primary)]">
          <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Color Mode</span>
        </div>

        <div className="flex items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 transition-colors">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
              {isDark ? (
                <Moon className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              ) : (
                <Sun className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                Dark Mode
              </span>
              <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                {isDark
                  ? "Dark theme is currently active for low-light environments"
                  : "Light theme is currently active with high contrast"}
              </span>
            </div>
          </div>

          <div className="shrink-0 pl-4">
            <Switch
              checked={isDark}
              onChange={(checked) => setTheme(checked ? "dark" : "light")}
              ariaLabel="Toggle Dark Mode"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
