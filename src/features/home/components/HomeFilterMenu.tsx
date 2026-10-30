import React, { useMemo, useState, useEffect } from 'react'
import type { ModFilter } from '@/services/gamebanana'
import { getSupportedEngineCategories } from '@/services/gamebanana'
import { FilterIcon } from '@/ui/icons'

export interface HomeFilterMenuProps {
  filter: ModFilter
  onSelectFilter: (filter: ModFilter) => void
  engineFilter: string | string[]
  onSelectEngine: (engine: string | string[]) => void
  className?: string
}

const M3E_MENU_STYLE: React.CSSProperties = {
  '--m3e-menu-container-color': 'var(--md-sys-color-surface-container)',
  '--m3e-menu-container-shape': '16px',
  '--m3e-menu-container-min-width': '240px',
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
  width: 'min(270px, calc(100vw - 24px))',
  maxHeight: 'none',
  overflow: 'hidden',
} as React.CSSProperties

const M3E_BUTTON_STYLE: React.CSSProperties = {
  '--m3e-button-outlined-container-shape': '16px',
  '--m3e-button-outlined-outline-color':
    'color-mix(in srgb, var(--md-sys-color-outline-variant) 60%, transparent)',
  '--m3e-button-outlined-label-text-color':
    'var(--md-sys-color-on-surface)',
  '--m3e-button-container-height': '46px',
  '--m3e-button-leading-space': '0px',
  '--m3e-button-trailing-space': '0px',
  '--m3e-button-icon-label-space': '0px',
  '--m3e-button-icon-size': '22px',
  cursor: 'pointer',
} as React.CSSProperties

export const HomeFilterMenu: React.FC<HomeFilterMenuProps> = ({
  filter,
  onSelectFilter,
  engineFilter,
  onSelectEngine,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const engineCategories = useMemo(() => getSupportedEngineCategories(), [])

  const selectedEngines = useMemo<string[]>(() => {
    if (!engineFilter) return []
    if (Array.isArray(engineFilter)) {
      return engineFilter.filter((id) => id && id !== 'all')
    }
    return engineFilter === 'all' ? [] : [engineFilter]
  }, [engineFilter])

  const isAllEngines = selectedEngines.length === 0
  const isFiltered = filter !== 'ripe' || !isAllEngines

  const handleToggleEngine = (id: string) => {
    const isSelected = selectedEngines.some(
      (e) => e.toLowerCase() === id.toLowerCase(),
    )
    if (isSelected) {
      const next = selectedEngines.filter(
        (e) => e.toLowerCase() !== id.toLowerCase(),
      )
      onSelectEngine(next.length === 0 ? 'all' : next)
    } else {
      onSelectEngine([...selectedEngines, id])
    }
  }

  const handleSelectAllEngines = () => {
    onSelectEngine('all')
  }

  useEffect(() => {
    const menuEl = document.getElementById('home-filter-menu')
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
            width: '46px',
            height: '46px',
            minWidth: '46px',
            maxWidth: '46px',
            padding: 0,
            borderRadius: '16px',
            transition:
              'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.25s ease, border-color 0.25s ease',
            transform: isOpen ? 'scale(0.95)' : 'scale(1)',
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
        title="Filtros y ordenamiento"
        aria-label="Filtros y ordenamiento"
      >
        <m3e-menu-trigger for="home-filter-menu"></m3e-menu-trigger>
        <FilterIcon
          slot="icon"
          isActive={isFiltered}
          isOpen={isOpen}
          size={22}
        />
      </m3e-button>

      {isFiltered && (
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 pointer-events-none items-center justify-center">
          <span className="cuki-filter-indicator-ping absolute inline-flex h-full w-full rounded-full bg-[var(--md-sys-color-primary)] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--md-sys-color-primary)] ring-2 ring-[var(--md-sys-color-surface)] shadow-[0_0_8px_var(--md-sys-color-primary)]"></span>
        </span>
      )}

      <m3e-menu
        id="home-filter-menu"
        position-x="after"
        position-y="below"
        style={M3E_MENU_STYLE}
      >
        <m3e-overflow
          direction="vertical"
          style={{
            width: '100%',
            height: 'min(420px, calc(100vh - 120px))',
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
              Sort / Category
            </div>

            <m3e-menu-item
              checked={filter === 'ripe'}
              onClick={() => onSelectFilter('ripe')}
              style={{ margin: '3px 0' }}
            >
              <span
                slot="icon"
                className="material-symbols-rounded text-lg"
                style={{
                  color:
                    filter === 'ripe'
                      ? 'var(--md-sys-color-primary)'
                      : 'var(--md-sys-color-on-surface-variant)',
                }}
              >
                favorite
              </span>
              <span className="text-xs sm:text-sm font-semibold">
                Most Liked (Ripe)
              </span>
              {filter === 'ripe' && (
                <span
                  slot="trailing-icon"
                  className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
                >
                  check
                </span>
              )}
            </m3e-menu-item>

            <m3e-menu-item
              checked={filter === 'popular'}
              onClick={() => onSelectFilter('popular')}
              style={{ margin: '3px 0' }}
            >
              <span
                slot="icon"
                className="material-symbols-rounded text-lg"
                style={{
                  color:
                    filter === 'popular'
                      ? 'var(--md-sys-color-primary)'
                      : 'var(--md-sys-color-on-surface-variant)',
                }}
              >
                trending_up
              </span>
              <span className="text-xs sm:text-sm font-semibold">
                Trending (Popular)
              </span>
              {filter === 'popular' && (
                <span
                  slot="trailing-icon"
                  className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
                >
                  check
                </span>
              )}
            </m3e-menu-item>

            <m3e-menu-item
              checked={filter === 'new'}
              onClick={() => onSelectFilter('new')}
              style={{ margin: '3px 0' }}
            >
              <span
                slot="icon"
                className="material-symbols-rounded text-lg"
                style={{
                  color:
                    filter === 'new'
                      ? 'var(--md-sys-color-primary)'
                      : 'var(--md-sys-color-on-surface-variant)',
                }}
              >
                new_releases
              </span>
              <span className="text-xs sm:text-sm font-semibold">
                Newest Releases
              </span>
              {filter === 'new' && (
                <span
                  slot="trailing-icon"
                  className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
                >
                  check
                </span>
              )}
            </m3e-menu-item>

            <m3e-menu-item
              checked={filter === 'updated'}
              onClick={() => onSelectFilter('updated')}
              style={{ margin: '3px 0' }}
            >
              <span
                slot="icon"
                className="material-symbols-rounded text-lg"
                style={{
                  color:
                    filter === 'updated'
                      ? 'var(--md-sys-color-primary)'
                      : 'var(--md-sys-color-on-surface-variant)',
                }}
              >
                update
              </span>
              <span className="text-xs sm:text-sm font-semibold">
                Recently Updated
              </span>
              {filter === 'updated' && (
                <span
                  slot="trailing-icon"
                  className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
                >
                  check
                </span>
              )}
            </m3e-menu-item>

            <m3e-divider
              style={{
                margin: '6px 0',
                borderColor:
                  'color-mix(in srgb, var(--md-sys-color-outline-variant) 40%, transparent)',
              }}
            ></m3e-divider>

            <div className="px-3.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] opacity-85 select-none">
              Engine / Game
            </div>

            <m3e-menu-item
              checked={isAllEngines}
              onClick={handleSelectAllEngines}
              style={{ margin: '3px 0' }}
            >
              <span
                slot="icon"
                className="material-symbols-rounded text-lg"
                style={{
                  color:
                    isAllEngines
                      ? 'var(--md-sys-color-primary)'
                      : 'var(--md-sys-color-on-surface-variant)',
                }}
              >
                apps
              </span>
              <span className="text-xs sm:text-sm font-semibold">
                All Engines
              </span>
              {isAllEngines && (
                <span
                  slot="trailing-icon"
                  className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
                >
                  check
                </span>
              )}
            </m3e-menu-item>

            {engineCategories.map((eng) => {
              const isSelected = selectedEngines.some(
                (e) => e.toLowerCase() === eng.id.toLowerCase(),
              )
              return (
                <m3e-menu-item
                  key={eng.id}
                  checked={isSelected}
                  onClick={() => handleToggleEngine(eng.id)}
                  style={{ margin: '3px 0' }}
                >
                  {eng.icon ? (
                    <img
                      slot="icon"
                      src={eng.icon}
                      alt=""
                      className="w-5 h-5 rounded object-contain shrink-0 aspect-square"
                      style={{
                        width: '20px',
                        height: '20px',
                        minWidth: '20px',
                        minHeight: '20px',
                        aspectRatio: '1 / 1',
                        objectFit: 'contain',
                        borderRadius: '4px',
                      }}
                    />
                  ) : (
                    <span
                      slot="icon"
                      className="material-symbols-rounded text-lg flex items-center justify-center shrink-0"
                      style={{
                        width: '20px',
                        height: '20px',
                        minWidth: '20px',
                        minHeight: '20px',
                        fontSize: '20px',
                        lineHeight: '20px',
                        aspectRatio: '1 / 1',
                        color: isSelected
                          ? 'var(--md-sys-color-primary)'
                          : 'var(--md-sys-color-on-surface-variant)',
                      }}
                    >
                      layers
                    </span>
                  )}
                  <span className="text-xs sm:text-sm font-semibold truncate">
                    {eng.name}
                  </span>
                  {isSelected && (
                    <span
                      slot="trailing-icon"
                      className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
                    >
                      check
                    </span>
                  )}
                </m3e-menu-item>
              )
            })}
          </div>
        </m3e-overflow>
      </m3e-menu>
    </div>
  )
}
