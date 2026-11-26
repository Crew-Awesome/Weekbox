import React, { useId } from 'react'
import { useUiStyle } from '@/utils/ui-style'

export type ModModalTab = 'description' | 'contributors' | 'details'

interface ModNavPillsProps {
  activeTab: ModModalTab
  onChangeTab: (tab: ModModalTab) => void
  contributorsCount?: number
  filesCount?: number
  className?: string
  extraActions?: React.ReactNode
  compact?: boolean
}

const NAV_TABS: Array<{
  key: ModModalTab
  icon: string
  label: string
}> = [
  { key: 'description', icon: 'description', label: 'Description' },
  { key: 'contributors', icon: 'group', label: 'Contributors' },
  { key: 'details', icon: 'info', label: 'Details' },
]

/**
 * Connected M3E icon-only button group for switching between Description,
 * Contributors, and Details tabs in compact mode.
 */
export const ModNavPills: React.FC<ModNavPillsProps> = ({
  activeTab,
  onChangeTab,
  className = '',
  extraActions,
  compact = false,
}) => {
  const rawId = useId().replace(/:/g, '-')
  const isHomeStyle = useUiStyle() === 'home'

  const buttonSize = compact ? 'extra-small' : 'small'
  const heightPx = compact ? '28px' : '32px'
  const iconSize = compact ? '15px' : '16px'
  const paddingPx = '6px'

  if (isHomeStyle) {
    return (
      <div
        className={`flex items-center flex-nowrap ${
          compact ? 'gap-1.5 my-0.5' : 'gap-2 mt-1.5 mb-1'
        } w-full min-w-0 ${className}`}
      >
        <div
          className="flex flex-1 min-w-0 border-b gap-1"
          style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
        >
          {NAV_TABS.map(({ key, icon, label }) => {
            const isSelected = activeTab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChangeTab(key)}
                aria-label={label}
                className="flex-1 min-w-0 py-1.5 px-2 flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer border-b-2 transition-colors"
                style={{
                  borderColor: isSelected
                    ? 'var(--md-sys-color-primary)'
                    : 'transparent',
                  color: isSelected
                    ? 'var(--md-sys-color-primary)'
                    : 'var(--md-sys-color-on-surface-variant)',
                }}
              >
                <span className="material-symbols-rounded text-[15px] leading-none shrink-0">
                  {icon}
                </span>
                {!compact && <span className="truncate">{label}</span>}
              </button>
            )
          })}
        </div>

        {extraActions && (
          <div className="shrink-0 flex items-center ml-1 pr-0.5">{extraActions}</div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`flex items-center flex-nowrap ${
        compact ? 'gap-1 my-0.5' : 'gap-1.5 mt-1.5 mb-1'
      } w-full min-w-0 ${className}`}
    >
      <div className="flex-1 min-w-0">
        <m3e-button-group
          variant="connected"
          size={buttonSize}
          className="w-full min-w-0"
          style={
            {
              display: 'flex',
              width: '100%',
              minWidth: 0,
              '--m3e-button-container-height': heightPx,
              '--m3e-button-extra-small-container-height': '28px',
              '--m3e-button-small-container-height': heightPx,
              '--m3e-button-leading-space': paddingPx,
              '--m3e-button-trailing-space': paddingPx,
              '--m3e-button-extra-small-leading-space': paddingPx,
              '--m3e-button-extra-small-trailing-space': paddingPx,
              '--m3e-button-small-leading-space': paddingPx,
              '--m3e-button-small-trailing-space': paddingPx,
              '--m3e-button-icon-label-space': '0px',
              '--m3e-button-icon-size': iconSize,
              '--m3e-button-extra-small-icon-size': '15px',
              '--m3e-button-small-icon-size': iconSize,
              '--m3e-button-selected-container-color': 'var(--md-sys-color-primary)',
              '--m3e-button-selected-label-text-color': 'var(--md-sys-color-on-primary)',
              '--m3e-button-selected-icon-color': 'var(--md-sys-color-on-primary)',
              '--m3e-button-unselected-container-color': 'var(--md-sys-color-surface-bright)',
              '--m3e-button-unselected-label-text-color':
                'var(--md-sys-color-on-surface-variant)',
              '--m3e-button-unselected-icon-color': 'var(--md-sys-color-on-surface-variant)',
            } as React.CSSProperties
          }
        >
          {NAV_TABS.map(({ key, icon, label }) => {
            const buttonId = `pills-${key}-${rawId}`
            return (
              <m3e-button
                key={key}
                id={buttonId}
                variant="tonal"
                shape="square"
                toggle={true}
                selected={activeTab === key ? true : undefined}
                size={buttonSize}
                onClick={() => onChangeTab(key)}
                style={{ flex: '1 1 0px', minWidth: 0, overflow: 'hidden' }}
                aria-label={label}
              >
                <span
                  slot="icon"
                  className="material-symbols-rounded shrink-0 leading-none"
                  style={{ fontSize: iconSize }}
                >
                  {icon}
                </span>
              </m3e-button>
            )
          })}
        </m3e-button-group>

        {NAV_TABS.map(({ key, label }) => (
          <m3e-tooltip key={key} for={`pills-${key}-${rawId}`} position="below">
            {label}
          </m3e-tooltip>
        ))}
      </div>

      {extraActions && (
        <div className="shrink-0 flex items-center ml-1 pr-0.5">{extraActions}</div>
      )}
    </div>
  )
}

export default ModNavPills
