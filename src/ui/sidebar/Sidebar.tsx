import React, { useEffect, useState, lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { SidebarProps, SidebarNavItem } from './types'
import { DesktopAside } from './components/DesktopAside'
import { MadeInHomeAside } from './components/MadeInHomeAside'
import { MobileBottomNav } from './components/MobileBottomNav'
import {
  getSidebarStyle,
  SIDEBAR_STYLE_CHANGED_EVENT,
  type SidebarStyle,
} from './sidebar-style'

const AboutModal = lazy(() =>
  import('./components/AboutModal').then((m) => ({ default: m.AboutModal })),
)
const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal })),
)

export type { SidebarNavItem, SidebarProps }

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const location = useLocation()
  const navigate = useNavigate()

  const [showInfo, setShowInfo] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [sidebarStyle, setSidebarStyleState] = useState<SidebarStyle>(getSidebarStyle)

  useEffect(() => {
    const syncSidebarStyle = () => setSidebarStyleState(getSidebarStyle())
    window.addEventListener(SIDEBAR_STYLE_CHANGED_EVENT, syncSidebarStyle)
    return () => {
      window.removeEventListener(SIDEBAR_STYLE_CHANGED_EVENT, syncSidebarStyle)
    }
  }, [])

  const handleNavigate = (path: string) => {
    const isCurrent =
      location.pathname === path ||
      (path === '/home' && (location.pathname === '/' || location.pathname === '/home'))

    if (isCurrent) {
      const tabId = path === '/' ? 'home' : path.slice(1)
      const overflowEl = document.querySelector(
        `#tab-panel-${tabId} m3e-overflow`,
      ) as (HTMLElement & { viewport?: HTMLElement }) | null
      const scrollTarget = overflowEl?.viewport || overflowEl
      if (scrollTarget && typeof scrollTarget.scrollTo === 'function') {
        scrollTarget.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return
    }

    if (onNavigate) {
      onNavigate(path)
    } else {
      navigate(path)
    }
  }

  return (
    <>
      {sidebarStyle === 'home' ? (
        <MadeInHomeAside
          activePath={location.pathname}
          onNavigate={handleNavigate}
          onOpenInfo={() => setShowInfo(true)}
          onOpenSettings={() => setShowSettings(true)}
          isInfoOpen={showInfo}
          isSettingsOpen={showSettings}
        />
      ) : (
        <DesktopAside
          activePath={location.pathname}
          onNavigate={handleNavigate}
          onOpenInfo={() => setShowInfo(true)}
          onOpenSettings={() => setShowSettings(true)}
          isInfoOpen={showInfo}
          isSettingsOpen={showSettings}
        />
      )}

      <MobileBottomNav
        activePath={location.pathname}
        onNavigate={handleNavigate}
        onOpenSettings={() => setShowSettings(true)}
        isSettingsOpen={showSettings}
        sidebarStyle={sidebarStyle}
      />

      {showInfo && (
        <Suspense fallback={null}>
          <AboutModal
            isOpen={showInfo}
            onClose={() => setShowInfo(false)}
          />
        </Suspense>
      )}

      {showSettings && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            onOpenAbout={() => {
              setShowSettings(false)
              setShowInfo(true)
            }}
          />
        </Suspense>
      )}
    </>
  )
}

export default Sidebar
