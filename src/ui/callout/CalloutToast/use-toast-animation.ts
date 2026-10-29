import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'

interface UseToastAnimationOptions {
  wrapperRef: React.RefObject<HTMLDivElement | null>
  cardRef: React.RefObject<HTMLDivElement | null>
  onDismiss: (id: string) => void
  toastId: string
  clearTimer: () => void
}

export function useToastAnimation({
  wrapperRef,
  cardRef,
  onDismiss,
  toastId,
  clearTimer,
}: UseToastAnimationOptions) {
  const isExitingRef = useRef(false)

  useEffect(() => {
    const wrapper = wrapperRef.current
    const card = cardRef.current
    if (!wrapper) return

    gsap.fromTo(
      wrapper,
      {
        y: -24,
        opacity: 0,
        scale: 0.96,
      },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.32,
        ease: 'power3.out',
        force3D: true,
      },
    )

    return () => {
      gsap.killTweensOf(wrapper)
      if (card) gsap.killTweensOf(card)
    }
  }, [wrapperRef, cardRef])

  const triggerDismiss = useCallback(() => {
    if (isExitingRef.current) return
    isExitingRef.current = true

    clearTimer()

    const card = cardRef.current
    const wrapper = wrapperRef.current
    if (!card || !wrapper) {
      onDismiss(toastId)
      return
    }

    gsap.killTweensOf(card)
    gsap.killTweensOf(wrapper)

    const tl = gsap.timeline({
      onComplete: () => {
        onDismiss(toastId)
      },
    })

    tl.to(card, {
      x: 420,
      opacity: 0,
      duration: 0.24,
      ease: 'power2.in',
      force3D: true,
    })

    tl.to(
      wrapper,
      {
        height: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        opacity: 0,
        duration: 0.22,
        ease: 'power2.inOut',
        force3D: true,
      },
      '-=0.10',
    )
  }, [cardRef, wrapperRef, onDismiss, toastId, clearTimer])

  return {
    isExitingRef,
    triggerDismiss,
  }
}

