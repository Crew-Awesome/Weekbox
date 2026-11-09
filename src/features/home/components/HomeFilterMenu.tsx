import React, { useMemo, useState, useEffect } from 'react'
import type { ModFilter } from '@/services/gamebanana'
import { FilterIcon } from '@/ui/icons/FilterIcon'
import {
  M3E_BUTTON_STYLE,
  HomeFilterSubmenus,
} from './HomeFilterSubmenus'

export interface HomeFilterMenuProps {
  filter: ModFilter
  onSelectFilter: (filter: ModFilter) => void
  engineFilter: string | string[]
  onSelectEngine: (engine: string | string[]) => void
  className?: string
}

export const HomeFilterMenu: React.FC<HomeFilterMenuProps> = ({
  filter,
  onSelectFilter,
  engineFilter,
  onSelectEngine,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const selectedEngines = useMemo<string[]>(() => {
    if (!engineFilter) return []
    if (Array.isArray(engineFilter)) {
      return engineFilter.filter((id) => id && id.toLowerCase() !== 'all')
    }
    return engineFilter.toLowerCase() === 'all' ? [] : [engineFilter]
  }, [engineFilter])

  const isAllEngines = selectedEngines.length === 0
  const isFiltered = filter !== 'ripe' || !isAllEngines

  const handleToggleEngine = (id: string) => {
    const isSelected = selectedEngines.some(
      (e) => e.toLowerCase() === id.toLowerCase(),
    )
    if (isSelected) {
      const next = selectedEngines.filter(
        (e) => e.toLowerCase() !== id.toLowerCase(),
      )
      onSelectEngine(next.length === 0 ? 'all' : next)
    } else {
      onSelectEngine([...selectedEngines, id])
    }
  }

  const handleSelectAllEngines = () => {
    onSelectEngine('all')
    const mainMenu = document.getElementById('home-filter-menu') as unknown as {
      hideAll?: (restoreFocus?: boolean) => void
    }
    mainMenu?.hideAll?.(true)
  }

  useEffect(() => {
    const engineMenuEl = document.getElementById('home-filter-engine-menu')
    if (!engineMenuEl) return

    const handleEngineClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const item = target?.closest('m3e-menu-item-checkbox')
      if (!item) return
      const engineId = item.getAttribute('data-engine-id')
      if (engineId === 'all') {
        return
      }
      e.preventDefault()
    }

    const handleEngineMouseLeave = (e: MouseEvent) => {
      const related = e.relatedTarget as Node | null
      const triggerItem = document.getElementById('engine-menu-item')
      if (triggerItem && related && triggerItem.contains(related)) {
        return
      }
      const menu = engineMenuEl as unknown as { hide?: () => void }
      menu?.hide?.()
    }

    engineMenuEl.addEventListener('click', handleEngineClickCapture, { capture: true })
    engineMenuEl.addEventListener('mouseleave', handleEngineMouseLeave)

    return () => {
      engineMenuEl.removeEventListener('click', handleEngineClickCapture, { capture: true })
      engineMenuEl.removeEventListener('mouseleave', handleEngineMouseLeave)
    }
  }, [])

  useEffect(() => {
    const ids = [
      'home-filter-menu',
      'home-filter-sort-menu',
      'home-filter-engine-menu',
      'home-filter-provider-menu',
    ]

    const checkAnyOpen = () => {
      const anyOpen = ids.some((id) => {
        const el = document.getElementById(id)
        if (!el) return false
        return (
          el.matches?.(':popover-open') ||
          el.classList.contains('open') ||
          (el as unknown as { isOpen?: boolean }).isOpen === true ||
          el.getAttribute('aria-hidden') === 'false'
        )
      })
      setIsOpen(anyOpen)
    }

    const listeners: Array<{ el: HTMLElement; handler: (e: Event) => void }> = []
    const observers: MutationObserver[] = []

    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (!el) return
      const handler = (e: Event) => {
        const popoverEvent = e as ToggleEvent
        if (popoverEvent.newState === 'open') {
          setIsOpen(true)
        } else {
          checkAnyOpen()
        }
      }
      el.addEventListener('toggle', handler)
      listeners.push({ el, handler })

      const obs = new MutationObserver(checkAnyOpen)
      obs.observe(el, {
        attributes: true,
        attributeFilter: ['style', 'class', 'open', 'aria-hidden'],
      })
      observers.push(obs)
    })

    return () => {
      listeners.forEach(({ el, handler }) => {
        el.removeEventListener('toggle', handler)
      })
      observers.forEach((obs) => obs.disconnect())
    }
  }, [])

  return (
    <div className={`relative shrink-0 flex items-center ${className}`}>
      <m3e-button
        variant={isFiltered ? 'filled-tonal' : 'outlined'}
        className="group"
        style={
          {
            ...M3E_BUTTON_STYLE,
            width: '46px',
            height: '46px',
            minWidth: '46px',
            maxWidth: '46px',
            padding: 0,
            borderRadius: '16px',
            transition:
              'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.25s ease, border-color 0.25s ease',
            transform: isOpen ? 'scale(0.95)' : 'scale(1)',
            ...(isFiltered
              ? {
                  '--m3e-button-tonal-container-color':
                    'color-mix(in srgb, var(--md-sys-color-primary) 14%, transparent)',
                  '--m3e-button-tonal-label-text-color':
                    'var(--md-sys-color-primary)',
                }
              : {}),
          } as React.CSSProperties
        }
        title="Filtros y ordenamiento"
        aria-label="Filtros y ordenamiento"
      >
        <m3e-menu-trigger for="home-filter-menu"></m3e-menu-trigger>
        <FilterIcon
          slot="icon"
          isActive={isFiltered}
          isOpen={isOpen}
          size={22}
        />
      </m3e-button>

      {isFiltered && (
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 pointer-events-none items-center justify-center">
          <span className="cuki-filter-indicator-ping absolute inline-flex h-full w-full rounded-full bg-[var(--md-sys-color-primary)] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--md-sys-color-primary)] ring-2 ring-[var(--md-sys-color-surface)] shadow-[0_0_8px_var(--md-sys-color-primary)]"></span>
        </span>
      )}

      <HomeFilterSubmenus
        filter={filter}
        onSelectFilter={onSelectFilter}
        selectedEngines={selectedEngines}
        isAllEngines={isAllEngines}
        onSelectAllEngines={handleSelectAllEngines}
        onToggleEngine={handleToggleEngine}
      />
    </div>
  )
}
