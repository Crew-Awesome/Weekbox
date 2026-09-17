import React from "react";
import { Moon, Sun, Laptop, Palette, Pipette, Sparkles, CircleDot, Image } from "lucide-react";
import { useTheme } from "../hooks/use-theme";
import { Switch } from "./switch";
import Utils from "@utils";

export const AppearanceTab: React.FC = () => {
  const { isDark, themeSetting, setThemeSetting } = useTheme();
  const { isExtractActive, setExtractActive } = Utils.hooks.useExtractColor();
  const { isCirclePatternActive, setCirclePatternActive } = Utils.hooks.useModalPattern();
  const { isModalBackdropActive, setModalBackdropActive } = Utils.hooks.useModalBackdrop();

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--wb-primary)]">
          <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Color & Theme</span>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-4 p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 transition-colors">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                {themeSetting === "system" ? (
                  <Laptop className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
                ) : isDark ? (
                  <Moon className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
                ) : (
                  <Sun className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  App Theme
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  {themeSetting === "system"
                    ? `System default (currently ${isDark ? "Dark" : "Light"}) - adapts automatically to OS`
                    : isDark
                    ? "Dark theme active for low-light environments"
                    : "Light theme active with high contrast"}
                </span>
              </div>
            </div>

            {/* 3-way Theme Selector */}
            <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[var(--wb-surface-container-highest)]/70 border border-[var(--wb-outline-variant)]/30">
              <button
                type="button"
                onClick={() => setThemeSetting("system")}
                className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  themeSetting === "system"
                    ? "bg-[var(--wb-primary)] text-[var(--wb-on-primary)] shadow-sm scale-[1.02]"
                    : "text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-white/5"
                }`}
              >
                <Laptop className="w-4 h-4 shrink-0" />
                <span className="truncate">System</span>
              </button>
              <button
                type="button"
                onClick={() => setThemeSetting("dark")}
                className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  themeSetting === "dark"
                    ? "bg-[var(--wb-primary)] text-[var(--wb-on-primary)] shadow-sm scale-[1.02]"
                    : "text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-white/5"
                }`}
              >
                <Moon className="w-4 h-4 shrink-0" />
                <span className="truncate">Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setThemeSetting("light")}
                className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  themeSetting === "light"
                    ? "bg-[var(--wb-primary)] text-[var(--wb-on-primary)] shadow-sm scale-[1.02]"
                    : "text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-white/5"
                }`}
              >
                <Sun className="w-4 h-4 shrink-0" />
                <span className="truncate">Light</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 transition-colors">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <Pipette className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Dynamic Thumbnail Colors
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Extract predominant colors from mod thumbnails to dynamically tint cards and banners on hover
                </span>
              </div>
            </div>

            <div className="shrink-0 pl-4">
              <Switch
                checked={isExtractActive}
                onChange={(checked) => setExtractActive(checked)}
                ariaLabel="Toggle Dynamic Thumbnail Colors"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--wb-primary)]">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Visual Effects</span>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 transition-colors">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <CircleDot className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Mod Details Dot Pattern
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Show a stylized dot grid pattern on the background overlay when viewing mod details
                </span>
              </div>
            </div>

            <div className="shrink-0 pl-4">
              <Switch
                checked={isCirclePatternActive}
                onChange={(checked) => setCirclePatternActive(checked)}
                ariaLabel="Toggle Mod Details Dot Pattern"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 transition-colors">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <Image className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Ambient Thumbnail Backdrop
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Display the mod thumbnail as an ambient blurred backdrop behind the overlay when viewing mod details
                </span>
              </div>
            </div>

            <div className="shrink-0 pl-4">
              <Switch
                checked={isModalBackdropActive}
                onChange={(checked) => setModalBackdropActive(checked)}
                ariaLabel="Toggle Ambient Thumbnail Backdrop"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
