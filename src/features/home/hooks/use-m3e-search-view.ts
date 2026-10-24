import { useRef, useEffect, useCallback } from 'react'
import { findScrollableParent } from '@/utils'

export type M3eSearchViewElement = HTMLElement & {
  open?: boolean
  clear?: () => void
  _handleFocusChange?: (focused: boolean) => void
  currentMode?: string
}

interface UseM3eSearchViewParams {
  onClear?: () => void
}

/**
 * Encapsulates `m3e-search-view` custom element behavior: scroll position preservation,
 * `preventScroll` focus patching, internal shadow DOM scroll disabling, and outside-click dismissal.
 */
export function useM3eSearchView({ onClear }: UseM3eSearchViewParams) {
  const inputRef = useRef<HTMLInputElement>(null)
  const searchViewRef = useRef<M3eSearchViewElement>(null)

  const isUserScrollingRef = useRef(false)
  const userScrollResetTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const lockedScrollTopRef = useRef<number | null>(null)

  useEffect(() => {
    const handleUserIntent = () => {
      isUserScrollingRef.current = true
      if (userScrollResetTimer.current) {
        clearTimeout(userScrollResetTimer.current)
      }
      userScrollResetTimer.current = setTimeout(() => {
        isUserScrollingRef.current = false
      }, 200)
    }

    window.addEventListener('wheel', handleUserIntent, { passive: true })
    window.addEventListener('touchmove', handleUserIntent, { passive: true })

    return () => {
      window.removeEventListener('wheel', handleUserIntent)
      window.removeEventListener('touchmove', handleUserIntent)
      if (userScrollResetTimer.current) {
        clearTimeout(userScrollResetTimer.current)
      }
    }
  }, [])

  const preserveScroll = useCallback(() => {
    const container = findScrollableParent(searchViewRef.current)
    if (!container) return
    const targetScroll = container.scrollTop
    lockedScrollTopRef.current = targetScroll

    const startTime = performance.now()
    const checkAndClamp = () => {
      if (isUserScrollingRef.current) {
        lockedScrollTopRef.current = null
        return
      }
      if (
        lockedScrollTopRef.current !== null &&
        container.scrollTop !== lockedScrollTopRef.current
      ) {
        container.scrollTop = lockedScrollTopRef.current
      }
      if (performance.now() - startTime < 350) {
        requestAnimationFrame(checkAndClamp)
      } else {
        lockedScrollTopRef.current = null
      }
    }
    requestAnimationFrame(checkAndClamp)
  }, [])

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    const origFocus = input.focus.bind(input)
    input.focus = (options?: FocusOptions) => {
      origFocus({ ...options, preventScroll: true })
    }
  }, [])

  const ensureInternalScrollDisabled = useCallback(() => {
    const view = searchViewRef.current
    if (!view) return
    const scrollContainer = view.shadowRoot?.querySelector(
      '.scroll-container',
    ) as HTMLElement | null
    if (scrollContainer) {
      scrollContainer.style.overflow = 'hidden'
    }
  }, [])

  useEffect(() => {
    const view = searchViewRef.current
    if (!view) return

    ensureInternalScrollDisabled()

    view._handleFocusChange = (focused: boolean) => {
      if (!focused && view.currentMode === 'docked') {
        preserveScroll()
        view.open = false
      }
    }

    const handleBeforeToggle = () => {
      preserveScroll()
      ensureInternalScrollDisabled()
    }

    view.addEventListener('beforetoggle', handleBeforeToggle)

    const handleGlobalPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!view.contains(e.target as Node)) {
        if (view.open) {
          preserveScroll()
          view.open = false
        }
        inputRef.current?.blur()
      }
    }

    document.addEventListener('pointerdown', handleGlobalPointerDown)
    return () => {
      view.removeEventListener('beforetoggle', handleBeforeToggle)
      document.removeEventListener('pointerdown', handleGlobalPointerDown)
    }
  }, [preserveScroll, ensureInternalScrollDisabled])

  useEffect(() => {
    const view = searchViewRef.current
    if (!view || !onClear) return

    const handleClearEvent = () => {
      onClear()
    }

    view.addEventListener('clear', handleClearEvent)
    return () => {
      view.removeEventListener('clear', handleClearEvent)
    }
  }, [onClear])

  const openSearch = useCallback(() => {
    preserveScroll()
    ensureInternalScrollDisabled()
    const view = searchViewRef.current
    if (view && !view.open) {
      const viewInternal = view.shadowRoot?.querySelector('.view')
      if (viewInternal?.classList.contains('closing')) {
        viewInternal.classList.remove('closing')
      }
      view.open = true
    }
  }, [preserveScroll, ensureInternalScrollDisabled])

  const closeSearch = useCallback(() => {
    preserveScroll()
    if (searchViewRef.current?.open) {
      searchViewRef.current.open = false
    }
    inputRef.current?.blur()
  }, [preserveScroll])

  const handleInputBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const view = searchViewRef.current
      if (
        view &&
        (!e.relatedTarget || !view.contains(e.relatedTarget as Node))
      ) {
        if (view.open) {
          preserveScroll()
          view.open = false
        }
      }
    },
    [preserveScroll],
  )

  return {
    inputRef,
    searchViewRef,
    openSearch,
    closeSearch,
    handleInputBlur,
  }
}
