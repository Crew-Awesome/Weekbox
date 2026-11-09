import React, { useState, useEffect } from 'react'
import type { TwitterNewsSource } from '@/services/twitter'
import { FilterIcon } from '@/ui/icons'

export interface NewsFilterMenuProps {
  sources: TwitterNewsSource[]
  selectedAccount: string
  availableSources?: Set<string>
  onSelectAccount: (username: string) => void
  className?: string
}

const M3E_MENU_STYLE: React.CSSProperties = {
  '--m3e-menu-container-color': 'var(--md-sys-color-surface-container)',
  '--m3e-menu-container-shape': '16px',
  '--m3e-menu-container-min-width': '230px',
  '--m3e-menu-container-max-height': 'none',
  '--m3e-menu-item-color': 'var(--md-sys-color-on-surface)',
  '--m3e-menu-item-icon-size': '18px',
  '--m3e-menu-item-icon-label-space': '8px',
  '--m3e-menu-item-padding-start': '10px',
  '--m3e-menu-item-padding-end': '10px',
  '--m3e-menu-item-container-height': '38px',
  boxShadow:
    '0 12px 32px color-mix(in srgb, var(--md-sys-color-scrim) 20%, transparent)',
  border:
    '1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 50%, transparent)',
  width: 'min(280px, calc(100vw - 24px))',
  maxHeight: 'none',
  overflow: 'hidden',
} as React.CSSProperties

const M3E_BUTTON_STYLE: React.CSSProperties = {
  '--m3e-button-outlined-container-shape': '16px',
  '--m3e-button-outlined-outline-color':
    'color-mix(in srgb, var(--md-sys-color-outline-variant) 60%, transparent)',
  '--m3e-button-outlined-label-text-color': 'var(--md-sys-color-on-surface)',
  '--m3e-button-container-height': '40px',
  '--m3e-button-leading-space': '0px',
  '--m3e-button-trailing-space': '0px',
  '--m3e-button-icon-label-space': '0px',
  '--m3e-button-icon-size': '20px',
  cursor: 'pointer',
} as React.CSSProperties

export const NewsFilterMenu: React.FC<NewsFilterMenuProps> = ({
  sources,
  selectedAccount,
  onSelectAccount,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const isFiltered = Boolean(selectedAccount)

  useEffect(() => {
    const menuEl = document.getElementById('news-filter-menu')
    if (!menuEl) return

    const updateState = () => {
      const open =
        menuEl.matches?.(':popover-open') ||
        menuEl.classList.contains('open') ||
        (menuEl as unknown as { isOpen?: boolean }).isOpen === true ||
        menuEl.getAttribute('aria-hidden') === 'false'
      setIsOpen(Boolean(open))
    }

    const handleToggle = (e: Event) => {
      const popoverEvent = e as ToggleEvent
      if (popoverEvent.newState) {
        setIsOpen(popoverEvent.newState === 'open')
      } else {
        updateState()
      }
    }

    menuEl.addEventListener('toggle', handleToggle)
    const observer = new MutationObserver(updateState)
    observer.observe(menuEl, {
      attributes: true,
      attributeFilter: ['style', 'class', 'open', 'aria-hidden'],
    })

    return () => {
      menuEl.removeEventListener('toggle', handleToggle)
      observer.disconnect()
    }
  }, [])

  return (
    <div className={`relative shrink-0 flex items-center ${className}`}>
      <m3e-button
        variant={isFiltered ? 'filled-tonal' : 'outlined'}
        className="group"
        style={
          {
            ...M3E_BUTTON_STYLE,
            width: '40px',
            height: '40px',
            minWidth: '40px',
            maxWidth: '40px',
            padding: 0,
            borderRadius: '16px',
            transform: isOpen ? 'scale(0.95)' : 'scale(1)',
            transition:
              'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.25s ease, border-color 0.25s ease',
            ...(isFiltered
              ? {
                  '--m3e-button-tonal-container-color':
                    'color-mix(in srgb, var(--md-sys-color-primary) 14%, transparent)',
                  '--m3e-button-tonal-label-text-color':
                    'var(--md-sys-color-primary)',
                }
              : {}),
          } as React.CSSProperties
        }
        title="Filter news sources"
        aria-label="Filter news sources"
      >
        <m3e-menu-trigger for="news-filter-menu" />
        <FilterIcon
          slot="icon"
          isActive={isFiltered}
          isOpen={isOpen}
          size={20}
        />
      </m3e-button>

      {isFiltered && (
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 pointer-events-none items-center justify-center">
          <span className="cuki-filter-indicator-ping absolute inline-flex h-full w-full rounded-full bg-[var(--md-sys-color-primary)] opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--md-sys-color-primary)] ring-2 ring-[var(--md-sys-color-surface)] shadow-[0_0_8px_var(--md-sys-color-primary)]" />
        </span>
      )}

      <m3e-menu
        id="news-filter-menu"
        position-x="before"
        position-y="below"
        style={M3E_MENU_STYLE}
      >
        <m3e-overflow
          direction="vertical"
          style={{
            width: '100%',
            height: 'min(380px, calc(100vh - 140px))',
          }}
          thumb-color="var(--md-sys-color-primary)"
          track-color="var(--md-sys-color-outline-variant)"
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              paddingBlock: '6px',
              paddingInline: '2px 14px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div className="px-3.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] opacity-85 select-none">
              News Sources
            </div>

            <m3e-menu-item
              checked={!selectedAccount}
              onClick={() => onSelectAccount('')}
              style={{ margin: '3px 0' }}
            >
              <span slot="icon" className="material-symbols-rounded text-base">
                dynamic_feed
              </span>
              <span className="text-xs sm:text-sm font-semibold">All Feeds</span>
              {!selectedAccount && (
                <span
                  slot="trailing-icon"
                  className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)] ml-auto"
                >
                  check
                </span>
              )}
            </m3e-menu-item>

            <div className="my-1 border-t border-[color-mix(in_srgb,var(--md-sys-color-outline-variant)_30%,transparent)]" />

            {sources.map((source) => {
              const isSelected =
                selectedAccount.toLowerCase() === source.username.toLowerCase()

              return (
                <m3e-menu-item
                  key={`menu-source-${source.username}`}
                  checked={isSelected}
                  onClick={() => onSelectAccount(isSelected ? '' : source.username)}
                  style={{ margin: '3px 0' }}
                >
                  <span slot="icon" className="material-symbols-rounded text-base">
                    feed
                  </span>
                  <span className="truncate text-xs sm:text-sm font-semibold">{source.name}</span>
                  {isSelected && (
                    <span
                      slot="trailing-icon"
                      className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)] ml-auto"
                    >
                      check
                    </span>
                  )}
                </m3e-menu-item>
              )
            })}

            {isFiltered && (
              <>
                <div className="my-1 border-t border-[color-mix(in_srgb,var(--md-sys-color-outline-variant)_30%,transparent)]" />
                <m3e-menu-item
                  onClick={() => onSelectAccount('')}
                  style={{ margin: '3px 0' }}
                >
                  <span slot="icon" className="material-symbols-rounded text-base text-[var(--md-sys-color-error)]">
                    filter_alt_off
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-[var(--md-sys-color-error)]">
                    Clear Filter
                  </span>
                </m3e-menu-item>
              </>
            )}
          </div>
        </m3e-overflow>
      </m3e-menu>
    </div>
  )
}

export default NewsFilterMenu

