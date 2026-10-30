import React, { useEffect, lazy, Suspense } from 'react'
import { HashRouter, Routes,Route, Navigate, useLocation } from 'react-router-dom'
import { initHost } from '@/core/host'
import { useWeekBoxLibrary } from '@/core/storage'
import { syncActiveCallouts } from '@/core/mods'
import { syncEngineActiveCallouts } from '@/core/engines/engine-download-manager'
import { DialogProvider } from '@/ui/dialog'
import { CalloutProvider } from '@/ui/callout'
import { LoadingProvider } from '@/core/loading'
import { Sidebar } from '@/ui/sidebar'

const HomeView = lazy(() =>
  import('@/features/home').then((m) => ({ default: m.HomeView })),
)
const LibraryView = lazy(() =>
  import('@/features/library').then((m) => ({ default: m.LibraryView })),
)
const InstancesView = lazy(() =>
  import('@/features/instances').then((m) => ({ default: m.InstancesView })),
)
const NewsView = lazy(() =>
  import('@/features/news').then((m) => ({ default: m.NewsView })),
)

const TAB_CONFIGS = [
  { path: '/home', Component: HomeView },
  { path: '/library', Component: LibraryView },
  { path: '/instances', Component: InstancesView },
  { path: '/news', Component: NewsView },
] as const

const AppShell: React.FC = () => {
  const { isInitialized, libraryPath } = useWeekBoxLibrary()
  const location = useLocation()

  const normalizedPath =
    location.pathname === '/' ||
    !TAB_CONFIGS.some((t) => t.path === location.pathname)
      ? '/home'
      : location.pathname

  const [visitedTabs, setVisitedTabs] = React.useState<Set<string>>(
    () => new Set([normalizedPath]),
  )

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(normalizedPath)) return prev
      const next = new Set(prev)
      next.add(normalizedPath)
      return next
    })
  }, [normalizedPath])

  useEffect(() => {
    syncActiveCallouts()
    syncEngineActiveCallouts()
  }, [location.pathname])

  useEffect(() => {
    const hostAdapter = initHost()
    console.log(
      'Current Platform:',
      hostAdapter.platform,
    )
  }, [])

  useEffect(() => {
    if (isInitialized && libraryPath) {
      console.log('Library Path:', libraryPath)
    }
  }, [isInitialized, libraryPath])

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col md:flex-row select-none"
      style={{
        backgroundColor: 'var(--md-sys-color-background)',
        color: 'var(--md-sys-color-on-background)',
      }}
    >
      <Sidebar />

      <main
        className="flex-1 h-full overflow-hidden flex flex-col pb-16 md:pb-0"
        style={{
          backgroundColor: 'var(--md-sys-color-background)',
        }}
      >
        <m3e-overflow direction="vertical" className="w-full h-full">
          <Suspense fallback={null}>
            {location.pathname !== normalizedPath && (
              <Routes>
                <Route path="*" element={<Navigate to={normalizedPath} replace />} />
              </Routes>
            )}
            {TAB_CONFIGS.map(({ path, Component }) => {
              if (!visitedTabs.has(path)) return null
              const isCurrent = normalizedPath === path
              return (
                <div
                  key={path}
                  id={`tab-panel-${path.slice(1)}`}
                  className="w-full min-h-full"
                  style={{
                    display: isCurrent ? 'block' : 'none',
                  }}
                >
                  <Component />
                </div>
              )
            })}
          </Suspense>
        </m3e-overflow>
      </main>
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <HashRouter>
      <LoadingProvider>
        <DialogProvider>
          <CalloutProvider>
            <AppShell />
          </CalloutProvider>
        </DialogProvider>
      </LoadingProvider>
    </HashRouter>
  )
}

export default App
