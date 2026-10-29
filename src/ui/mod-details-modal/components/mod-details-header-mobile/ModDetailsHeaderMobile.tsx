import React, { useId } from 'react'
import { host } from '@/core/host'
import type { EngineCategory } from '../../constants'
import type { ModItem } from '../../types'
import { MobileEngineSelector } from './MobileEngineSelector'
import { MobileVersionSelector } from './MobileVersionSelector'
import { MobileDatePills } from './MobileDatePills'

export interface ModDetailsHeaderMobileProps {
  displayCard: ModItem
  engineName: string
  isInstalled: boolean
  localInstalledAt?: number
  formatDate: (timestamp?: number | string) => string
  formatFullDate: (timestamp?: number | string) => string
  isHeaderVisible: boolean
  isEngineDropdownOpen?: boolean
  setIsEngineDropdownOpen?: React.Dispatch<React.SetStateAction<boolean>>
  engineDropdownRef?: React.RefObject<HTMLDivElement | null>
  handleSelectEngine: (cat: EngineCategory) => void
  isExecutable: boolean
  isMobilePlatform: boolean
  isEngineInstalledOnDevice: boolean
  handleInstallLatestEngine: () => void
  isInstallingEngine: boolean
  installedEngineVersions: string[]
  isVersionDropdownOpen: boolean
  setIsVersionDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>
  versionDropdownRef: React.RefObject<HTMLDivElement | null>
  selectedVersion: string
  handleSelectVersion: (ver: string) => void
  handleOpenFolder?: () => void
  onClose?: () => void
}

export const ModDetailsHeaderMobile: React.FC<ModDetailsHeaderMobileProps> = ({
  displayCard,
  engineName,
  isInstalled,
  localInstalledAt,
  formatDate,
  formatFullDate,
  isHeaderVisible,
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
  const rawId = useId()
  const mobileUpdatedId = `mob-upd-${rawId.replace(/:/g, '-')}`
  const mobileInstalledId = `mob-ins-${rawId.replace(/:/g, '-')}`
  const mobileEngineMenuId = `mob-eng-menu-${rawId.replace(/:/g, '-')}`

  return (
    <div
      className={`relative z-30 flex items-center justify-between pb-3 shrink-0 transition-transform duration-300 ${
        isHeaderVisible ? 'translate-y-0' : '-translate-y-full pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap min-w-0">
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

        <MobileEngineSelector
          displayCard={displayCard}
          engineName={engineName}
          isInstalled={isInstalled}
          engineDropdownRef={engineDropdownRef}
          mobileEngineMenuId={mobileEngineMenuId}
          handleSelectEngine={handleSelectEngine}
        />

        <MobileVersionSelector
          isExecutable={isExecutable}
          isInstalled={isInstalled}
          isMobilePlatform={isMobilePlatform}
          isEngineInstalledOnDevice={isEngineInstalledOnDevice}
          handleInstallLatestEngine={handleInstallLatestEngine}
          isInstallingEngine={isInstallingEngine}
          installedEngineVersions={installedEngineVersions}
          isVersionDropdownOpen={isVersionDropdownOpen}
          setIsVersionDropdownOpen={setIsVersionDropdownOpen}
          versionDropdownRef={versionDropdownRef}
          selectedVersion={selectedVersion}
          handleSelectVersion={handleSelectVersion}
        />
      </div>

      <MobileDatePills
        displayCard={displayCard}
        isInstalled={isInstalled}
        localInstalledAt={localInstalledAt}
        formatDate={formatDate}
        formatFullDate={formatFullDate}
        mobileUpdatedId={mobileUpdatedId}
        mobileInstalledId={mobileInstalledId}
        onClose={onClose}
      />
    </div>
  )
}

