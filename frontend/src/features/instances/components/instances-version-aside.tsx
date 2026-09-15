import React, { useMemo } from "react";
import { Loader2, HardDrive, Check } from "lucide-react";
import type { EngineReleaseItem } from "../../../core/services/engines/engine-releases.service";

interface InstancesVersionAsideProps {
  isExecutable: boolean;
  releases: EngineReleaseItem[];
  selectedVersion: string;
  onSelectVersion: (version: string) => void;
  isLoadingReleases?: boolean;
  installedMods: any[];
  selectedModId: string | null;
  onSelectMod: (mod: any) => void;
  isLoadingMods?: boolean;
  engineIcon?: string;
  sortOption?: "date" | "version";
  onlyInstalled?: boolean;
  installedVersions?: string[];
}

/**
 * Left aside panel in the Instances view.
 * In standard mode: Displays the clean, large list of releases without icons or title header.
 * Nightly releases display their last update date instead of a badge tag.
 * In executable mode: Displays the list of installed executable mods with large cards.
 */
export const InstancesVersionAside: React.FC<InstancesVersionAsideProps> = ({
  isExecutable,
  releases,
  selectedVersion,
  onSelectVersion,
  isLoadingReleases = false,
  installedMods,
  selectedModId,
  onSelectMod,
  isLoadingMods = false,
  sortOption = "date",
  onlyInstalled = false,
  installedVersions = [],
}) => {
  const processedReleases = useMemo(() => {
    let list = [...releases];

    if (onlyInstalled) {
      const set = new Set(installedVersions.map((v) => v.toLowerCase().replace(/^v/, "")));
      list = list.filter((r) => set.has(r.version.toLowerCase().replace(/^v/, "")));

      /**
       * If an engine version is installed on disk but not present in GitHub releases,
       * synthesize an entry so it still appears in the installed list.
       */
      for (const instVer of installedVersions) {
        const cleanInst = instVer.toLowerCase().replace(/^v/, "");
        const alreadyInList = list.some((r) => r.version.toLowerCase().replace(/^v/, "") === cleanInst);
        if (!alreadyInList) {
          list.push({
            id: `installed-${instVer}`,
            version: instVer,
            name: `Version ${instVer}`,
            body: `### Version ${instVer}\n\nThis engine version is installed locally on your system.`,
            releasedAt: null,
            downloadUrl: null,
          });
        }
      }
    }

    if (sortOption === "version") {
      list.sort((a, b) => {
        if (a.isNightly) return -1;
        if (b.isNightly) return 1;
        return b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: "base" });
      });
    } else if (sortOption === "date") {
      list.sort((a, b) => {
        const dateA = a.releasedAt ? new Date(a.releasedAt).getTime() : 0;
        const dateB = b.releasedAt ? new Date(b.releasedAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    return list;
  }, [releases, onlyInstalled, installedVersions, sortOption]);

  if (isExecutable) {
    return (
      <aside className="w-full md:w-80 lg:w-96 xl:w-[420px] flex flex-col shrink-0 border-b md:border-b-0 md:border-r border-[var(--wb-outline-variant)]/20 bg-[var(--wb-surface-container-low)]/40 overflow-y-auto max-h-[40vh] md:max-h-none md:h-full">
        <div className="p-5 border-b border-[var(--wb-outline-variant)]/15 flex items-center justify-between sticky top-0 bg-[var(--wb-surface-container)]/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-[var(--wb-primary)]" />
            <span className="font-extrabold text-base md:text-lg text-[var(--wb-on-surface)]">
              Installed Executables
            </span>
          </div>
          <span className="text-xs md:text-sm font-bold px-2.5 py-1 rounded-full bg-[var(--wb-surface-bright)] text-[var(--wb-on-surface-variant)]">
            {installedMods.length}
          </span>
        </div>

        <div className="flex flex-col p-3 sm:p-4 gap-2.5 overflow-y-auto">
          {isLoadingMods ? (
            <div className="flex flex-col items-center justify-center p-12 gap-3 opacity-60">
              <Loader2 className="w-7 h-7 animate-spin text-[var(--wb-primary)]" />
              <span className="text-sm font-semibold">Loading installed mods...</span>
            </div>
          ) : installedMods.length === 0 ? (
            <div className="p-12 text-center text-sm text-[var(--wb-on-surface-variant)] opacity-70">
              No executable mods currently installed.
            </div>
          ) : (
            installedMods.map((mod) => {
              const isSelected = String(mod.id) === String(selectedModId);
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => onSelectMod(mod)}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer text-left w-full border ${
                    isSelected
                      ? "bg-[var(--wb-primary)]/15 border-[var(--wb-primary)]/50 text-[var(--wb-primary)] shadow-md scale-[1.01]"
                      : "bg-[var(--wb-surface-container)]/60 hover:bg-[var(--wb-surface-container-high)] border-transparent text-[var(--wb-on-surface)]"
                  }`}
                >
                  <img
                    src="/assets/icons/categories/exe.png"
                    alt="Executable"
                    className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 brightness-125"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-base sm:text-lg font-extrabold truncate leading-tight">
                      {mod.name || mod.title}
                    </span>
                    <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] opacity-80 truncate mt-1">
                      by {mod.author || "Unknown"}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-full md:w-80 lg:w-96 xl:w-[420px] flex flex-col shrink-0 border-b md:border-b-0 md:border-r border-[var(--wb-outline-variant)]/20 bg-[var(--wb-surface-container-low)]/40 overflow-y-auto max-h-[35vh] md:max-h-none md:h-full">
      <div className="flex flex-col p-3 sm:p-4 gap-2.5 overflow-y-auto">
        {isLoadingReleases ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3 opacity-60">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--wb-primary)]" />
            <span className="text-sm font-semibold">Fetching engine versions...</span>
          </div>
        ) : processedReleases.length === 0 ? (
          <div className="p-12 text-center text-sm text-[var(--wb-on-surface-variant)] opacity-70">
            {onlyInstalled
              ? "No installed versions found for this engine."
              : "No release versions available."}
          </div>
        ) : (
          processedReleases.map((rel) => {
            const isSelected = rel.version === selectedVersion;
            const isInstalled = installedVersions.some(
              (v) => v.toLowerCase() === rel.version.toLowerCase()
            );

            return (
              <button
                key={rel.id || rel.version}
                type="button"
                onClick={() => onSelectVersion(rel.version)}
                className={`flex items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-4.5 rounded-2xl transition-all cursor-pointer text-left w-full border ${
                  isSelected
                    ? "bg-[var(--wb-primary)]/15 border-[var(--wb-primary)]/50 text-[var(--wb-primary)] shadow-md scale-[1.01]"
                    : "bg-[var(--wb-surface-container)]/60 hover:bg-[var(--wb-surface-container-high)] border-transparent text-[var(--wb-on-surface)]"
                }`}
              >
                <div className="flex items-center min-w-0">
                  <span className="text-base sm:text-lg md:text-xl font-black truncate tracking-wide">
                    {rel.version === "Nightly" ? "Nightly" : `v${rel.version}`}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {isInstalled && (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                      <Check className="w-3 h-3" />
                      <span className="hidden sm:inline">Installed</span>
                    </span>
                  )}
                  {rel.releasedAt ? (
                    <span className="text-xs sm:text-sm font-semibold text-[var(--wb-on-surface-variant)] opacity-75">
                      {new Date(rel.releasedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

