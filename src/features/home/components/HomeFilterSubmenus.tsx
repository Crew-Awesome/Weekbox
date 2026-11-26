import React from 'react'
import { GAMEJOLT_OS_FILTERS, GAMEJOLT_SECTIONS } from '@/services/gamejolt'
import { BACKSTAGE_ENGINES, BACKSTAGE_SORTS } from '@/services/backstage'
import { MOD_PROVIDERS, type ModProviderId } from '@/services/providers'
import {
  SORT_ITEMS,
  ENGINE_ITEMS,
  M3E_MENU_STYLE,
  M3E_SUBMENU_STYLE,
} from './home-filter-constants'

export interface HomeFilterSubmenusProps {
  provider: ModProviderId
  onSelectProvider: (provider: ModProviderId) => void
  filter: string
  onSelectFilter: (filter: string) => void
  selectedEngines: string[]
  isAllEngines: boolean
  onSelectAllEngines: () => void
  onToggleEngine: (id: string) => void
}

export const HomeFilterSubmenus: React.FC<HomeFilterSubmenusProps> = ({
  provider,
  onSelectProvider,
  filter,
  onSelectFilter,
  selectedEngines,
  isAllEngines,
  onSelectAllEngines,
  onToggleEngine,
}) => {
  const sortOptions =
    provider === 'gamejolt'
      ? GAMEJOLT_SECTIONS
      : provider === 'backstage'
        ? BACKSTAGE_SORTS
        : SORT_ITEMS

  const engineOptions =
    provider === 'gamejolt'
      ? GAMEJOLT_OS_FILTERS
      : provider === 'backstage'
        ? BACKSTAGE_ENGINES
        : ENGINE_ITEMS

  const engineMenuLabel = provider === 'gamejolt' ? 'Platform' : 'Engine'

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
              <span className="text-xs sm:text-sm font-semibold">
                {engineMenuLabel}
              </span>
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
          {sortOptions.map((item) => (
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

            {engineOptions.map((eng) => {
              const isSelected = selectedEngines.some(
                (e) => e.toLowerCase() === eng.id.toLowerCase(),
              )
              const isImageIcon = eng.icon.startsWith('/')
              return (
                <m3e-menu-item-checkbox
                  key={eng.id}
                  data-engine-id={eng.id}
                  checked={isSelected}
                  onClick={() => onToggleEngine(eng.id)}
                  style={{ margin: '2px 0' }}
                >
                  {isImageIcon ? (
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
                      className="material-symbols-rounded text-lg text-[var(--md-sys-color-primary)]"
                    >
                      {eng.icon}
                    </span>
                  )}
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
          {MOD_PROVIDERS.map((item) => (
            <m3e-menu-item-radio
              key={item.id}
              checked={provider === item.id}
              onClick={() => onSelectProvider(item.id)}
              style={{ margin: '2px 0' }}
            >
              <img
                slot="icon"
                src={item.icon}
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
              <span className="text-xs sm:text-sm font-semibold">
                {item.name}
              </span>
            </m3e-menu-item-radio>
          ))}
        </div>
      </m3e-menu>
    </>
  )
}
