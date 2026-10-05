import React from "react";
import {
  ChevronDown,
  Download,
  HardDrive,
  Layers,
  Loader2,
  RefreshCw,
  Tag,
  X,
} from "lucide-react";
import Core from "@core";
import { getSupportedEngineCategories } from "../../../../../core/services/gamebanana/constants";

export interface ModDetailsHeaderMobileProps {
  displayCard: any;
  engineName: string;
  isInstalled: boolean;
  localInstalledAt?: number;
  formatDate: (timestamp?: number) => string;
  formatFullDate: (timestamp?: number) => string;
  isHeaderVisible: boolean;
  isEngineDropdownOpen: boolean;
  setIsEngineDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  engineDropdownRef: React.RefObject<HTMLDivElement | null>;
  handleSelectEngine: (cat: any) => void;
  isExecutable: boolean;
  isMobilePlatform: boolean;
  isEngineInstalledOnDevice: boolean;
  handleInstallLatestEngine: () => void;
  isInstallingEngine: boolean;
  installedEngineVersions: string[];
  isVersionDropdownOpen: boolean;
  setIsVersionDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  versionDropdownRef: React.RefObject<HTMLDivElement | null>;
  selectedVersion: string;
  handleSelectVersion: (ver: string) => void;
  onClose?: () => void;
}

export const ModDetailsHeaderMobile: React.FC<ModDetailsHeaderMobileProps> = ({
  displayCard,
  engineName,
  isInstalled,
  localInstalledAt,
  formatDate,
  formatFullDate,
  isHeaderVisible,
  isEngineDropdownOpen,
  setIsEngineDropdownOpen,
  engineDropdownRef,
  handleSelectEngine,
  isExecutable,
  isMobilePlatform,
  isEngineInstalledOnDevice,
  handleInstallLatestEngine,
  isInstallingEngine,
  installedEngineVersions,
  isVersionDropdownOpen,
  setIsVersionDropdownOpen,
  versionDropdownRef,
  selectedVersion,
  handleSelectVersion,
  onClose,
}) => {
  return (
    <div
      className={`sticky top-0 z-30 flex items-center justify-between gap-2 px-4 py-2.5 bg-[var(--wb-surface-container)]/70 backdrop-blur-xl border-b border-[var(--wb-outline-variant)]/20 shadow-md -mx-4 -mt-4 mb-4 rounded-t-2xl transition-transform duration-300 ease-in-out ${
        isHeaderVisible ? "translate-y-0" : "-translate-y-full pointer-events-none"
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <a
          href={`https://gamebanana.com/mods/${displayCard.id}`}
          onClick={(e) => {
            e.preventDefault();
            Core.platform.openUrl(`https://gamebanana.com/mods/${displayCard.id}`);
          }}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--wb-surface-bright)] shrink-0"
        >
          <img src="/assets/icons/app/gamebanana.webp" alt="GameBanana" className="w-4 h-4 object-contain opacity-80" />
        </a>
        {displayCard.icon && (
          <div className="relative z-40" ref={engineDropdownRef}>
            <div
              onClick={() => isInstalled && setIsEngineDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[var(--wb-primary)]/15 text-[var(--wb-primary)] border border-[var(--wb-primary)]/30 ${
                isInstalled ? "cursor-pointer hover:bg-[var(--wb-primary)]/25 select-none group transition-all" : ""
              }`}
              title={isInstalled ? "Click to change engine" : engineName}
            >
              <img src={displayCard.icon} alt={engineName} className="w-4 h-4 object-contain brightness-150 shrink-0" />
              <span className="text-xs font-semibold truncate max-w-[120px]">{engineName}</span>
              {isInstalled && (
                <ChevronDown
                  className={`w-3 h-3 opacity-70 group-hover:opacity-100 transition-transform duration-200 ${
                    isEngineDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              )}
            </div>

            {isInstalled && isEngineDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[210px] bg-[var(--wb-surface-container-highest)] border border-[var(--wb-outline-variant)]/60 rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
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
          isMobilePlatform ? (
            !isEngineInstalledOnDevice ? (
              <button
                type="button"
                onClick={handleInstallLatestEngine}
                disabled={isInstallingEngine}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] shrink-0 cursor-pointer transition-all select-none shadow-sm text-xs font-bold active:scale-95 disabled:opacity-50"
                title={`Install ${engineName}`}
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Install Engine</span>
              </button>
            ) : null
          ) : installedEngineVersions.length > 0 ? (
            <div className="relative z-40 shrink-0" ref={versionDropdownRef}>
              <div
                onClick={() => setIsVersionDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[var(--wb-surface-bright)]/70 hover:bg-[var(--wb-surface-bright)] text-[var(--wb-on-surface)] border border-[var(--wb-outline-variant)]/40 hover:border-[var(--wb-primary)]/40 shrink-0 cursor-pointer transition-all select-none group"
                title="Select engine version"
              >
                <Tag className="w-3.5 h-3.5 text-[var(--wb-primary)] shrink-0" />
                <span className="text-xs font-semibold leading-none truncate max-w-[100px]">
                  {selectedVersion || "Any version"}
                </span>
                <ChevronDown
                  className={`w-3 h-3 opacity-70 group-hover:opacity-100 transition-transform duration-200 ${
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
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] shrink-0 cursor-pointer transition-all select-none shadow-sm text-xs font-bold active:scale-95 disabled:opacity-50"
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

      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {isInstalled && localInstalledAt ? (
          <div 
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--wb-surface-bright)] border border-[var(--wb-outline-variant)]/30 text-[var(--wb-on-surface-variant)] text-xs font-semibold shrink-0"
            title={formatFullDate(localInstalledAt)}
          >
            <HardDrive className="w-3.5 h-3.5 text-[var(--wb-primary)] shrink-0" />
            <span>Installed: {formatDate(localInstalledAt)}</span>
          </div>
        ) : displayCard.updatedAt ? (
          <div 
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--wb-surface-bright)] border border-[var(--wb-outline-variant)]/30 text-[var(--wb-on-surface-variant)] text-xs font-semibold shrink-0"
            title={`Updated: ${formatFullDate(displayCard.updatedAt)}`}
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span>{formatDate(displayCard.updatedAt)}</span>
          </div>
        ) : null}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 -mr-1 rounded-full text-[var(--wb-icon-default)] hover:text-[var(--wb-icon-hover)] hover:bg-[var(--wb-surface-bright)] transition-colors shrink-0 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
