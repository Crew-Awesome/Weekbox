import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import gsap from 'gsap'
import { formatFileSize } from '@/utils/formatters'
import type {
  EngineDownloadTask,
  GitHubReleaseAsset,
} from '@/core/engines'
import {
  EngineInstallVisual,
  type EngineInstallVisualPhase,
} from './EngineInstallVisual'

export interface InstancesInstallMorphControlProps {
  selectedVersion: string | null
  selectedTask?: EngineDownloadTask
  isInstallStarting: boolean
  recommendedAsset?: GitHubReleaseAsset
  busyPhase: EngineInstallVisualPhase
  busyLabel: string
  busyDetail: string
  smoothProgress: number
  onInstallSelected: () => void
  onCancelDownload: (version: string) => void
}

interface VisualSnapshot {
  phase: EngineInstallVisualPhase
  label: string
  detail: string
  progress: number
  isCanceling: boolean
  isExtracting: boolean
}

type MorphVisualMode = 'idle' | 'active' | 'collapsing'

/**
 * Single morphing container for Instances that starts as the compact rounded
 * primary Install button, gradually expands without border-radius while fading
 * its background/border to transparent as it splits into 3 controls, and
 * smoothly shrinks back into the solid rounded Install button on cancel.
 */
export const InstancesInstallMorphControl: React.FC<
  InstancesInstallMorphControlProps
> = ({
  selectedVersion,
  selectedTask,
  isInstallStarting,
  recommendedAsset,
  busyPhase,
  busyLabel,
  busyDetail,
  smoothProgress,
  onInstallSelected,
  onCancelDownload,
}) => {
  const isTaskBusy = Boolean(
    selectedTask &&
      selectedTask.status !== 'completed' &&
      selectedTask.status !== 'error',
  )
  const isExpandedTarget = Boolean(isTaskBusy || isInstallStarting)

  const [visualMode, setVisualMode] = useState<MorphVisualMode>(() =>
    isExpandedTarget ? 'active' : 'idle',
  )
  const [collapseSnapshot, setCollapseSnapshot] = useState<VisualSnapshot>({
    phase: busyPhase,
    label: busyLabel,
    detail: busyDetail,
    progress: smoothProgress,
    isCanceling: selectedTask?.status === 'canceling',
    isExtracting: selectedTask?.status === 'extracting',
  })

  const shellRef = useRef<HTMLDivElement>(null)
  const bgLayerRef = useRef<HTMLDivElement>(null)
  const splitRowRef = useRef<HTMLDivElement>(null)
  const shapeSlotRef = useRef<HTMLSpanElement>(null)
  const statusPillRef = useRef<HTMLDivElement>(null)
  const cancelBtnRef = useRef<HTMLButtonElement>(null)
  const idleTargetRef = useRef<HTMLDivElement>(null)

  const lastIdleBoundsRef = useRef<{ width: number; height: number }>({
    width: 120,
    height: 42,
  })
  const lastActiveBoundsRef = useRef<{ width: number; height: number }>({
    width: 340,
    height: 44,
  })
  const prevExpandedRef = useRef(isExpandedTarget)
  const prevVersionRef = useRef(selectedVersion)
  const prevVisualModeRef = useRef<MorphVisualMode>(visualMode)
  const activeTimelineRef = useRef<gsap.core.Timeline | null>(null)
  const latestSnapshotRef = useRef<VisualSnapshot>({
    phase: busyPhase,
    label: busyLabel,
    detail: busyDetail,
    progress: smoothProgress,
    isCanceling: selectedTask?.status === 'canceling',
    isExtracting: selectedTask?.status === 'extracting',
  })

  useEffect(() => {
    latestSnapshotRef.current = {
      phase: selectedTask ? busyPhase : 'downloading',
      label: selectedTask ? busyLabel : 'Starting',
      detail: selectedTask
        ? busyDetail
        : recommendedAsset?.name || 'Preparing download...',
      progress: smoothProgress,
      isCanceling: selectedTask?.status === 'canceling',
      isExtracting: selectedTask?.status === 'extracting',
    }
  }, [
    busyDetail,
    busyLabel,
    busyPhase,
    recommendedAsset?.name,
    selectedTask,
    smoothProgress,
  ])

  useEffect(() => {
    const versionChanged = prevVersionRef.current !== selectedVersion
    const wasExpanded = prevExpandedRef.current
    prevVersionRef.current = selectedVersion
    prevExpandedRef.current = isExpandedTarget

    const rafId = requestAnimationFrame(() => {
      if (versionChanged) {
        activeTimelineRef.current?.kill()
        activeTimelineRef.current = null
        setVisualMode(isExpandedTarget ? 'active' : 'idle')
        return
      }

      if (!wasExpanded && isExpandedTarget) {
        setVisualMode('active')
      } else if (wasExpanded && !isExpandedTarget) {
        setCollapseSnapshot(latestSnapshotRef.current)
        setVisualMode('collapsing')
      }
    })

    return () => cancelAnimationFrame(rafId)
  }, [isExpandedTarget, selectedVersion])

  useLayoutEffect(() => {
    const shell = shellRef.current
    const bgLayer = bgLayerRef.current
    if (!shell || !bgLayer) return

    const isVisible = shell.getClientRects().length > 0
    const prevMode = prevVisualModeRef.current
    prevVisualModeRef.current = visualMode

    if (visualMode === 'idle') {
      activeTimelineRef.current?.kill()
      activeTimelineRef.current = null
      gsap.set(shell, { clearProps: 'width,height,borderRadius,transform' })
      gsap.set(bgLayer, { clearProps: 'opacity,transform' })
      if (isVisible && shell.offsetWidth > 0) {
        lastIdleBoundsRef.current = {
          width: shell.offsetWidth,
          height: shell.offsetHeight,
        }
      }
      return
    }

    if (visualMode === 'active') {
      if (prevMode === 'active') {
        if (!activeTimelineRef.current) {
          gsap.set(bgLayer, { opacity: 0 })
          if (isVisible && shell.offsetWidth > 0) {
            lastActiveBoundsRef.current = {
              width: shell.offsetWidth,
              height: shell.offsetHeight,
            }
          }
        }
        return
      }

      activeTimelineRef.current?.kill()
      if (!isVisible) {
        gsap.set(bgLayer, { opacity: 0 })
        return
      }

      gsap.set(shell, { width: 'auto', height: 'auto' })
      const toWidth = shell.offsetWidth
      const toHeight = shell.offsetHeight
      lastActiveBoundsRef.current = { width: toWidth, height: toHeight }

      const fromWidth = lastIdleBoundsRef.current.width || 120
      const fromHeight = lastIdleBoundsRef.current.height || 42

      const shapeEl = shapeSlotRef.current
      const statusEl = statusPillRef.current
      const cancelEl = cancelBtnRef.current

      const tl = gsap.timeline({
        onComplete: () => {
          activeTimelineRef.current = null
          gsap.set(shell, { clearProps: 'width,height,borderRadius,transform' })
        },
      })
      activeTimelineRef.current = tl

      // Gradually grow from compact rounded pill into wide unrounded container
      tl.fromTo(
        shell,
        {
          width: fromWidth,
          height: fromHeight,
          borderRadius: 12,
          scale: 0.96,
        },
        {
          width: toWidth,
          height: toHeight,
          borderRadius: 0,
          scale: 1,
          duration: 0.42,
          ease: 'power3.out',
        },
        0,
      )

      // Gradually fade out solid background & border until completely transparent
      tl.fromTo(
        bgLayer,
        { opacity: 1 },
        {
          opacity: 0,
          duration: 0.45,
          ease: 'power2.out',
        },
        0.04,
      )

      if (shapeEl) {
        tl.fromTo(
          shapeEl,
          { x: 22, scale: 0.35, opacity: 0 },
          {
            x: 0,
            scale: 1,
            opacity: 1,
            duration: 0.42,
            ease: 'back.out(1.6)',
            clearProps: 'transform,opacity',
          },
          0.08,
        )
      }

      if (statusEl) {
        tl.fromTo(
          statusEl,
          { scaleX: 0.45, scaleY: 0.85, opacity: 0 },
          {
            scaleX: 1,
            scaleY: 1,
            opacity: 1,
            duration: 0.4,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
          },
          0.06,
        )
      }

      if (cancelEl) {
        tl.fromTo(
          cancelEl,
          { x: -22, scale: 0.35, opacity: 0 },
          {
            x: 0,
            scale: 1,
            opacity: 1,
            duration: 0.42,
            ease: 'back.out(1.6)',
            clearProps: 'transform,opacity',
          },
          0.1,
        )
      }
      return
    }

    if (visualMode === 'collapsing') {
      activeTimelineRef.current?.kill()

      if (!isVisible) {
        const rafId = requestAnimationFrame(() => setVisualMode('idle'))
        return () => cancelAnimationFrame(rafId)
      }

      const idleEl = idleTargetRef.current
      const splitEl = splitRowRef.current
      const toWidth = idleEl?.offsetWidth || lastIdleBoundsRef.current.width || 120
      const toHeight = idleEl?.offsetHeight || lastIdleBoundsRef.current.height || 42
      const fromWidth = lastActiveBoundsRef.current.width || 340
      const fromHeight = lastActiveBoundsRef.current.height || 44

      const shapeEl = shapeSlotRef.current
      const statusEl = statusPillRef.current
      const cancelEl = cancelBtnRef.current

      if (splitEl) {
        gsap.set(splitEl, {
          position: 'absolute',
          left: '50%',
          top: '50%',
          xPercent: -50,
          yPercent: -50,
        })
      }

      const tl = gsap.timeline({
        onComplete: () => {
          activeTimelineRef.current = null
          setVisualMode('idle')
        },
      })
      activeTimelineRef.current = tl

      if (shapeEl) {
        tl.to(
          shapeEl,
          {
            x: 24,
            scale: 0.35,
            opacity: 0,
            duration: 0.22,
            ease: 'power2.in',
          },
          0,
        )
      }

      if (statusEl) {
        tl.to(
          statusEl,
          {
            scaleX: 0.45,
            scaleY: 0.85,
            opacity: 0,
            duration: 0.22,
            ease: 'power2.in',
          },
          0.02,
        )
      }

      if (cancelEl) {
        tl.to(
          cancelEl,
          {
            x: -24,
            scale: 0.35,
            opacity: 0,
            duration: 0.2,
            ease: 'power2.in',
          },
          0,
        )
      }

      // Shrink cleanly from wide flat container back into compact rounded button
      tl.fromTo(
        shell,
        {
          width: fromWidth,
          height: fromHeight,
          borderRadius: 0,
        },
        {
          width: toWidth,
          height: toHeight,
          borderRadius: 12,
          duration: 0.38,
          ease: 'power3.inOut',
        },
        0.06,
      )

      // Gradually restore solid primary opacity until completely solid
      tl.fromTo(
        bgLayer,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.42,
          ease: 'power2.inOut',
        },
        0.04,
      )

      if (idleEl) {
        tl.fromTo(
          idleEl,
          { opacity: 0, scale: 0.88 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.24,
            ease: 'power2.out',
          },
          0.22,
        )
      }
    }
  }, [visualMode])

  useEffect(() => {
    return () => {
      activeTimelineRef.current?.kill()
      activeTimelineRef.current = null
    }
  }, [])

  const handleInstallClick = useCallback(() => {
    if (shellRef.current && visualMode === 'idle' && shellRef.current.offsetWidth > 0) {
      lastIdleBoundsRef.current = {
        width: shellRef.current.offsetWidth,
        height: shellRef.current.offsetHeight,
      }
    }
    setVisualMode('active')
    onInstallSelected()
  }, [onInstallSelected, visualMode])

  const handleCancelClick = useCallback(() => {
    if (!selectedVersion) return
    if (shellRef.current && shellRef.current.offsetWidth > 0) {
      lastActiveBoundsRef.current = {
        width: shellRef.current.offsetWidth,
        height: shellRef.current.offsetHeight,
      }
    }
    setCollapseSnapshot(latestSnapshotRef.current)
    onCancelDownload(selectedVersion)
  }, [onCancelDownload, selectedVersion])

  const activeSnapshot: VisualSnapshot =
    visualMode === 'active'
      ? {
          phase: selectedTask ? busyPhase : 'downloading',
          label: selectedTask ? busyLabel : 'Starting',
          detail: selectedTask
            ? busyDetail
            : recommendedAsset?.name || 'Preparing download...',
          progress: smoothProgress,
          isCanceling: selectedTask?.status === 'canceling',
          isExtracting: selectedTask?.status === 'extracting',
        }
      : collapseSnapshot

  const isDisabledInstall = isInstallStarting || !recommendedAsset

  if (visualMode === 'idle') {
    return (
      <div
        ref={shellRef}
        className="relative inline-flex items-center justify-center rounded-xl overflow-hidden shadow-sm shrink-0"
      >
        <div
          ref={bgLayerRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[var(--md-sys-color-primary)]"
          style={{
            backgroundColor: 'var(--md-sys-color-primary)',
            border: '1px solid color-mix(in srgb, var(--md-sys-color-primary) 40%, transparent)',
          }}
        />
        <button
          type="button"
          onClick={handleInstallClick}
          disabled={isDisabledInstall}
          className="relative z-10 inline-flex items-center justify-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold transition-transform duration-150 cursor-pointer hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-default disabled:hover:brightness-100 whitespace-nowrap bg-[var(--md-sys-color-primary)]"
          style={{
            backgroundColor: 'var(--md-sys-color-primary)',
            color: 'var(--md-sys-color-on-primary)',
          }}
        >
          <EngineInstallVisual phase="idle" progress={0} size={26} />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs sm:text-sm font-bold">Install</span>
            {recommendedAsset && (
              <span className="text-[9px] sm:text-[10px] font-mono font-normal opacity-85 leading-tight">
                {formatFileSize(recommendedAsset.size)}
              </span>
            )}
          </div>
        </button>
      </div>
    )
  }

  return (
    <div
      ref={shellRef}
      className="relative inline-flex items-center justify-center rounded-none overflow-hidden shrink-0"
    >
      <div
        ref={bgLayerRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          backgroundColor: 'var(--md-sys-color-primary)',
          border: '1px solid color-mix(in srgb, var(--md-sys-color-primary) 45%, transparent)',
        }}
      />

      {visualMode === 'collapsing' && (
        <div
          ref={idleTargetRef}
          aria-hidden="true"
          className="pointer-events-none relative z-20 inline-flex items-center justify-center gap-2 sm:gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap"
          style={{
            color: 'var(--md-sys-color-on-primary)',
          }}
        >
          <EngineInstallVisual phase="idle" progress={0} size={26} />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs sm:text-sm font-bold">Install</span>
            {recommendedAsset && (
              <span className="text-[9px] sm:text-[10px] font-mono font-normal opacity-85 leading-tight">
                {formatFileSize(recommendedAsset.size)}
              </span>
            )}
          </div>
        </div>
      )}

      <div
        ref={splitRowRef}
        className={`flex items-center gap-1.5 sm:gap-2 shrink-0 relative z-10 whitespace-nowrap ${
          visualMode === 'collapsing' ? 'pointer-events-none' : ''
        }`}
      >
        <span
          ref={shapeSlotRef}
          className="inline-flex items-center justify-center shrink-0"
        >
          <EngineInstallVisual
            phase={activeSnapshot.phase}
            progress={activeSnapshot.progress}
            size={40}
            showRing={false}
            tone="primary"
          />
        </span>

        <div
          ref={statusPillRef}
          role="status"
          aria-live="polite"
          className="inline-flex flex-col items-center justify-center w-24 min-[360px]:w-32 min-[400px]:w-40 sm:w-52 h-[38px] sm:h-[42px] px-2 sm:px-3.5 py-1 rounded-2xl shadow-sm overflow-hidden shrink-0 transition-colors duration-300"
          style={{
            backgroundColor: activeSnapshot.isCanceling
              ? 'color-mix(in srgb, var(--md-sys-color-error) 14%, transparent)'
              : 'color-mix(in srgb, var(--md-sys-color-primary) 14%, transparent)',
            border: activeSnapshot.isCanceling
              ? '1px solid color-mix(in srgb, var(--md-sys-color-error) 40%, transparent)'
              : '1px solid color-mix(in srgb, var(--md-sys-color-primary) 40%, transparent)',
            color: activeSnapshot.isCanceling
              ? 'var(--md-sys-color-error)'
              : 'var(--md-sys-color-primary)',
          }}
        >
          <span className="text-xs sm:text-sm font-bold tracking-wide leading-tight truncate w-full text-center">
            {activeSnapshot.label}
          </span>
          <span
            className="text-[10px] font-mono leading-tight opacity-80 truncate w-full text-center"
            title={activeSnapshot.detail}
          >
            {activeSnapshot.detail || '\u00A0'}
          </span>
        </div>

        {!activeSnapshot.isExtracting && (
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={handleCancelClick}
            disabled={activeSnapshot.isCanceling || visualMode === 'collapsing'}
            className="inline-flex items-center justify-center w-9 h-9 sm:h-[40px] min-[400px]:w-auto gap-1 sm:gap-1.5 px-0 min-[400px]:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-colors duration-150 cursor-pointer hover:bg-[var(--md-sys-color-error)]/20 text-[var(--md-sys-color-error)] border border-[var(--md-sys-color-error)]/40 disabled:opacity-50 disabled:cursor-default shrink-0 whitespace-nowrap"
            title="Cancel"
          >
            <span className="material-symbols-rounded text-sm sm:text-base">
              close
            </span>
            <span className="hidden min-[400px]:inline">
              {activeSnapshot.isCanceling ? 'Canceling...' : 'Cancel'}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
