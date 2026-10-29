import React, { useState, useEffect, useRef } from 'react'

export interface TopbarProps {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  leading?: React.ReactNode
  trailing?: React.ReactNode
  children?: React.ReactNode
  underlay?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  sticky?: boolean
  autoHideOnScroll?: boolean
}

export const Topbar: React.FC<TopbarProps> = ({
  title,
  subtitle,
  leading,
  trailing,
  children,
  underlay,
  className = '',
  style,
  sticky = true,
  autoHideOnScroll = true,
}) => {
  const [isHidden, setIsHidden] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const lastScrollY = useRef(0)

  useEffect(() => {
    if (!sticky || !autoHideOnScroll) return
    const header = headerRef.current
    if (!header) return

    const findScrollParent = (node: HTMLElement | null): HTMLElement | null => {
      let current = node?.parentElement
      while (current) {
        const overflowHost = current as HTMLElement & { viewport?: HTMLElement }
        if (overflowHost.viewport) return overflowHost.viewport
        const computed = window.getComputedStyle(current)
        if (/(auto|scroll)/.test(computed.overflow + computed.overflowY)) {
          return current
        }
        current = current.parentElement
      }
      return null
    }

    const scrollContainer = findScrollParent(header)
    if (!scrollContainer) return

    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = scrollContainer.scrollTop
          const diff = currentY - lastScrollY.current

          if (
            header.contains(document.activeElement) ||
            header.matches(':focus-within')
          ) {
            setIsHidden(false)
            lastScrollY.current = currentY
            ticking = false
            return
          }

          if (currentY <= 15) {
            setIsHidden(false)
          } else if (diff > 8 && currentY > 50) {
            setIsHidden(true)
          } else if (diff < -8) {
            setIsHidden(false)
          }

          lastScrollY.current = currentY
          ticking = false
        })
        ticking = true
      }
    }

    scrollContainer.addEventListener('scroll', onScroll, { passive: true })
    return () => scrollContainer.removeEventListener('scroll', onScroll)
  }, [sticky, autoHideOnScroll])

  const hasLeadingOrTitle = Boolean(leading || title || subtitle)
  const effectiveIsHidden = sticky && autoHideOnScroll ? isHidden : false

  return (
    <header
      ref={headerRef}
      className={`w-full ${
        sticky ? 'sticky top-0 z-30' : 'relative'
      } relative overflow-hidden flex items-center justify-between min-h-[56px] sm:min-h-[64px] px-4 sm:px-8 py-2.5 select-none transition-all duration-300 ease-in-out ${
        effectiveIsHidden ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      } ${className}`}
      style={{
        backgroundColor:
          'color-mix(in srgb, var(--md-sys-color-surface) 62%, transparent)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom:
          '1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 45%, transparent)',
        boxShadow:
          '0 8px 32px color-mix(in srgb, var(--md-sys-color-scrim) 8%, transparent), inset 0 1px 0 color-mix(in srgb, var(--md-sys-color-surface-container-lowest) 25%, transparent)',
        color: 'var(--md-sys-color-on-surface)',
        ...style,
      }}
    >
      {underlay}

      {hasLeadingOrTitle && (
        <div className="relative z-10 flex items-center gap-3 min-w-0">
          {leading && <div className="shrink-0 flex items-center">{leading}</div>}
          {(title || subtitle) && (
            <div className="flex flex-col min-w-0">
              {title && (
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate text-[var(--md-sys-color-on-surface)] leading-tight">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs sm:text-sm text-[var(--md-sys-color-on-surface-variant)] truncate leading-tight mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {children && (
        <div className="relative z-10 flex-1 flex items-center min-w-0">
          {children}
        </div>
      )}

      {trailing && (
        <div className="relative z-10 flex items-center gap-2 shrink-0 ml-auto">
          {trailing}
        </div>
      )}
    </header>
  )
}

export default Topbar
