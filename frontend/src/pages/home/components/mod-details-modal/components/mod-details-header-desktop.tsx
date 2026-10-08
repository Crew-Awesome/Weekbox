import React from "react";
import {
  ChevronDown,
  Download,
  ExternalLink,
  HardDrive,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Tag,
} from "lucide-react";
import { getSupportedEngineCategories } from "../../../../../core/services/gamebanana/constants";

export interface ModDetailsHeaderDesktopProps {
  displayCard: any;
  engineName: string;
  isInstalled: boolean;
  localInstalledAt?: number;
  formatDate: (timestamp?: number) => string;
  formatFullDate: (timestamp?: number) => string;
  hoverTooltip: "submitted" | "updated" | "installed" | null;
  setHoverTooltip: React.Dispatch<React.SetStateAction<"submitted" | "updated" | "installed" | null>>;
  isEngineDropdownOpen: boolean;
  setIsEngineDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  engineDropdownRef: React.RefObject<HTMLDivElement | null>;
  handleSelectEngine: (cat: any) => void;
  isExecutable: boolean;
  installedEngineVersions: string[];
  isVersionDropdownOpen: boolean;
  setIsVersionDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  versionDropdownRef: React.RefObject<HTMLDivElement | null>;
  selectedVersion: string;
  handleSelectVersion: (ver: string) => void;
  handleInstallLatestEngine: () => void;
  isInstallingEngine: boolean;
  handleOpenFolder?: () => void;
}

/**
 * @description Renders the desktop header section of the Mod Details modal, including title, dates, and engine selection.
 * @param {ModDetailsHeaderDesktopProps} props - The component props.
 * @returns {JSX.Element} The desktop header component.
 */
export const ModDetailsHeaderDesktop: React.FC<ModDetailsHeaderDesktopProps> = ({
  displayCard,
  engineName,
  isInstalled,
  localInstalledAt,
  formatDate,
  formatFullDate,
  hoverTooltip,
  setHoverTooltip,
  isEngineDropdownOpen,
  setIsEngineDropdownOpen,
  engineDropdownRef,
  handleSelectEngine,
  isExecutable,
  installedEngineVersions,
  isVersionDropdownOpen,
  setIsVersionDropdownOpen,
  versionDropdownRef,
  selectedVersion,
  handleSelectVersion,
  handleInstallLatestEngine,
  isInstallingEngine,
  handleOpenFolder,
}) => {
  return (
    <div className="relative z-30 flex items-center px-4 md:px-6 pt-2 pb-3 md:pt-3 md:pb-4 shrink-0 bg-[var(--wb-surface-container)] min-h-[56px] pr-16 md:pr-4 rounded-t-2xl pointer-events-auto">
      <div className="flex items-center gap-1.5 md:gap-2 flex-wrap z-10">
        <a href={`https://gamebanana.com/mods/${displayCard.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--wb-surface-bright)] hover:bg-white/10 transition-colors relative group shrink-0">
          <img src="/assets/icons/app/gamebanana.webp" alt="GameBanana" className="w-4 h-4 object-contain opacity-80" />
          <div className="absolute -bottom-1 -right-1 bg-[var(--wb-surface-container)] rounded-full p-[2px]">
            <ExternalLink className="w-3 h-3 text-[var(--wb-on-surface-variant)] group-hover:text-[var(--wb-on-surface)]" />
          </div>
        </a>
        <div className="w-[1px] h-5 bg-[var(--wb-outline-variant)]/40 mx-0.5" />
        {displayCard.icon && (
          <div className="relative z-40 shrink-0" ref={engineDropdownRef}>
            <div
              onClick={() => isInstalled && setIsEngineDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-[4px] bg-[var(--wb-primary)]/15 text-[var(--wb-primary)] border border-[var(--wb-primary)]/30 shrink-0 ${
                isInstalled ? "cursor-pointer hover:bg-[var(--wb-primary)]/25 transition-all select-none group" : ""
              }`}
              title={isInstalled ? "Click to change engine" : engineName}
            >
              <img src={displayCard.icon} alt={engineName} className="w-4 h-4 object-contain brightness-150 shrink-0" />
              <span className="text-xs md:text-sm font-semibold leading-none truncate max-w-[120px]">{engineName}</span>
              {isInstalled && (
                <ChevronDown
                  className={`w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-transform duration-200 ${
                    isEngineDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              )}
            </div>

            {isInstalled && isEngineDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[240px] bg-[var(--wb-surface-container-highest)] border border-[var(--wb-outline-variant)]/60 rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                {getSupportedEngineCategories().map((cat) => {
                  const isSelected =
                    String(cat.id).toLowerCase() === String(displayCard.engineId).toLowerCase() ||
                    cat.name.toLowerCase() === engineName.toLowerCase();
                  const defaultEngineId = displayCard.defaultEngineId || displayCard.engineId;
                  const isDefault =
                    Boolean(defaultEngineId) &&
                    (String(cat.id).toLowerCase() === String(defaultEngineId).toLowerCase() ||
                     cat.name.toLowerCase() === String(defaultEngineId).toLowerCase());
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectEngine(cat)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left w-full ${
                        isSelected
                          ? "bg-[var(--wb-primary)]/20 text-[var(--wb-primary)]"
                          : "text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-[var(--wb-surface-container-high)]"
                      }`}
                    >
                      <img src={cat.icon} alt={cat.name} className="w-4 h-4 object-contain brightness-125 shrink-0" />
                      <span className="truncate">{cat.name}</span>
                      {isDefault && (
                        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--wb-primary)]/20 text-[var(--wb-primary)] uppercase tracking-wider shrink-0">
                          Default
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {!isExecutable && isInstalled && (
          installedEngineVersions.length > 0 ? (
            <div className="relative z-40 shrink-0" ref={versionDropdownRef}>
              <div
                onClick={() => setIsVersionDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-[4px] bg-[var(--wb-surface-bright)]/70 hover:bg-[var(--wb-surface-bright)] text-[var(--wb-on-surface)] border border-[var(--wb-outline-variant)]/40 hover:border-[var(--wb-primary)]/40 shrink-0 cursor-pointer transition-all select-none group"
                title="Select engine version"
              >
                <Tag className="w-3.5 h-3.5 text-[var(--wb-primary)] shrink-0" />
                <span className="text-xs md:text-sm font-semibold leading-none truncate max-w-[100px]">
                  {selectedVersion || "Any version"}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-transform duration-200 ${
                    isVersionDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </div>

              {isVersionDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[210px] bg-[var(--wb-surface-container-highest)] border border-[var(--wb-outline-variant)]/60 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-2 py-1 text-[10px] font-bold text-[var(--wb-on-surface-variant)] uppercase tracking-wider">
                    Installed Versions
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectVersion("Any version")}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer text-left w-full transition-colors ${
                      selectedVersion === "Any version" || selectedVersion === "any"
                        ? "bg-[var(--wb-primary)]/20 text-[var(--wb-primary)]"
                        : "text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-[var(--wb-surface-container-high)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Layers className="w-3.5 h-3.5 text-[var(--wb-primary)] shrink-0" />
                      <span className="truncate">Any version</span>
                    </div>
                    {(selectedVersion === "Any version" || selectedVersion === "any") && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--wb-primary)]/30 text-[var(--wb-primary)] uppercase tracking-wider shrink-0">
                        Selected
                      </span>
                    )}
                  </button>
                  {installedEngineVersions.map((ver, idx) => {
                    const isSelected = selectedVersion === ver;
                    return (
                      <button
                        key={ver}
                        type="button"
                        onClick={() => handleSelectVersion(ver)}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer text-left w-full transition-colors ${
                          isSelected
                            ? "bg-[var(--wb-primary)]/20 text-[var(--wb-primary)]"
                            : "text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-[var(--wb-surface-container-high)]"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Tag className="w-3.5 h-3.5 text-[var(--wb-primary)] shrink-0" />
                          <span className="truncate">{ver}</span>
                        </div>
                        {idx === 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--wb-primary)]/30 text-[var(--wb-primary)] uppercase tracking-wider shrink-0">
                            Default
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleInstallLatestEngine}
              disabled={isInstallingEngine}
              className="flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-[4px] bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] shrink-0 cursor-pointer transition-all select-none shadow-sm text-xs md:text-sm font-bold active:scale-95 disabled:opacity-50"
              title={`Install latest version of ${engineName}`}
            >
              {isInstallingEngine ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <Download className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>Install Engine</span>
            </button>
          )
        )}
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none hidden md:flex">
        <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
          <div 
            className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--wb-surface-bright)] border border-[var(--wb-outline-variant)]/30 text-[var(--wb-on-surface-variant)] text-xs select-none cursor-default"
            onMouseEnter={() => setHoverTooltip("submitted")}
            onMouseLeave={() => setHoverTooltip(null)}
          >
            <Plus className="w-3 h-3" />
            <span>{formatDate(displayCard.submittedAt)}</span>
            <div className={`absolute left-1/2 top-full -translate-x-1/2 mt-2 z-[100] pointer-events-none transition-opacity duration-200 flex flex-col items-center ${hoverTooltip === "submitted" ? "opacity-100" : "opacity-0"}`}>
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-[var(--wb-surface-container-highest)]"></div>
              <div className="bg-[var(--wb-surface-container-highest)] border border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface)] text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                Submitted: {formatFullDate(displayCard.submittedAt)}
              </div>
            </div>
          </div>

          {displayCard.updatedAt && displayCard.updatedAt !== displayCard.submittedAt && (
            <div 
              className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--wb-surface-bright)] border border-[var(--wb-outline-variant)]/30 text-[var(--wb-on-surface-variant)] text-xs select-none cursor-default"
              onMouseEnter={() => setHoverTooltip("updated")}
              onMouseLeave={() => setHoverTooltip(null)}
            >
              <RefreshCw className="w-3 h-3" />
              <span>{formatDate(displayCard.updatedAt)}</span>
              <div className={`absolute left-1/2 top-full -translate-x-1/2 mt-2 z-[100] pointer-events-none transition-opacity duration-200 flex flex-col items-center ${hoverTooltip === "updated" ? "opacity-100" : "opacity-0"}`}>
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-[var(--wb-surface-container-highest)]"></div>
                <div className="bg-[var(--wb-surface-container-highest)] border border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface)] text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                  Updated: {formatFullDate(displayCard.updatedAt)}
                </div>
              </div>
            </div>
          )}

          {isInstalled && localInstalledAt && (
            <button 
              type="button"
              onClick={handleOpenFolder}
              title="Open mod folder"
              className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--wb-surface-bright)] hover:bg-[var(--wb-surface-bright)]/80 hover:text-[var(--wb-on-surface)] border border-[var(--wb-outline-variant)]/30 text-[var(--wb-on-surface-variant)] text-xs select-none cursor-pointer transition-colors"
              onMouseEnter={() => setHoverTooltip("installed")}
              onMouseLeave={() => setHoverTooltip(null)}
            >
              <HardDrive className="w-3 h-3 text-[var(--wb-primary)]" />
              <span>Installed: {formatDate(localInstalledAt)}</span>
              <div className={`absolute left-1/2 top-full -translate-x-1/2 mt-2 z-[100] pointer-events-none transition-opacity duration-200 flex flex-col items-center ${hoverTooltip === "installed" ? "opacity-100" : "opacity-0"}`}>
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-[var(--wb-surface-container-highest)]"></div>
                <div className="bg-[var(--wb-surface-container-highest)] border border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface)] text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                  Installed: {formatFullDate(localInstalledAt)}
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
