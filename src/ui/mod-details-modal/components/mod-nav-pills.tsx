import React, { useRef, useState, useEffect, useId } from 'react'

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

/**
 * Connected M3E button group for switching between Description, Contributors, and Details tabs.
 * Automatically collapses to icon-only mode when container width is narrow.
 */
export const ModNavPills: React.FC<ModNavPillsProps> = ({
  activeTab,
  onChangeTab,
  contributorsCount,
  filesCount,
  className = '',
  extraActions,
  compact = false,
}) => {
  const groupRef = useRef<HTMLDivElement>(null)
  const [groupWidth, setGroupWidth] = useState<number>(400)

  const rawId = useId()
  const descId = `pills-desc-${rawId.replace(/:/g, '-')}`
  const contribId = `pills-contrib-${rawId.replace(/:/g, '-')}`
  const detailsId = `pills-details-${rawId.replace(/:/g, '-')}`

  useEffect(() => {
    const el = groupRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setGroupWidth(entry.contentRect.width)
        }
      }
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const isIconOnly = compact ? groupWidth < 180 : groupWidth < 255

  const buttonSize = compact ? 'extra-small' : 'small'
  const heightPx = compact ? '28px' : '32px'
  const iconSize = compact ? '15px' : '16px'
  const fontSize = compact ? '11px' : '11.5px'
  const paddingPx = isIconOnly ? '6px' : '8px'

  return (
    <div
      className={`flex items-center flex-nowrap ${
        compact ? 'gap-1 my-0.5' : 'gap-1.5 mt-1.5 mb-1'
      } w-full min-w-0 ${className}`}
    >
      <div ref={groupRef} className="flex-1 min-w-0">
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
              '--m3e-button-extra-small-leading-space': isIconOnly ? '6px' : '8px',
              '--m3e-button-extra-small-trailing-space': isIconOnly ? '6px' : '8px',
              '--m3e-button-small-leading-space': paddingPx,
              '--m3e-button-small-trailing-space': paddingPx,
              '--m3e-button-icon-label-space': '4px',
              '--m3e-button-icon-size': iconSize,
              '--m3e-button-extra-small-icon-size': '15px',
              '--m3e-button-small-icon-size': iconSize,
              '--m3e-button-label-text-font-size': fontSize,
              '--m3e-button-extra-small-label-text-font-size': '11px',
              '--m3e-button-small-label-text-font-size': fontSize,
              '--m3e-button-selected-container-color': 'var(--wb-primary)',
              '--m3e-button-selected-label-text-color': 'var(--wb-on-primary)',
              '--m3e-button-selected-icon-color': 'var(--wb-on-primary)',
              '--m3e-button-unselected-container-color': 'var(--wb-surface-bright)',
              '--m3e-button-unselected-label-text-color':
                'var(--wb-on-surface-variant)',
              '--m3e-button-unselected-icon-color': 'var(--wb-on-surface-variant)',
            } as React.CSSProperties
          }
        >
          <m3e-button
            id={descId}
            variant="tonal"
            shape="square"
            toggle={true}
            selected={activeTab === 'description' ? true : undefined}
            size={buttonSize}
            onClick={() => onChangeTab('description')}
            style={{ flex: '1 1 0px', minWidth: 0, overflow: 'hidden' }}
            aria-label="Description"
          >
            <span
              slot="icon"
              className="material-symbols-rounded shrink-0 leading-none"
              style={{ fontSize: iconSize }}
            >
              description
            </span>
            {!isIconOnly && (
              <span className="truncate min-w-0 font-medium tracking-tight">
                Description
              </span>
            )}
          </m3e-button>

          <m3e-button
            id={contribId}
            variant="tonal"
            shape="square"
            toggle={true}
            selected={activeTab === 'contributors' ? true : undefined}
            size={buttonSize}
            onClick={() => onChangeTab('contributors')}
            style={{ flex: '1 1 0px', minWidth: 0, overflow: 'hidden' }}
            aria-label="Contributors"
          >
            <span
              slot="icon"
              className="material-symbols-rounded shrink-0 leading-none"
              style={{ fontSize: iconSize }}
            >
              group
            </span>
            {!isIconOnly && (
              <span className="truncate min-w-0 font-medium tracking-tight">
                Contributors
              </span>
            )}
            {!isIconOnly && contributorsCount !== undefined && (
              <span
                className="ml-0.5 text-[9px] px-1 py-0 rounded-full font-bold shrink-0 transition-colors"
                style={{
                  color:
                    activeTab === 'contributors'
                      ? 'var(--wb-on-primary)'
                      : 'var(--wb-on-surface-variant)',
                  backgroundColor:
                    activeTab === 'contributors'
                      ? 'color-mix(in srgb, var(--wb-on-primary) 22%, transparent)'
                      : 'color-mix(in srgb, var(--wb-on-surface-variant) 18%, transparent)',
                }}
              >
                {contributorsCount}
              </span>
            )}
          </m3e-button>

          <m3e-button
            id={detailsId}
            variant="tonal"
            shape="square"
            toggle={true}
            selected={activeTab === 'details' ? true : undefined}
            size={buttonSize}
            onClick={() => onChangeTab('details')}
            style={
              {
                flex: '1 1 0px',
                minWidth: 0,
                overflow: 'hidden',
                '--m3e-button-trailing-space': isIconOnly ? '5px' : '7px',
                '--m3e-button-small-trailing-space': isIconOnly ? '5px' : '7px',
                '--m3e-button-leading-space': isIconOnly ? '5px' : '7px',
                '--m3e-button-small-leading-space': isIconOnly ? '5px' : '7px',
              } as React.CSSProperties
            }
            aria-label="Details"
          >
            <span
              slot="icon"
              className="material-symbols-rounded shrink-0 leading-none"
              style={{ fontSize: iconSize }}
            >
              info
            </span>
            {!isIconOnly && (
              <span className="truncate min-w-0 font-medium tracking-tight">
                Details
              </span>
            )}
            {!isIconOnly && filesCount !== undefined && (
              <span
                className="ml-0.5 text-[9px] px-1 py-0 rounded-full font-bold shrink-0 transition-colors"
                style={{
                  color:
                    activeTab === 'details'
                      ? 'var(--wb-on-primary)'
                      : 'var(--wb-on-surface-variant)',
                  backgroundColor:
                    activeTab === 'details'
                      ? 'color-mix(in srgb, var(--wb-on-primary) 22%, transparent)'
                      : 'color-mix(in srgb, var(--wb-on-surface-variant) 18%, transparent)',
                }}
              >
                {filesCount}
              </span>
            )}
          </m3e-button>
        </m3e-button-group>

        <m3e-tooltip for={descId} position="below">
          Description
        </m3e-tooltip>
        <m3e-tooltip for={contribId} position="below">
          {contributorsCount !== undefined
            ? `Contributors (${contributorsCount})`
            : 'Contributors'}
        </m3e-tooltip>
        <m3e-tooltip for={detailsId} position="below">
          {filesCount !== undefined ? `Details (${filesCount})` : 'Details'}
        </m3e-tooltip>
      </div>

      {extraActions && (
        <div className="shrink-0 flex items-center ml-1 pr-0.5">{extraActions}</div>
      )}
    </div>
  )
}

export default ModNavPills
