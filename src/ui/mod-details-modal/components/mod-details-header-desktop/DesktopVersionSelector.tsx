import React from 'react'

interface DesktopVersionSelectorProps {
  isExecutable: boolean
  isInstalled: boolean
  installedEngineVersions: string[]
  isVersionDropdownOpen: boolean
  setIsVersionDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>
  versionDropdownRef: React.RefObject<HTMLDivElement | null>
  selectedVersion: string
  handleSelectVersion: (ver: string) => void
  handleInstallLatestEngine: () => void
  isInstallingEngine: boolean
  engineName: string
}

export const DesktopVersionSelector: React.FC<DesktopVersionSelectorProps> = ({
  isExecutable,
  isInstalled,
  installedEngineVersions,
  isVersionDropdownOpen,
  setIsVersionDropdownOpen,
  versionDropdownRef,
  selectedVersion,
  handleSelectVersion,
  handleInstallLatestEngine,
  isInstallingEngine,
  engineName,
}) => {
  if (isExecutable || !isInstalled) return null

  if (installedEngineVersions.length > 0) {
    return (
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
    )
  }

  return (
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
  )
}

