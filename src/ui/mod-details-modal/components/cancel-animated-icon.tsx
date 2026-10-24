import { useRef, useImperativeHandle, forwardRef, useEffect } from 'react'
import gsap from 'gsap'

export interface CancelAnimatedIconHandle {
  triggerJumpAndMorph: (onComplete?: () => void) => void
}

export interface CancelAnimatedIconProps {
  isCanceling?: boolean
  size?: number
  className?: string
  color?: string
}

const WAVY_CIRCLE_PATH =
  'M 21.80 12.00 C 21.80 14.00, 18.71 13.57, 17.72 15.30 C 16.72 17.03, 18.63 19.49, 16.90 20.49 C 15.17 21.48, 14.00 18.60, 12.00 18.60 C 10.00 18.60, 8.83 21.48, 7.10 20.49 C 5.37 19.49, 7.28 17.03, 6.28 15.30 C 5.29 13.57, 2.20 14.00, 2.20 12.00 C 2.20 10.00, 5.29 10.43, 6.28 8.70 C 7.28 6.97, 5.37 4.51, 7.10 3.51 C 8.83 2.52, 10.00 5.40, 12.00 5.40 C 14.00 5.40, 15.17 2.52, 16.90 3.51 C 18.63 4.51, 16.72 6.97, 17.72 8.70 C 18.71 10.43, 21.80 10.00, 21.80 12.00 Z'

export const CancelAnimatedIcon = forwardRef<
  CancelAnimatedIconHandle,
  CancelAnimatedIconProps
>(({ isCanceling = false, size = 22, className = '', color = 'currentColor' }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const crossGroupRef = useRef<SVGGElement>(null)
  const wavyGroupRef = useRef<SVGGElement>(null)
  const hasAnimatedRef = useRef(false)

  const runJumpAndMorph = (onComplete?: () => void) => {
    if (!containerRef.current || !crossGroupRef.current || !wavyGroupRef.current) {
      onComplete?.()
      return
    }

    hasAnimatedRef.current = true

    // Kill any existing GSAP animations on these elements
    gsap.killTweensOf([
      containerRef.current,
      crossGroupRef.current,
      wavyGroupRef.current,
    ])

    const tl = gsap.timeline({
      onComplete: () => {
        onComplete?.()
      },
    })

    // Phase 1: Jump upwards with playful spring and rotation
    tl.to(containerRef.current, {
      y: -15,
      scale: 1.25,
      rotation: 180,
      duration: 0.32,
      ease: 'back.out(2.2)',
    })

    // Phase 2: Morph "X" into wavy circle at apex of the jump
    tl.to(
      crossGroupRef.current,
      {
        scale: 0,
        opacity: 0,
        duration: 0.16,
        ease: 'power2.in',
      },
      '-=0.18',
    )

    tl.fromTo(
      wavyGroupRef.current,
      {
        scale: 0.2,
        opacity: 0,
        rotation: -90,
      },
      {
        scale: 1,
        opacity: 1,
        rotation: 0,
        duration: 0.22,
        ease: 'elastic.out(1.1, 0.6)',
      },
      '-=0.12',
    )

    // Phase 3: Land back down to resting position
    tl.to(containerRef.current, {
      y: 0,
      scale: 1,
      duration: 0.24,
      ease: 'power2.out',
    })
  }

  useImperativeHandle(ref, () => ({
    triggerJumpAndMorph: runJumpAndMorph,
  }))

  useEffect(() => {
    if (isCanceling && !hasAnimatedRef.current) {
      runJumpAndMorph()
    }
  }, [isCanceling])

  return (
    <div
      ref={containerRef}
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        transformOrigin: 'center center',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        {/* The 'X' Cancel cross lines */}
        <g
          ref={crossGroupRef}
          style={{
            transformOrigin: '12px 12px',
            opacity: isCanceling ? 0 : 1,
            transform: isCanceling ? 'scale(0)' : 'scale(1)',
          }}
        >
          <line
            x1="6.5"
            y1="6.5"
            x2="17.5"
            y2="17.5"
            stroke={color}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <line
            x1="17.5"
            y1="6.5"
            x2="6.5"
            y2="17.5"
            stroke={color}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </g>

        {/* The Wavy Indeterminate Circle Progress shape */}
        <g
          ref={wavyGroupRef}
          className={isCanceling ? 'animate-spin' : ''}
          style={{
            transformOrigin: '12px 12px',
            opacity: isCanceling ? 1 : 0,
            transform: isCanceling ? 'scale(1)' : 'scale(0.2)',
            animationDuration: '1.4s',
          }}
        >
          <path
            d={WAVY_CIRCLE_PATH}
            stroke={color}
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="46 16"
          />
        </g>
      </svg>
    </div>
  )
})

CancelAnimatedIcon.displayName = 'CancelAnimatedIcon'
