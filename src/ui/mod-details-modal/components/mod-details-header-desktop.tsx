import React, { useId } from 'react'
import { host } from '@/core/host'
import { getSupportedEngineCategories, type EngineCategory } from '../constants'
import type { ModItem } from '../types'

export interface ModDetailsHeaderDesktopProps {
  displayCard: ModItem
  engineName: string
  isInstalled: boolean
  localInstalledAt?: number
  formatDate: (timestamp?: number | string) => string
  formatFullDate: (timestamp?: number | string) => string
  hoverTooltip?: 'submitted' | 'updated' | 'installed' | null
  setHoverTooltip?: React.Dispatch<
    React.SetStateAction<'submitted' | 'updated' | 'installed' | null>
  >
  isEngineDropdownOpen: boolean
  setIsEngineDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>
  engineDropdownRef: React.RefObject<HTMLDivElement | null>
  handleSelectEngine: (cat: EngineCategory) => void
  isExecutable: boolean
  installedEngineVersions: string[]
  isVersionDropdownOpen: boolean
  setIsVersionDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>
  versionDropdownRef: React.RefObject<HTMLDivElement | null>
  selectedVersion: string
  handleSelectVersion: (ver: string) => void
  handleInstallLatestEngine: () => void
  isInstallingEngine: boolean
  handleOpenFolder?: () => void
}

/**
 * Desktop header bar for the Mod Details modal with engine/version selectors and date pills.
 */
export const ModDetailsHeaderDesktop: React.FC<ModDetailsHeaderDesktopProps> = ({
  displayCard,
  engineName,
  isInstalled,
  localInstalledAt,
  formatDate,
  formatFullDate,
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
}) => {
  const rawId = useId()
  const submittedPillId = `hdr-sub-${rawId.replace(/:/g, '-')}`
  const updatedPillId = `hdr-upd-${rawId.replace(/:/g, '-')}`
  const installedPillId = `hdr-ins-${rawId.replace(/:/g, '-')}`

  return (
    <div className="relative z-30 flex items-center justify-between px-4 md:px-6 pt-2 pb-3 md:pt-3 md:pb-4 shrink-0 bg-[var(--wb-surface-container)] min-h-[56px] rounded-t-2xl pointer-events-auto">
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0 z-10">
        <m3e-icon-button
          variant="tonal"
          onClick={() => host.openUrl(`https://gamebanana.com/mods/${displayCard.id}`)}
          title="Open on GameBanana"
          aria-label="Open on GameBanana"
          className="shrink-0 border-none !border-0"
          style={{ '--m3e-icon-button-size': '32px' } as React.CSSProperties}
        >
          <span className="material-symbols-rounded text-base leading-none">
            open_in_new
          </span>
        </m3e-icon-button>
        <div className="w-[1px] h-5 bg-[var(--wb-outline-variant)]/40 mx-0.5" />

        {displayCard.icon && (
          <div className="relative z-40 shrink-0" ref={engineDropdownRef}>
            <div
              onClick={() => isInstalled && setIsEngineDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-[4px] bg-[var(--wb-primary)]/15 text-[var(--wb-primary)] border border-[var(--wb-primary)]/30 shrink-0 ${
                isInstalled
                  ? 'cursor-pointer hover:bg-[var(--wb-primary)]/25 transition-all select-none group'
                  : ''
              }`}
              title={isInstalled ? 'Click to change engine' : engineName}
            >
              <img
                src={displayCard.icon}
                alt={engineName}
                className="w-4 h-4 object-contain brightness-150 shrink-0"
              />
              <span className="text-xs md:text-sm font-semibold leading-none truncate max-w-[120px]">
                {engineName}
              </span>
              {isInstalled && (
                <span
                  className={`material-symbols-rounded text-base opacity-70 group-hover:opacity-100 transition-transform duration-200 leading-none ${
                    isEngineDropdownOpen ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              )}
            </div>

            {isInstalled && isEngineDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[240px] bg-[var(--wb-surface-container-highest)] border border-[var(--wb-outline-variant)]/60 rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                {getSupportedEngineCategories().map((cat) => {
                  const isSelected =
                    String(cat.id).toLowerCase() ===
                      String(displayCard.engineId).toLowerCase() ||
                    cat.name.toLowerCase() === engineName.toLowerCase()
                  const defaultEngineId =
                    displayCard.defaultEngineId || displayCard.engineId
                  const isDefault =
                    Boolean(defaultEngineId) &&
                    (String(cat.id).toLowerCase() ===
                      String(defaultEngineId).toLowerCase() ||
                      cat.name.toLowerCase() === String(defaultEngineId).toLowerCase())
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectEngine(cat)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-left w-full ${
                        isSelected
                          ? 'bg-[var(--wb-primary)]/20 text-[var(--wb-primary)]'
                          : 'text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-[var(--wb-surface-container-high)]'
                      }`}
                    >
                      <img
                        src={cat.icon}
                        alt={cat.name}
                        className="w-4 h-4 object-contain brightness-125 shrink-0"
                      />
                      <span className="truncate">{cat.name}</span>
                      {isDefault && (
                        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--wb-primary)]/20 text-[var(--wb-primary)] uppercase tracking-wider shrink-0">
                          Default
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
        {!isExecutable &&
          isInstalled &&
          (installedEngineVersions.length > 0 ? (
            <div className="relative z-40 shrink-0" ref={versionDropdownRef}>
              <div
                onClick={() => setIsVersionDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-[4px] bg-[var(--wb-surface-bright)]/70 hover:bg-[var(--wb-surface-bright)] text-[var(--wb-on-surface)] border border-[var(--wb-outline-variant)]/40 hover:border-[var(--wb-primary)]/40 shrink-0 cursor-pointer transition-all select-none group"
                title="Select engine version"
              >
                <span className="material-symbols-rounded text-sm text-[var(--wb-primary)] shrink-0 leading-none">
                  sell
                </span>
                <span className="text-xs md:text-sm font-semibold leading-none truncate max-w-[100px]">
                  {selectedVersion || 'Any version'}
                </span>
                <span
                  className={`material-symbols-rounded text-base opacity-70 group-hover:opacity-100 transition-transform duration-200 leading-none ${
                    isVersionDropdownOpen ? 'rotate-180' : ''
                  }`}
                >
                  expand_more
                </span>
              </div>

              {isVersionDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[210px] bg-[var(--wb-surface-container-highest)] border border-[var(--wb-outline-variant)]/60 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-2 py-1 text-[10px] font-bold text-[var(--wb-on-surface-variant)] uppercase tracking-wider">
                    Installed Versions
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectVersion('Any version')}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer text-left w-full transition-colors ${
                      selectedVersion === 'Any version' || selectedVersion === 'any'
                        ? 'bg-[var(--wb-primary)]/20 text-[var(--wb-primary)]'
                        : 'text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-[var(--wb-surface-container-high)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="material-symbols-rounded text-sm text-[var(--wb-primary)] shrink-0 leading-none">
                        layers
                      </span>
                      <span className="truncate">Any version</span>
                    </div>
                    {(selectedVersion === 'Any version' || selectedVersion === 'any') && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--wb-primary)]/30 text-[var(--wb-primary)] uppercase tracking-wider shrink-0">
                        Selected
                      </span>
                    )}
                  </button>
                  {installedEngineVersions.map((ver, idx) => {
                    const isSelected = selectedVersion === ver
                    return (
                      <button
                        key={ver}
                        type="button"
                        onClick={() => handleSelectVersion(ver)}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer text-left w-full transition-colors ${
                          isSelected
                            ? 'bg-[var(--wb-primary)]/20 text-[var(--wb-primary)]'
                            : 'text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-[var(--wb-surface-container-high)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="material-symbols-rounded text-sm text-[var(--wb-primary)] shrink-0 leading-none">
                            sell
                          </span>
                          <span className="truncate">{ver}</span>
                        </div>
                        {idx === 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--wb-primary)]/30 text-[var(--wb-primary)] uppercase tracking-wider shrink-0">
                            Default
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <m3e-button
              variant="filled"
              onClick={handleInstallLatestEngine}
              disabled={isInstallingEngine}
              title={`Install latest version of ${engineName}`}
            >
              {isInstallingEngine ? (
                <span className="material-symbols-rounded text-sm animate-spin shrink-0 leading-none">
                  progress_activity
                </span>
              ) : (
                <span className="material-symbols-rounded text-sm shrink-0 leading-none">
                  download
                </span>
              )}
              <span>Install Engine</span>
            </m3e-button>
          ))}
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto z-10 max-w-[calc(100%-360px)] min-w-0">
        <div className="inline-flex items-center rounded-full bg-[var(--wb-surface-bright)] border border-[var(--wb-outline-variant)]/30 overflow-hidden shadow-xs divide-x divide-[var(--wb-outline-variant)]/20 min-w-0 max-w-full">
          {displayCard.submittedAt && (
            <div
              id={submittedPillId}
              tabIndex={0}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-[var(--wb-surface-container-highest)]/60 transition-colors select-none cursor-default min-w-0 shrink-0 outline-none focus-visible:bg-[var(--wb-surface-container-highest)]"
              aria-label={`Submitted: ${formatDate(displayCard.submittedAt)}`}
            >
              <span className="material-symbols-rounded text-sm shrink-0 leading-none text-[var(--wb-primary)]">
                add
              </span>
              <span className="truncate">{formatDate(displayCard.submittedAt)}</span>
            </div>
          )}

          {displayCard.updatedAt &&
            displayCard.updatedAt !== displayCard.submittedAt && (
              <div
                id={updatedPillId}
                tabIndex={0}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-[var(--wb-surface-container-highest)]/60 transition-colors select-none cursor-default min-w-0 shrink-0 outline-none focus-visible:bg-[var(--wb-surface-container-highest)]"
                aria-label={`Updated: ${formatDate(displayCard.updatedAt)}`}
              >
                <span className="material-symbols-rounded text-sm shrink-0 leading-none text-[var(--wb-primary)]">
                  refresh
                </span>
                <span className="truncate">{formatDate(displayCard.updatedAt)}</span>
              </div>
            )}

          {isInstalled && localInstalledAt && (
            <div
              id={installedPillId}
              tabIndex={0}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] hover:bg-[var(--wb-surface-container-highest)]/60 transition-colors select-none cursor-default min-w-0 shrink-0 outline-none focus-visible:bg-[var(--wb-surface-container-highest)]"
              aria-label={`Installed: ${formatDate(localInstalledAt)}`}
            >
              <span className="material-symbols-rounded text-sm shrink-0 leading-none text-[var(--wb-primary)]">
                folder
              </span>
              <span className="truncate">{formatDate(localInstalledAt)}</span>
            </div>
          )}
        </div>

        {displayCard.submittedAt && (
          <m3e-tooltip for={submittedPillId} position="below">
            Submitted: {formatFullDate(displayCard.submittedAt)}
          </m3e-tooltip>
        )}

        {displayCard.updatedAt &&
          displayCard.updatedAt !== displayCard.submittedAt && (
            <m3e-tooltip for={updatedPillId} position="below">
              Updated: {formatFullDate(displayCard.updatedAt)}
            </m3e-tooltip>
          )}

        {isInstalled && localInstalledAt && (
          <m3e-tooltip for={installedPillId} position="below">
            Installed: {formatFullDate(localInstalledAt)}
          </m3e-tooltip>
        )}
      </div>
      <div className="flex-1 min-w-0" />

      <div className="shrink-0 w-8 md:w-10 pointer-events-none" />
    </div>
  )
}
