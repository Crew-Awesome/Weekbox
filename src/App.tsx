import React, { useEffect, lazy, Suspense } from 'react'
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { initHost } from '@/core/host'
import { useWeekBoxLibrary } from '@/core/storage'
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

const AppShell: React.FC = () => {
  const { isInitialized, libraryPath } = useWeekBoxLibrary()

  useEffect(() => {
    const hostAdapter = initHost()
    console.log(
      '[WeekBox] Current execution environment (host):',
      hostAdapter.platform,
    )
  }, [])

  useEffect(() => {
    if (isInitialized && libraryPath) {
      console.log('[WeekBox] Storage library initialized at:', libraryPath)
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
            <Routes>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<HomeView />} />
              <Route path="/library" element={<LibraryView />} />
              <Route path="/instances" element={<InstancesView />} />
              <Route path="/news" element={<NewsView />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
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
