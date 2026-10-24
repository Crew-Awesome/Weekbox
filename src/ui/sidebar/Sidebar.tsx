import React, { useState, lazy, Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { SidebarProps, SidebarNavItem } from './types'
import { SIDEBAR_NAV_ITEMS } from './constants'
import { DesktopAside } from './components/DesktopAside'
import { MobileBottomNav } from './components/MobileBottomNav'

const AboutModal = lazy(() =>
  import('./components/AboutModal').then((m) => ({ default: m.AboutModal })),
)
const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal })),
)

export { SIDEBAR_NAV_ITEMS }
export type { SidebarNavItem, SidebarProps }

/**
 * Responsive application navigation shell rendering the desktop drawer and mobile bottom bar.
 */
export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const location = useLocation()
  const navigate = useNavigate()

  const [showInfo, setShowInfo] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path)
    } else {
      navigate(path)
    }
  }

  return (
    <>
      <DesktopAside
        activePath={location.pathname}
        onNavigate={handleNavigate}
        onOpenInfo={() => setShowInfo(true)}
        onOpenSettings={() => setShowSettings(true)}
        isInfoOpen={showInfo}
        isSettingsOpen={showSettings}
      />

      <MobileBottomNav
        activePath={location.pathname}
        onNavigate={handleNavigate}
        onOpenSettings={() => setShowSettings(true)}
        isSettingsOpen={showSettings}
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
          />
        </Suspense>
      )}
    </>
  )
}

export default Sidebar
