import React, { useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'

interface ModContributorsBtnProps {
  showCredits: boolean
  onClick: () => void
  className?: string
}

/**
 * Button that toggles between mod description and contributors with a GSAP hover fill effect.
 */
export const ModContributorsBtn: React.FC<ModContributorsBtnProps> = ({
  showCredits,
  onClick,
  className = '',
}) => {
  const btnRef = useRef<HTMLButtonElement>(null)
  const hoverBgRef = useRef<HTMLDivElement>(null)

  const getDefaultHoverColor = useCallback(() => {
    if (typeof window === 'undefined') return 'rgba(255, 255, 255, 0.1)'
    const style = getComputedStyle(btnRef.current || document.documentElement)
    const val =
      style.getPropertyValue('--wb-card-hover-default').trim() ||
      style.getPropertyValue('--wb-card-hover-bg').trim()
    return val || 'rgba(255, 255, 255, 0.1)'
  }, [])

  useEffect(() => {
    if (hoverBgRef.current) {
      gsap.set(hoverBgRef.current, {
        top: 6,
        left: 6,
        right: 6,
        bottom: 6,
        opacity: 0,
      })
    }
  }, [])

  const handleMouseEnter = () => {
    if (window.matchMedia('(hover: none)').matches) return
    const finalColor = getDefaultHoverColor()

    if (hoverBgRef.current) {
      gsap.killTweensOf(hoverBgRef.current)
      gsap.to(hoverBgRef.current, {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 1,
        backgroundColor: finalColor,
        duration: 0.25,
        ease: 'power2.inOut',
        overwrite: true,
      })
    }
  }

  const handleMouseLeave = () => {
    if (window.matchMedia('(hover: none)').matches) return

    if (hoverBgRef.current) {
      gsap.killTweensOf(hoverBgRef.current)
      gsap.to(hoverBgRef.current, {
        top: 6,
        left: 6,
        right: 6,
        bottom: 6,
        opacity: 0,
        backgroundColor: 'transparent',
        duration: 0.25,
        ease: 'power2.inOut',
        overwrite: true,
      })
    }
  }

  return (
    <m3e-button
      ref={btnRef}
      variant="outlined"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative isolate overflow-hidden inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--wb-primary)] hover:text-[var(--wb-on-surface)] transition-colors cursor-pointer select-none w-fit ${className}`}
      title={showCredits ? 'Back to description' : 'View all contributors'}
    >
      <div
        ref={hoverBgRef}
        className="absolute pointer-events-none z-[-1] rounded-lg"
      />

      {showCredits ? (
        <>
          <span className="material-symbols-rounded text-base shrink-0 text-[var(--wb-primary)]">
            format_align_left
          </span>
          <span>View description</span>
        </>
      ) : (
        <>
          <span className="material-symbols-rounded text-base shrink-0 text-[var(--wb-primary)]">
            group
          </span>
          <span>View all contributors</span>
        </>
      )}
    </m3e-button>
  )
}
