import React from 'react'
import {
  SIDEBAR_NAV_ITEMS,
  MOBILE_NAV_ITEM_STYLE,
  ACTION_ICON_BUTTON_STYLE,
} from '../constants'
import { prefetchView } from '@/core/routes/prefetch'
import { SidebarIcon } from './SidebarIcon'
import type { SidebarStyle } from '../sidebar-style'

export interface MobileBottomNavProps {
  activePath: string
  onNavigate: (path: string) => void
  onOpenSettings: () => void
  isSettingsOpen?: boolean
  sidebarStyle?: SidebarStyle
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activePath,
  onNavigate,
  onOpenSettings,
  isSettingsOpen = false,
  sidebarStyle = 'default',
}) => {
  const isHomeStyle = sidebarStyle === 'home'
  return (
    <nav
      className="flex md:hidden fixed bottom-0 left-0 right-0 w-full pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))] backdrop-blur-xl border-t items-center justify-around z-40 px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.14)] select-none"
      style={{
        backgroundColor:
          'color-mix(in srgb, var(--md-sys-color-surface-container-low) 88%, transparent)',
        borderColor: 'var(--md-sys-color-outline-variant)',
      }}
    >
      {SIDEBAR_NAV_ITEMS.map((item) => {
        const isActive =
          activePath === item.path ||
          (item.path === '/home' && activePath === '/')

        return (
          <m3e-nav-item
            key={item.id}
            orientation="vertical"
            selected={isActive ? true : undefined}
            onClick={() => onNavigate(item.path)}
            onTouchStart={() => prefetchView(item.path)}
            onPointerEnter={() => prefetchView(item.path)}
            style={MOBILE_NAV_ITEM_STYLE}
          >
            {isHomeStyle ? (
              <>
                <span
                  slot="icon"
                  className="material-symbols-rounded text-[22px] leading-none pointer-events-none"
                  style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}
                >
                  {item.icon}
                </span>
                <span
                  slot="selected-icon"
                  className="material-symbols-rounded text-[22px] leading-none pointer-events-none"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}
                >
                  {item.icon}
                </span>
              </>
            ) : (
              <>
                <div slot="icon" className="flex items-center justify-center pointer-events-none">
                  <SidebarIcon name={item.id} isActive={false} size={24} />
                </div>
                <div
                  slot="selected-icon"
                  className="flex items-center justify-center pointer-events-none"
                >
                  <SidebarIcon name={item.id} isActive={true} size={24} />
                </div>
              </>
            )}
            <span
              className={`text-[10px] tracking-tight mt-0.5 transition-all duration-200 ${
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
        )
      })}

      <div
        className="w-[1px] h-6 mx-1 z-10"
        style={{ backgroundColor: 'var(--md-sys-color-outline-variant)' }}
      />

        <m3e-icon-button
          aria-label="Settings"
          variant="standard"
          onClick={onOpenSettings}
          title="Settings"
          style={ACTION_ICON_BUTTON_STYLE}
          className="group"
        >
          {isHomeStyle ? (
            <span
              className="material-symbols-rounded text-[22px] leading-none"
              style={{
                color: isSettingsOpen
                  ? 'var(--md-sys-color-primary)'
                  : 'var(--md-sys-color-on-surface-variant)',
                fontVariationSettings: isSettingsOpen ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              settings
            </span>
          ) : (
            <SidebarIcon name="settings" isActive={isSettingsOpen} size={24} />
          )}
        </m3e-icon-button>
    </nav>
  )
}
