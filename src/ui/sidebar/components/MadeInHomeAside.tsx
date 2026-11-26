import React from 'react'
import {
  SIDEBAR_NAV_ITEMS,
  DESKTOP_NAV_ITEM_STYLE,
  ACTION_ICON_BUTTON_STYLE,
} from '../constants'
import { prefetchView } from '@/core/routes/prefetch'
import type { DesktopAsideProps } from './DesktopAside'

/**
 * "Made in Home" sidebar variant: clean, flat classic vertical rail with icons
 * and labels only — no SVG curves, no animated SVG icons, and no WeekBox logo.
 */
export const MadeInHomeAside: React.FC<DesktopAsideProps> = ({
  activePath,
  onNavigate,
  onOpenInfo,
  onOpenSettings,
  isInfoOpen = false,
  isSettingsOpen = false,
}) => {
  return (
    <aside className="hidden md:block relative z-40 w-[88px] h-full shrink-0 select-none">
      <div
        className="w-full h-full flex flex-col justify-between items-center py-4 px-1.5 border-r"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container-low)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        <nav className="flex flex-col items-center w-full gap-2">
          {SIDEBAR_NAV_ITEMS.map((item) => {
            const isActive =
              activePath === item.path ||
              (item.path === '/home' && activePath === '/')

            return (
              <div key={item.id} className="w-full flex justify-center">
                <m3e-nav-item
                  orientation="vertical"
                  selected={isActive ? true : undefined}
                  onClick={() => onNavigate(item.path)}
                  onPointerEnter={() => prefetchView(item.path)}
                  onFocus={() => prefetchView(item.path)}
                  style={DESKTOP_NAV_ITEM_STYLE}
                >
                  <span
                    slot="icon"
                    className="material-symbols-rounded text-[22px] leading-none pointer-events-none"
                    style={{
                      fontVariationSettings: "'FILL' 0, 'wght' 400",
                    }}
                  >
                    {item.icon}
                  </span>
                  <span
                    slot="selected-icon"
                    className="material-symbols-rounded text-[22px] leading-none pointer-events-none"
                    style={{
                      fontVariationSettings: "'FILL' 1, 'wght' 500",
                    }}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={`text-[11px] tracking-tight block text-center truncate max-w-[74px] mt-0.5 transition-all duration-200 ${
                      isActive ? 'font-bold' : 'font-medium'
                    }`}
                    style={{
                      color: isActive
                        ? 'var(--md-sys-color-primary)'
                        : 'var(--md-sys-color-on-surface-variant)',
                    }}
                  >
                    {item.label}
                  </span>
                </m3e-nav-item>
              </div>
            )
          })}
        </nav>

        <div className="flex flex-col items-center gap-2 pt-2">
          <m3e-icon-button
            aria-label="Information"
            variant="standard"
            size="small"
            onClick={onOpenInfo}
            onPointerEnter={() => prefetchView('about')}
            title="Information"
            style={ACTION_ICON_BUTTON_STYLE}
          >
            <span
              className="material-symbols-rounded text-[20px] leading-none"
              style={{
                color: isInfoOpen
                  ? 'var(--md-sys-color-primary)'
                  : 'var(--md-sys-color-on-surface-variant)',
                fontVariationSettings: isInfoOpen ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              info
            </span>
          </m3e-icon-button>

          <m3e-icon-button
            aria-label="Settings"
            variant="standard"
            size="small"
            onClick={onOpenSettings}
            onPointerEnter={() => prefetchView('settings')}
            title="Settings"
            style={ACTION_ICON_BUTTON_STYLE}
          >
            <span
              className="material-symbols-rounded text-[20px] leading-none"
              style={{
                color: isSettingsOpen
                  ? 'var(--md-sys-color-primary)'
                  : 'var(--md-sys-color-on-surface-variant)',
                fontVariationSettings: isSettingsOpen ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              settings
            </span>
          </m3e-icon-button>
        </div>
      </div>
    </aside>
  )
}
