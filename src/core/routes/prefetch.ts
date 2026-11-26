const prefetchedKeys = new Set<string>()
let secondaryPrefetchScheduled = false

const PREFETCHERS: Record<string, () => Promise<unknown>> = {
  '/home': () => import('@/features/home/HomeView'),
  '/library': () => import('@/features/library/LibraryView'),
  '/instances': () => import('@/features/instances/InstancesView'),
  '/news': () => import('@/features/news/NewsView'),
  'mod-details': () => import('@/ui/mod-details-modal/mod-details-modal'),
  about: () => import('@/ui/sidebar/components/AboutModal'),
  settings: () => import('@/ui/sidebar/components/SettingsModal'),
}

/**
 * Prefetches the lazy JS chunk for a route or modal at most once.
 */
export function prefetchView(key: string): void {
  const normalized = key === '/' ? '/home' : key
  if (prefetchedKeys.has(normalized)) return

  const loader = PREFETCHERS[normalized]
  if (!loader) return

  prefetchedKeys.add(normalized)
  void loader().catch(() => {
    prefetchedKeys.delete(normalized)
  })
}

/**
 * Warms secondary tab and modal chunks during browser idle time after startup.
 */
export function prefetchSecondaryViews(activePath: string): void {
  if (secondaryPrefetchScheduled || typeof window === 'undefined') return
  secondaryPrefetchScheduled = true

  const normalizedActive = activePath === '/' ? '/home' : activePath
  const targets = ['/home', '/library', '/instances', '/news', 'mod-details'].filter(
    (target) => target !== normalizedActive,
  )

  const runQueue = () => {
    let index = 0
    const step = () => {
      if (index >= targets.length) return
      prefetchView(targets[index++])
      if (index < targets.length) {
        window.setTimeout(step, 60)
      }
    }
    step()
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(runQueue, { timeout: 500 })
  } else {
    window.setTimeout(runQueue, 100)
  }
}
