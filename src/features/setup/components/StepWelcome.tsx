import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'

interface StepWelcomeProps {
  canAnimate: boolean
  shouldSkipAnimation: boolean
  onIntroComplete: () => void
}

/**
 * Step 1: Animated welcome greeting with centered WeekBox logo and delayed Next button trigger.
 */
export const StepWelcome: React.FC<StepWelcomeProps> = ({
  canAnimate,
  shouldSkipAnimation,
  onIntroComplete,
}) => {
  const { t } = useTranslation()
  const rootRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const onCompleteRef = useRef(onIntroComplete)

  useEffect(() => {
    onCompleteRef.current = onIntroComplete
  }, [onIntroComplete])

  useEffect(() => {
    if (!canAnimate) return

    if (shouldSkipAnimation) {
      gsap.set([badgeRef.current, titleRef.current, subtitleRef.current], {
        opacity: 1,
        y: 0,
        scale: 1,
      })
      onCompleteRef.current()
      return
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          onCompleteRef.current()
        },
      })

      tl.fromTo(
        badgeRef.current,
        { opacity: 0, scale: 0.72, y: 16 },
        { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: 'back.out(1.6)' },
      )
        .fromTo(
          titleRef.current,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' },
          '-=0.22',
        )
        .fromTo(
          subtitleRef.current,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' },
          '-=0.18',
        )
    }, rootRef)

    return () => ctx.revert()
  }, [canAnimate, shouldSkipAnimation])

  return (
    <div
      ref={rootRef}
      className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto px-4 py-6"
    >
      <div
        ref={badgeRef}
        className="mb-7 opacity-0 flex items-center justify-center w-full"
      >
        <img
          src="/imgs/icons/app/launcher-icon.png"
          alt="WeekBox"
          draggable={false}
          className="w-24 h-24 sm:w-28 sm:h-28 object-contain pointer-events-none select-none mx-auto"
        />
      </div>

      <h1
        ref={titleRef}
        className="opacity-0 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-4"
        style={{ color: 'var(--md-sys-color-on-background)' }}
      >
        {t('setup.welcome.title')}
      </h1>

      <p
        ref={subtitleRef}
        className="opacity-0 text-base sm:text-xl font-medium"
        style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
      >
        {t('setup.welcome.subtitle')}
      </p>
    </div>
  )
}
