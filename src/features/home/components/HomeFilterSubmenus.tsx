import React from 'react'
import type { ModFilter } from '@/services/gamebanana'

export const SORT_ITEMS: Array<{
  id: ModFilter
  name: string
  icon: string
}> = [
  { id: 'ripe', name: 'Ripe', icon: 'favorite' },
  { id: 'popular', name: 'Popular', icon: 'trending_up' },
  { id: 'new', name: 'New', icon: 'new_releases' },
  { id: 'updated', name: 'Updated', icon: 'update' },
]

export const ENGINE_ITEMS = [
  { id: 'executable', name: 'Executable', icon: '/imgs/icons/categories/exe.png' },
  { id: 'psych', name: 'Psych', icon: '/imgs/icons/categories/psych.png' },
  { id: 'vslice', name: 'V-Slice', icon: '/imgs/icons/categories/vslice.png' },
  { id: 'codename', name: 'Codename Engine', icon: '/imgs/icons/categories/codename.png' },
  { id: 'psychonline', name: 'Psych Online', icon: '/imgs/icons/categories/psychonline.png' },
  { id: 'pslice', name: 'P-Slice', icon: '/imgs/icons/categories/pslice.png' },
  { id: 'fpsplus', name: 'FPS Plus', icon: '/imgs/icons/categories/fpsplus.png' },
]

export const M3E_MENU_STYLE: React.CSSProperties = {
  '--m3e-menu-container-color': 'var(--md-sys-color-surface-container)',
  '--m3e-menu-container-shape': '16px',
  '--m3e-menu-container-min-width': '190px',
  '--m3e-menu-container-max-height': 'none',
  '--m3e-menu-item-color': 'var(--md-sys-color-on-surface)',
  '--m3e-menu-item-selected-color': 'var(--md-sys-color-primary)',
  '--m3e-menu-item-selected-container-color':
    'color-mix(in srgb, var(--md-sys-color-primary) 12%, transparent)',
  '--m3e-menu-item-icon-size': '18px',
  '--m3e-menu-item-icon-label-space': '8px',
  '--m3e-menu-item-padding-start': '10px',
  '--m3e-menu-item-padding-end': '10px',
  '--m3e-menu-item-container-height': '38px',
  boxShadow:
    '0 12px 32px color-mix(in srgb, var(--md-sys-color-scrim) 20%, transparent)',
  border:
    '1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 50%, transparent)',
  width: 'min(210px, calc(100vw - 24px))',
  maxHeight: 'none',
  overflow: 'hidden',
} as React.CSSProperties

export const M3E_SUBMENU_STYLE: React.CSSProperties = {
  ...M3E_MENU_STYLE,
  '--m3e-menu-container-min-width': '220px',
  width: 'min(240px, calc(100vw - 24px))',
} as React.CSSProperties

export const M3E_BUTTON_STYLE: React.CSSProperties = {
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

export interface HomeFilterSubmenusProps {
  filter: ModFilter
  onSelectFilter: (filter: ModFilter) => void
  selectedEngines: string[]
  isAllEngines: boolean
  onSelectAllEngines: () => void
  onToggleEngine: (id: string) => void
}

export const HomeFilterSubmenus: React.FC<HomeFilterSubmenusProps> = ({
  filter,
  onSelectFilter,
  selectedEngines,
  isAllEngines,
  onSelectAllEngines,
  onToggleEngine,
}) => {
  return (
    <>
      <m3e-menu
        id="home-filter-menu"
        position-x="after"
        position-y="below"
        style={M3E_MENU_STYLE}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '6px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <m3e-menu-item style={{ margin: '2px 0' }}>
            <span
              slot="icon"
              className="material-symbols-rounded text-lg text-[var(--md-sys-color-primary)]"
            >
              sort
            </span>
            <m3e-menu-trigger for="home-filter-sort-menu">
              <span className="text-xs sm:text-sm font-semibold">Sort</span>
            </m3e-menu-trigger>
          </m3e-menu-item>

          <m3e-menu-item id="engine-menu-item" style={{ margin: '2px 0' }}>
            <span
              slot="icon"
              className="material-symbols-rounded text-lg text-[var(--md-sys-color-primary)]"
            >
              tune
            </span>
            <m3e-menu-trigger for="home-filter-engine-menu">
              <span className="text-xs sm:text-sm font-semibold">Engine</span>
            </m3e-menu-trigger>
          </m3e-menu-item>

          <m3e-menu-item style={{ margin: '2px 0' }}>
            <span
              slot="icon"
              className="material-symbols-rounded text-lg text-[var(--md-sys-color-primary)]"
            >
              hub
            </span>
            <m3e-menu-trigger for="home-filter-provider-menu">
              <span className="text-xs sm:text-sm font-semibold">Provider</span>
            </m3e-menu-trigger>
          </m3e-menu-item>
        </div>
      </m3e-menu>

      <m3e-menu
        id="home-filter-sort-menu"
        position-x="after"
        style={M3E_SUBMENU_STYLE}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '6px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {SORT_ITEMS.map((item) => (
            <m3e-menu-item-radio
              key={item.id}
              checked={filter === item.id}
              onClick={() => onSelectFilter(item.id)}
              style={{ margin: '2px 0' }}
            >
              <span
                slot="icon"
                className="material-symbols-rounded text-lg text-[var(--md-sys-color-primary)]"
              >
                {item.icon}
              </span>
              <span className="text-xs sm:text-sm font-semibold">
                {item.name}
              </span>
            </m3e-menu-item-radio>
          ))}
        </div>
      </m3e-menu>

      <m3e-menu
        id="home-filter-engine-menu"
        position-x="after"
        style={M3E_SUBMENU_STYLE}
      >
        <m3e-overflow
          direction="vertical"
          style={{
            width: '100%',
            maxHeight: 'min(360px, calc(100vh - 80px))',
          }}
          thumb-color="var(--md-sys-color-primary)"
          track-color="var(--md-sys-color-outline-variant)"
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              padding: '6px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <m3e-menu-item-checkbox
              data-engine-id="all"
              checked={isAllEngines}
              onClick={onSelectAllEngines}
              style={{ margin: '2px 0' }}
            >
              <span
                slot="icon"
                className="material-symbols-rounded text-lg text-[var(--md-sys-color-primary)]"
              >
                apps
              </span>
              <span className="text-xs sm:text-sm font-semibold">All</span>
            </m3e-menu-item-checkbox>

            {ENGINE_ITEMS.map((eng) => {
              const isSelected = selectedEngines.some(
                (e) => e.toLowerCase() === eng.id.toLowerCase(),
              )
              return (
                <m3e-menu-item-checkbox
                  key={eng.id}
                  data-engine-id={eng.id}
                  checked={isSelected}
                  onClick={() => onToggleEngine(eng.id)}
                  style={{ margin: '2px 0' }}
                >
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
                  <span className="text-xs sm:text-sm font-semibold truncate">
                    {eng.name}
                  </span>
                </m3e-menu-item-checkbox>
              )
            })}
          </div>
        </m3e-overflow>
      </m3e-menu>

      <m3e-menu
        id="home-filter-provider-menu"
        position-x="after"
        style={M3E_SUBMENU_STYLE}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '6px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <m3e-menu-item-checkbox
            checked={true}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault()
            }}
            style={{ margin: '2px 0' }}
          >
            <img
              slot="icon"
              src="/imgs/icons/app/gamebanana.webp"
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
            <span className="text-xs sm:text-sm font-semibold">Gamebanana</span>
          </m3e-menu-item-checkbox>
        </div>
      </m3e-menu>
    </>
  )
}
