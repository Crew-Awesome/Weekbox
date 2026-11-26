import { initHost, ensureNeutralinoInit } from '@/core/host'
import {
  ensureWeekBoxLibrary,
  resolveActiveLibraryPath,
} from '@/core/storage/weekbox-library'
import { syncWeekBoxSettingsOnStartup } from '@/core/storage/sync-settings'
import { getFavoriteModIds } from '@/core/mods/mod-bookmarks-favorites'
import { getEngineUpdateState } from '@/core/engines/engine-registry'
import { ENGINE_DEFINITIONS } from '@/core/engines/constants'
import { ENGINE_CATEGORIES, getFeaturedMods } from '@/services/gamebanana'
import { preloadInitialHomeMods } from '@/features/home/hooks/use-home-mods'

export interface StartupSnapshot {
  progress: number
  message: string
  isReadyToMount: boolean
  isCompleted: boolean
}

export interface StartupCallbacks {
  onUpdate: (snapshot: StartupSnapshot) => void
}

const IMAGE_PRELOAD_TIMEOUT_MS = 1200
const NETWORK_STEP_TIMEOUT_MS = 4500
const IMAGE_BATCH_SIZE = 3

let currentSnapshot: StartupSnapshot = {
  progress: 0,
  message: 'Starting WeekBox...',
  isReadyToMount: false,
  isCompleted: false,
}

let startupPromise: Promise<void> | null = null
const subscribers = new Set<StartupCallbacks['onUpdate']>()

function notifySubscribers(): void {
  const snapshotCopy: StartupSnapshot = { ...currentSnapshot }
  subscribers.forEach((cb) => {
    try {
      cb(snapshotCopy)
    } catch (err) {
      console.error('[WeekBox] Startup subscriber error:', err)
    }
  })
}

function updateSnapshot(patch: Partial<StartupSnapshot>): void {
  const nextProgress =
    patch.progress !== undefined
      ? Math.max(currentSnapshot.progress, Math.min(100, patch.progress))
      : currentSnapshot.progress

  currentSnapshot = {
    ...currentSnapshot,
    ...patch,
    progress: nextProgress,
  }
  notifySubscribers()
}

function yieldToMain(delayMs = 0): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs)
  })
}

function waitPaintFrames(count = 2, maxWaitMs = 120): Promise<void> {
  if (
    typeof window === 'undefined' ||
    typeof requestAnimationFrame !== 'function' ||
    (typeof document !== 'undefined' && document.visibilityState === 'hidden')
  ) {
    return yieldToMain(32)
  }

  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }

    const fallbackTimer = window.setTimeout(finish, maxWaitMs)
    let remaining = Math.max(1, count)

    const step = () => {
      if (settled) return
      remaining -= 1
      if (remaining <= 0) {
        window.clearTimeout(fallbackTimer)
        finish()
        return
      }
      requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  })
}

async function withStepTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
  let timerId: number | null = null
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timerId = window.setTimeout(() => resolve(fallback), timeoutMs)
      }),
    ])
  } catch {
    return fallback
  } finally {
    if (timerId !== null) {
      window.clearTimeout(timerId)
    }
  }
}

function isSkippablePreloadUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') return true
  const trimmed = url.trim()
  if (!trimmed) return true
  const clean = trimmed.split('?')[0].split('#')[0].toLowerCase()
  return clean.endsWith('.gif')
}

function preloadImageResource(
  url: string,
  timeoutMs = IMAGE_PRELOAD_TIMEOUT_MS,
): Promise<void> {
  if (typeof Image === 'undefined' || isSkippablePreloadUrl(url)) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    let settled = false
    let img: HTMLImageElement | null = new Image()
    img.decoding = 'async'

    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      if (img) {
        img.onload = null
        img.onerror = null
        img = null
      }
      resolve()
    }

    const timer = window.setTimeout(finish, timeoutMs)
    img.onload = finish
    img.onerror = finish
    img.src = url
  })
}

async function preloadInSmallBatches(
  rawUrls: Array<string | undefined | null>,
  startProgress: number,
  endProgress: number,
  buildMessage: (completed: number, total: number) => string,
): Promise<void> {
  const uniqueUrls = Array.from(
    new Set(
      rawUrls.filter(
        (u): u is string => Boolean(u) && !isSkippablePreloadUrl(u),
      ),
    ),
  )

  if (uniqueUrls.length === 0) {
    updateSnapshot({ progress: endProgress })
    return
  }

  let completed = 0
  const total = uniqueUrls.length
  const span = Math.max(0, endProgress - startProgress)

  for (let i = 0; i < total; i += IMAGE_BATCH_SIZE) {
    const batch = uniqueUrls.slice(i, i + IMAGE_BATCH_SIZE)
    await Promise.all(batch.map((url) => preloadImageResource(url)))
    completed = Math.min(total, completed + batch.length)
    const pct = startProgress + (completed / total) * span
    updateSnapshot({
      progress: pct,
      message: buildMessage(completed, total),
    })
    if (completed < total) {
      await yieldToMain(0)
    }
  }
}

function resolveInitialRoute(): '/home' | '/library' | '/instances' | '/news' {
  if (typeof window === 'undefined') return '/home'
  const rawHash = window.location.hash.replace(/^#/, '')
  const pathOnly = (rawHash.split('?')[0] || '/').trim()
  if (
    pathOnly === '/library' ||
    pathOnly === '/instances' ||
    pathOnly === '/news'
  ) {
    return pathOnly
  }
  return '/home'
}

async function loadInitialRouteChunk(
  route: '/home' | '/library' | '/instances' | '/news',
): Promise<void> {
  switch (route) {
    case '/library':
      await import('@/features/library/LibraryView')
      break
    case '/instances':
      await import('@/features/instances/InstancesView')
      break
    case '/news':
      await import('@/features/news/NewsView')
      break
    default:
      await import('@/features/home/HomeView')
      break
  }
}

async function executeStartupPipeline(): Promise<void> {
  try {
    // Stage 1, 2 & 3 in parallel: host, core icons, local library, and initial route module
    const initialRoute = resolveInitialRoute()
    updateSnapshot({ progress: 5, message: 'Initializing WeekBox...' })
    ensureNeutralinoInit()
    const hostAdapter = initHost()
    getFavoriteModIds()

    const categoryIcons = Array.from(
      new Set(Object.values(ENGINE_CATEGORIES).map((c) => c.icon)),
    )
    const coreAssets = [
      '/imgs/icons/app/launcher-icon.png',
      '/imgs/images/placeholder-mini.webp',
      ...categoryIcons,
    ]

    await Promise.all([
      withStepTimeout(hostAdapter.getAppVersion(), 800, '1.0.0'),
      withStepTimeout(
        resolveActiveLibraryPath().then(async (activePath) => {
          if (!activePath) return null
          const libResult = await ensureWeekBoxLibrary(activePath)
          await syncWeekBoxSettingsOnStartup(libResult)
          return libResult
        }),
        3000,
        null,
      ),
      withStepTimeout(loadInitialRouteChunk(initialRoute), 4500, undefined),
      preloadInSmallBatches(
        coreAssets,
        8,
        42,
        (done, total) => `Loading core interface (${done}/${total})...`,
      ),
    ])
    updateSnapshot({ progress: 48, message: 'Workspace ready' })

    // Stage 4 & 5: Load initial route data in parallel and warm immediately visible previews
    if (initialRoute === '/home') {
      updateSnapshot({ progress: 52, message: 'Loading featured & mod catalog...' })
      const [featured, homeMods] = await Promise.all([
        withStepTimeout(getFeaturedMods(), NETWORK_STEP_TIMEOUT_MS, []),
        withStepTimeout(preloadInitialHomeMods(), NETWORK_STEP_TIMEOUT_MS, []),
      ])
      updateSnapshot({ progress: 76, message: 'Mod catalog ready' })

      // Strictly bounded preview preload: top 2 carousel slides + top 4 grid cards
      const previewUrls = [
        ...featured.slice(0, 2).map((m) => m.thumbnail),
        ...homeMods.slice(0, 4).map((m) => m.thumbnail),
      ]
      await preloadInSmallBatches(
        previewUrls,
        76,
        95,
        (done, total) => `Loading previews (${done}/${total})...`,
      )
    } else if (initialRoute === '/instances') {
      updateSnapshot({ progress: 55, message: 'Loading engine registry...' })
      const engineIcons = Object.values(ENGINE_DEFINITIONS).map((def) => def.icon)
      await Promise.all([
        withStepTimeout(getEngineUpdateState(), 2500, {
          lastChecked: null,
          engines: {},
        }),
        preloadInSmallBatches(
          engineIcons,
          60,
          95,
          (done, total) => `Loading engine assets (${done}/${total})...`,
        ),
      ])
    } else {
      updateSnapshot({ progress: 92, message: 'Workspace ready' })
    }

    // Stage 6: Mount AppShell behind splash screen, wait one paint frame, then finish
    updateSnapshot({
      progress: 96,
      message: 'Finalizing interface...',
      isReadyToMount: true,
    })
    await waitPaintFrames(1, 50)

    updateSnapshot({
      progress: 100,
      message: 'Ready!',
      isReadyToMount: true,
      isCompleted: true,
    })
  } catch (err) {
    console.warn('[WeekBox] Startup pipeline fallback:', err)
    updateSnapshot({
      progress: 100,
      message: 'Ready!',
      isReadyToMount: true,
      isCompleted: true,
    })
  }
}

export function subscribeStartupLoad(
  onUpdate: StartupCallbacks['onUpdate'],
): () => void {
  subscribers.add(onUpdate)

  if (!startupPromise) {
    startupPromise = executeStartupPipeline()
  } else {
    queueMicrotask(() => {
      if (subscribers.has(onUpdate)) {
        onUpdate({ ...currentSnapshot })
      }
    })
  }

  return () => {
    subscribers.delete(onUpdate)
  }
}

export function getStartupSnapshot(): StartupSnapshot {
  return { ...currentSnapshot }
}

