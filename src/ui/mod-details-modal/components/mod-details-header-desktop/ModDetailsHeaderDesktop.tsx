import React, { useId } from 'react'
import { host } from '@/core/host'
import { useUiStyle } from '@/utils/ui-style'
import type { EngineCategory } from '../../constants'
import type { ModItem } from '../../types'
import { DesktopEngineSelector } from './DesktopEngineSelector'
import { DesktopDatePills } from './DesktopDatePills'

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
  isEngineDropdownOpen?: boolean
  setIsEngineDropdownOpen?: React.Dispatch<React.SetStateAction<boolean>>
  engineDropdownRef?: React.RefObject<HTMLDivElement | null>
  handleSelectEngine: (cat: EngineCategory, version?: string) => void
  isExecutable?: boolean
  installedEngineVersions?: string[]
  isVersionDropdownOpen?: boolean
  setIsVersionDropdownOpen?: React.Dispatch<React.SetStateAction<boolean>>
  versionDropdownRef?: React.RefObject<HTMLDivElement | null>
  selectedVersion?: string
  handleSelectVersion?: (ver: string) => void
  handleInstallLatestEngine?: () => void
  isInstallingEngine?: boolean
  handleOpenFolder?: () => void
}

export const ModDetailsHeaderDesktop: React.FC<ModDetailsHeaderDesktopProps> = ({
  displayCard,
  engineName,
  isInstalled,
  localInstalledAt,
  formatDate,
  formatFullDate,
  engineDropdownRef,
  handleSelectEngine,
  selectedVersion,
}) => {
  const rawId = useId()
  const submittedPillId = `hdr-sub-${rawId.replace(/:/g, '-')}`
  const updatedPillId = `hdr-upd-${rawId.replace(/:/g, '-')}`
  const installedPillId = `hdr-ins-${rawId.replace(/:/g, '-')}`
  const engineMenuId = `hdr-eng-menu-${rawId.replace(/:/g, '-')}`
  const isHomeStyle = useUiStyle() === 'home'

  return (
    <div
      className={`relative z-30 flex items-center justify-between px-4 md:px-6 pt-2 pb-3 md:pt-3 md:pb-4 shrink-0 min-h-[56px] pointer-events-auto ${
        isHomeStyle
          ? 'bg-[var(--md-sys-color-surface)] border-b border-[var(--md-sys-color-outline-variant)]/50 rounded-t-xl'
          : 'bg-[var(--md-sys-color-surface-container)] rounded-t-2xl'
      }`}
    >
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
        <div className="w-[1px] h-5 bg-[var(--md-sys-color-outline-variant)]/40 mx-0.5" />

        <DesktopEngineSelector
          displayCard={displayCard}
          engineName={engineName}
          isInstalled={isInstalled}
          engineDropdownRef={engineDropdownRef}
          engineMenuId={engineMenuId}
          selectedVersion={selectedVersion}
          handleSelectEngine={handleSelectEngine}
        />
      </div>

      <DesktopDatePills
        displayCard={displayCard}
        isInstalled={isInstalled}
        localInstalledAt={localInstalledAt}
        formatDate={formatDate}
        formatFullDate={formatFullDate}
        submittedPillId={submittedPillId}
        updatedPillId={updatedPillId}
        installedPillId={installedPillId}
      />

      <div className="flex-1 min-w-0" />
      <div className="shrink-0 w-8 md:w-10 pointer-events-none" />
    </div>
  )
}

