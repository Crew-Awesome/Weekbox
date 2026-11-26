import React, { useEffect, useId, useMemo, useState } from 'react'
import { UNDETECTED_ENGINE_WARNING_MSG } from '@/core/mods/mod-filesystem'
import {
  ENGINES_CHANGED_EVENT,
  getEngineUpdateState,
  scanLocalEnginesDirectory,
  sortInstalledVersionsDesc,
  type EngineId,
  type InstalledEngineVersion,
} from '@/core/engines'
import {
  findEngineCategory,
  getSupportedEngineCategories,
  normalizeEngineCategoryId,
  type EngineCategory,
  M3E_MENU_STYLE,
  M3E_ENGINE_TRIGGER_STYLE,
} from '../constants'
import type { ModItem } from '../types'

interface EngineSelectorControlProps {
  variant: 'desktop' | 'mobile'
  displayCard: ModItem
  engineName: string
  isInstalled: boolean
  engineDropdownRef?: React.RefObject<HTMLDivElement | null>
  engineMenuId: string
  selectedVersion?: string
  handleSelectEngine: (cat: EngineCategory, version?: string) => void
}

interface EngineIconWithWarningProps {
  displayIcon?: string
  hasWarning?: boolean
  warningId: string
}

const EngineIconWithWarning: React.FC<EngineIconWithWarningProps> = ({
  displayIcon,
  hasWarning,
  warningId,
}) => (
  <span className="relative inline-flex items-center justify-center shrink-0">
    {displayIcon && (
      <img
        src={displayIcon}
        alt=""
        className={`w-4 h-4 object-contain shrink-0 transition-all duration-200 ${
          hasWarning ? 'grayscale brightness-90 opacity-75' : 'brightness-125'
        }`}
      />
    )}
    {hasWarning && (
      <span
        id={warningId}
        className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[var(--md-sys-color-tertiary)] text-[var(--md-sys-color-on-tertiary)] shadow pointer-events-auto cursor-help overflow-hidden"
        aria-label="Engine warning"
      >
        <svg
          viewBox="0 0 24 24"
          className="w-2.5 h-2.5 fill-[var(--md-sys-color-on-tertiary)] shrink-0"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2.5c-.7 0-1.34.37-1.69.97l-9.15 15.84c-.36.63-.37 1.4-.01 2.03.35.63 1.01 1.02 1.73 1.02h18.24c.72 0 1.38-.39 1.73-1.02.36-.63.35-1.4-.01-2.03L13.69 3.47c-.35-.6-.99-.97-1.69-.97zm0 13.5c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm-1-6.5c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1s-1-.45-1-1v-4z"
          />
        </svg>
      </span>
    )}
  </span>
)

/**
 * Shared engine selector trigger, warning badge tooltip, and dropdown menu
 * used by both desktop and mobile modal headers.
 */
export const EngineSelectorControl: React.FC<EngineSelectorControlProps> = ({
  variant,
  displayCard,
  engineName,
  isInstalled,
  engineDropdownRef,
  engineMenuId,
  selectedVersion = 'latest',
  handleSelectEngine,
}) => {
  const rawId = useId()
  const warningId = `${variant}-warning-${rawId.replace(/:/g, '-')}`
  const matchedCat = findEngineCategory(displayCard.engineId, engineName)
  const displayIcon = displayCard.icon || matchedCat?.icon
  const warningText =
    displayCard.engineWarningMessage || UNDETECTED_ENGINE_WARNING_MSG

  const [installedVersionsByEngine, setInstalledVersionsByEngine] = useState<
    Partial<Record<EngineId, InstalledEngineVersion[]>>
  >({})

  useEffect(() => {
    if (!isInstalled) return
    let cancelled = false

    const loadInstalledEngines = async () => {
      try {
        await scanLocalEnginesDirectory().catch(() => {})
        const state = await getEngineUpdateState()
        if (cancelled) return
        const nextMap: Partial<Record<EngineId, InstalledEngineVersion[]>> = {}
        for (const [id, rec] of Object.entries(state.engines)) {
          if (rec?.installedVersions && rec.installedVersions.length > 0) {
            nextMap[id as EngineId] = sortInstalledVersionsDesc(
              rec.installedVersions,
            )
          }
        }
        setInstalledVersionsByEngine(nextMap)
      } catch {
      }
    }

    void loadInstalledEngines()
    const handleEnginesChanged = () => {
      void loadInstalledEngines()
    }
    window.addEventListener(ENGINES_CHANGED_EVENT, handleEnginesChanged)
    return () => {
      cancelled = true
      window.removeEventListener(ENGINES_CHANGED_EVENT, handleEnginesChanged)
    }
  }, [isInstalled])

  const normalizedEngineId = normalizeEngineCategoryId(displayCard.engineId)
  const defaultEngineId = normalizeEngineCategoryId(
    displayCard.defaultEngineId || displayCard.engineId,
  )

  const visibleCategories = useMemo(() => {
    return getSupportedEngineCategories().filter((cat) => {
      if (cat.id === 'exe') return true
      const versions = installedVersionsByEngine[cat.id as EngineId]
      return Boolean(versions && versions.length > 0)
    })
  }, [installedVersionsByEngine])

  const submenuCategories = useMemo(
    () => visibleCategories.filter((cat) => cat.id !== 'exe'),
    [visibleCategories],
  )

  useEffect(() => {
    if (!isInstalled || submenuCategories.length === 0) return

    const mainMenuEl = document.getElementById(engineMenuId)
    const cleanups: Array<() => void> = []
    const submenuElements: Array<HTMLElement & { hide?: () => void }> = []

    for (const cat of submenuCategories) {
      const itemId = `${engineMenuId}-item-${cat.id}`
      const submenuId = `${engineMenuId}-sub-${cat.id}`
      const triggerItem = document.getElementById(itemId)
      const submenuEl = document.getElementById(submenuId) as
        | (HTMLElement & { hide?: () => void })
        | null

      if (!triggerItem || !submenuEl) continue
      submenuElements.push(submenuEl)

      let closeTimer: number | null = null
      const cancelClose = () => {
        if (closeTimer !== null) {
          window.clearTimeout(closeTimer)
          closeTimer = null
        }
      }
      const scheduleClose = () => {
        cancelClose()
        closeTimer = window.setTimeout(() => {
          closeTimer = null
          if (!triggerItem.matches(':hover') && !submenuEl.matches(':hover')) {
            submenuEl.hide?.()
          }
        }, 80)
      }

      const onTriggerLeave = (e: MouseEvent) => {
        const related = e.relatedTarget as Node | null
        if (related && (submenuEl === related || submenuEl.contains(related))) {
          return
        }
        scheduleClose()
      }
      const onSubmenuLeave = (e: MouseEvent) => {
        const related = e.relatedTarget as Node | null
        if (
          related &&
          (triggerItem === related || triggerItem.contains(related))
        ) {
          return
        }
        scheduleClose()
      }

      triggerItem.addEventListener('mouseenter', cancelClose)
      triggerItem.addEventListener('mouseleave', onTriggerLeave)
      submenuEl.addEventListener('mouseenter', cancelClose)
      submenuEl.addEventListener('mouseleave', onSubmenuLeave)

      cleanups.push(() => {
        cancelClose()
        triggerItem.removeEventListener('mouseenter', cancelClose)
        triggerItem.removeEventListener('mouseleave', onTriggerLeave)
        submenuEl.removeEventListener('mouseenter', cancelClose)
        submenuEl.removeEventListener('mouseleave', onSubmenuLeave)
      })
    }

    const onMainMenuToggle = () => {
      const open = (mainMenuEl as unknown as { isOpen?: boolean })?.isOpen
      if (open === false) {
        for (const sub of submenuElements) {
          sub.hide?.()
        }
      }
    }
    mainMenuEl?.addEventListener('toggle', onMainMenuToggle)

    return () => {
      for (const fn of cleanups) fn()
      mainMenuEl?.removeEventListener('toggle', onMainMenuToggle)
    }
  }, [isInstalled, submenuCategories, engineMenuId])

  if (!displayIcon && !displayCard.hasEngineWarning) return null

  const isExeCategory =
    normalizedEngineId === 'exe' || normalizedEngineId === 'executable'
  const triggerLabel =
    !isExeCategory && selectedVersion && selectedVersion !== 'latest'
      ? `${engineName} (${selectedVersion})`
      : engineName

  const gapClass = variant === 'desktop' ? 'gap-2' : 'gap-1.5'
  const labelClass =
    variant === 'desktop'
      ? 'text-xs md:text-sm font-semibold truncate max-w-[140px]'
      : 'text-xs font-semibold truncate max-w-[115px]'

  const tooltip = displayCard.hasEngineWarning ? (
    <m3e-tooltip for={warningId} position="below">
      {warningText}
    </m3e-tooltip>
  ) : null

  const closeAllMenus = (submenuId?: string) => {
    if (submenuId) {
      const sub = document.getElementById(submenuId) as
        | (HTMLElement & { hide?: () => void })
        | null
      sub?.hide?.()
    }
    const main = document.getElementById(engineMenuId) as
      | (HTMLElement & { hideAll?: (restoreFocus?: boolean) => void; hide?: () => void })
      | null
    main?.hideAll?.(true)
    main?.hide?.()
  }

  if (!isInstalled) {
    return (
      <>
        <m3e-button
          variant="outlined"
          style={{ ...M3E_ENGINE_TRIGGER_STYLE, cursor: 'default' }}
          aria-label={engineName}
        >
          <span className={`flex items-center ${gapClass}`}>
            <EngineIconWithWarning
              displayIcon={displayIcon}
              hasWarning={displayCard.hasEngineWarning}
              warningId={warningId}
            />
            <span className={labelClass}>{engineName}</span>
          </span>
        </m3e-button>
        {tooltip}
      </>
    )
  }

  return (
    <div className="relative z-40 shrink-0" ref={engineDropdownRef}>
      <m3e-button
        variant="outlined"
        style={M3E_ENGINE_TRIGGER_STYLE}
        aria-label="Select engine"
      >
        <m3e-menu-trigger for={engineMenuId}>
          <span className={`flex items-center ${gapClass}`}>
            <EngineIconWithWarning
              displayIcon={displayIcon}
              hasWarning={displayCard.hasEngineWarning}
              warningId={warningId}
            />
            <span className={labelClass}>{triggerLabel}</span>
            <span className="material-symbols-rounded text-base opacity-70 leading-none">
              arrow_drop_down
            </span>
          </span>
        </m3e-menu-trigger>
      </m3e-button>

      {tooltip}

      <m3e-menu
        id={engineMenuId}
        position-x="after"
        position-y="below"
        style={M3E_MENU_STYLE}
      >
        {visibleCategories.map((cat) => {
          const catIdLower = cat.id.toLowerCase()
          const isExe = catIdLower === 'exe'
          const isSelected =
            catIdLower === normalizedEngineId ||
            cat.name.toLowerCase() === engineName.toLowerCase()
          const isDefault =
            Boolean(defaultEngineId) &&
            (catIdLower === defaultEngineId ||
              cat.name.toLowerCase() === defaultEngineId)
          const itemId = `${engineMenuId}-item-${cat.id}`
          const submenuId = `${engineMenuId}-sub-${cat.id}`

          const labelContent = (
            <span className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className={`text-xs sm:text-sm font-semibold truncate ${isSelected ? 'text-[var(--md-sys-color-primary)]' : ''}`}
              >
                {cat.name}
              </span>
              {isDefault && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--md-sys-color-primary)]/20 text-[var(--md-sys-color-primary)] uppercase tracking-wider shrink-0">
                  Default
                </span>
              )}
            </span>
          )

          if (isExe) {
            return (
              <m3e-menu-item
                key={cat.id}
                id={itemId}
                checked={isSelected}
                onClick={() => {
                  handleSelectEngine(cat, 'latest')
                  closeAllMenus()
                }}
                style={{ margin: '3px 0' }}
              >
                <img
                  slot="icon"
                  src={cat.icon}
                  alt=""
                  className="w-5 h-5 object-contain brightness-125 rounded shrink-0"
                />
                {labelContent}
                {isSelected && (
                  <span
                    slot="trailing-icon"
                    className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
                  >
                    check
                  </span>
                )}
              </m3e-menu-item>
            )
          }

          return (
            <m3e-menu-item
              key={cat.id}
              id={itemId}
              checked={isSelected}
              style={{ margin: '3px 0' }}
            >
              <img
                slot="icon"
                src={cat.icon}
                alt=""
                className="w-5 h-5 object-contain brightness-125 rounded shrink-0"
              />
              <m3e-menu-trigger for={submenuId}>
                {labelContent}
              </m3e-menu-trigger>
            </m3e-menu-item>
          )
        })}
      </m3e-menu>

      {submenuCategories.map((cat) => {
        const catIdLower = cat.id.toLowerCase()
        const isCurrentEngine =
          catIdLower === normalizedEngineId ||
          cat.name.toLowerCase() === engineName.toLowerCase()
        const versions = installedVersionsByEngine[cat.id as EngineId] || []
        const newestVersion = versions[0]?.version
        const submenuId = `${engineMenuId}-sub-${cat.id}`
        const isLatestSelected =
          isCurrentEngine && (!selectedVersion || selectedVersion === 'latest')

        return (
          <m3e-menu
            key={submenuId}
            id={submenuId}
            position-x="after"
            style={M3E_MENU_STYLE}
          >
            <m3e-overflow
              direction="vertical"
              style={{ width: '100%', maxHeight: 'min(48vh, 300px)' }}
              thumb-color="var(--md-sys-color-primary)"
              track-color="var(--md-sys-color-outline-variant)"
            >
              <div className="flex flex-col p-1.5 gap-0.5">
                <m3e-menu-item
                  checked={isLatestSelected}
                  onClick={() => {
                    handleSelectEngine(cat, 'latest')
                    closeAllMenus(submenuId)
                  }}
                  style={{ margin: '2px 0' }}
                >
                  <span
                    slot="icon"
                    className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
                  >
                    auto_awesome
                  </span>
                  <span className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`text-xs sm:text-sm font-semibold ${
                        isLatestSelected ? 'text-[var(--md-sys-color-primary)]' : ''
                      }`}
                    >
                      Latest
                    </span>
                    {newestVersion && (
                      <span className="text-[11px] opacity-70 truncate">
                        {newestVersion}
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--md-sys-color-primary)]/20 text-[var(--md-sys-color-primary)] uppercase tracking-wider shrink-0">
                      Default
                    </span>
                  </span>
                  {isLatestSelected && (
                    <span
                      slot="trailing-icon"
                      className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
                    >
                      check
                    </span>
                  )}
                </m3e-menu-item>

                {versions.map((ver) => {
                  const isVerSelected =
                    isCurrentEngine && selectedVersion === ver.version
                  return (
                    <m3e-menu-item
                      key={ver.version}
                      checked={isVerSelected}
                      onClick={() => {
                        handleSelectEngine(cat, ver.version)
                        closeAllMenus(submenuId)
                      }}
                      style={{ margin: '2px 0' }}
                    >
                      <span
                        slot="icon"
                        className="material-symbols-rounded text-base text-[var(--md-sys-color-on-surface-variant)]"
                      >
                        sell
                      </span>
                      <span
                        className={`text-xs sm:text-sm font-semibold truncate ${
                          isVerSelected ? 'text-[var(--md-sys-color-primary)]' : ''
                        }`}
                      >
                        {ver.version}
                      </span>
                      {isVerSelected && (
                        <span
                          slot="trailing-icon"
                          className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)]"
                        >
                          check
                        </span>
                      )}
                    </m3e-menu-item>
                  )
                })}
              </div>
            </m3e-overflow>
          </m3e-menu>
        )
      })}
    </div>
  )
}
