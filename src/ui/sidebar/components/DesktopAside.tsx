import React from 'react'
import { SIDEBAR_NAV_ITEMS, DESKTOP_NAV_ITEM_STYLE, ACTION_ICON_BUTTON_STYLE } from '../constants'
import { SidebarIcon } from './SidebarIcon'

export interface DesktopAsideProps {
  activePath: string
  onNavigate: (path: string) => void
  onOpenInfo: () => void
  onOpenSettings: () => void
  isInfoOpen?: boolean
  isSettingsOpen?: boolean
}

/**
 * Background action strip hosting the Info and Settings triggers behind the main curve.
 */
const AsideBackgroundActions: React.FC<{
  onOpenInfo: () => void
  onOpenSettings: () => void
  isInfoOpen?: boolean
  isSettingsOpen?: boolean
}> = ({ onOpenInfo, onOpenSettings, isInfoOpen = false, isSettingsOpen = false }) => (
  <div
    className="absolute inset-y-0 left-0 w-[68px] rounded-tr-[16px] rounded-br-[16px] z-10 flex flex-col justify-end items-end pb-6 pr-1 shadow-inner"
    style={{
      backgroundColor: 'var(--md-sys-color-surface-container-high)',
    }}
  >
    <div className="flex flex-col space-y-3 items-center w-[38px]">
      <m3e-icon-button
        aria-label="Information"
        variant="standard"
        size="small"
        onClick={onOpenInfo}
        title="Information"
        className="group transition-transform hover:scale-105"
        style={ACTION_ICON_BUTTON_STYLE}
      >
        <SidebarIcon name="info" isActive={isInfoOpen} size={20} />
      </m3e-icon-button>

      <m3e-icon-button
        aria-label="Settings"
        variant="standard"
        size="small"
        onClick={onOpenSettings}
        title="Settings"
        className="group transition-transform hover:scale-105"
        style={ACTION_ICON_BUTTON_STYLE}
      >
        <SidebarIcon name="settings" isActive={isSettingsOpen} size={20} />
      </m3e-icon-button>
    </div>
  </div>
)

/**
 * Bezier curve transition joining the wide nav tab (92px) to the narrow lower stem (20px).
 */
const AsideCurveTransition: React.FC = () => (
  <div className="w-[92px] h-14 pointer-events-auto relative -mt-[1px]">
    <svg
      viewBox="0 0 92 64"
      fill="none"
      preserveAspectRatio="none"
      className="block w-full h-full"
    >
      <path
        d="M 92 0 C 92 32 20 32 20 64 L 0 64 L 0 0 Z"
        fill="var(--md-sys-color-surface-container-low)"
      />
    </svg>
  </div>
)

/**
 * Desktop aside navigation drawer with M3 Expressive curved tab layout.
 */
export const DesktopAside: React.FC<DesktopAsideProps> = ({
  activePath,
  onNavigate,
  onOpenInfo,
  onOpenSettings,
  isInfoOpen = false,
  isSettingsOpen = false,
}) => {
  return (
    <aside className="hidden md:block relative z-40 w-[92px] h-full drop-shadow-md shrink-0 select-none">
      <AsideBackgroundActions
        onOpenInfo={onOpenInfo}
        onOpenSettings={onOpenSettings}
        isInfoOpen={isInfoOpen}
        isSettingsOpen={isSettingsOpen}
      />

      <div className="absolute inset-0 z-20 flex flex-col pointer-events-none drop-shadow-[2px_0_6px_rgba(0,0,0,0.16)]">
        <div
          className="w-[92px] rounded-tr-[16px] flex flex-col items-center pt-5 pb-2 pointer-events-auto"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container-low)',
          }}
        >
          <div className="flex items-center justify-center mb-4 w-full px-1">
            <img
              src="/imgs/icons/app/launcher-icon.png"
              alt="WeekBox"
              className="w-10 h-10 object-contain drop-shadow-sm rounded-xl hover:scale-105 transition-transform"
            />
          </div>

          <nav className="flex flex-col items-center w-full space-y-2 relative">
            {SIDEBAR_NAV_ITEMS.map((item) => {
              const isActive =
                activePath === item.path ||
                (item.path === '/home' && activePath === '/')

              return (
                <div key={item.id} className="w-full flex justify-center px-1">
                  <m3e-nav-item
                    orientation="vertical"
                    selected={isActive ? true : undefined}
                    onClick={() => onNavigate(item.path)}
                    style={DESKTOP_NAV_ITEM_STYLE}
                  >
                    <div
                      slot="icon"
                      className="flex items-center justify-center pointer-events-none"
                    >
                      <SidebarIcon name={item.id} isActive={false} size={24} />
                    </div>
                    <div
                      slot="selected-icon"
                      className="flex items-center justify-center pointer-events-none"
                    >
                      <SidebarIcon name={item.id} isActive={true} size={24} />
                    </div>
                    <span
                      className={`text-[11px] tracking-tight block text-center truncate max-w-[76px] mt-0.5 transition-all duration-200 ${
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
        </div>

        <AsideCurveTransition />

        <div
          className="w-[20px] flex-1 rounded-br-[16px] pointer-events-auto -mt-[1px]"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container-low)',
          }}
        />
      </div>
    </aside>
  )
}
