import React, { useEffect } from 'react'
import {
  ENGINE_DEFINITIONS,
  type EngineId,
} from '@/core/engines'
import type { InstalledModRecord } from '@/core/mods'
import { resolveModThumbnail } from '@/features/library/utils'
import type { InstanceDisplayDefinition } from '../hooks/use-executable-instances'
import {
  ENGINE_TRIGGER_STYLE,
  ENGINE_MENU_STYLE,
  MENU_LIST_STYLE,
  hideMenuById,
  getMenuHeight,
} from '../constants'

export interface InstancesEngineMenuProps {
  currentEngine: InstanceDisplayDefinition
  supportedEngines: EngineId[]
  selectedEngineId: EngineId
  allInstalledCounts: Record<EngineId, number>
  onSelectEngine: (engineId: EngineId) => void
  isExecutableSelected?: boolean
  executableMods?: InstalledModRecord[]
  selectedExecutableId?: string | null
  onSelectExecutable?: (modId: string) => void
  currentHasWarning?: boolean
}

const MENU_ICON_IMG_STYLE: React.CSSProperties = {
  width: '20px',
  height: '20px',
  minWidth: '20px',
  minHeight: '20px',
  aspectRatio: '1 / 1',
  objectFit: 'contain',
  borderRadius: '4px',
}

export const InstancesEngineMenu: React.FC<InstancesEngineMenuProps> = ({
  currentEngine,
  supportedEngines,
  selectedEngineId,
  allInstalledCounts,
  onSelectEngine,
  isExecutableSelected = false,
  executableMods = [],
  selectedExecutableId = null,
  onSelectExecutable,
  currentHasWarning = false,
}) => {
  const hasExecutables = executableMods.length > 0
  const engineMenuHeight = getMenuHeight(
    supportedEngines.length + (hasExecutables ? 1 : 0),
    46,
    70,
  )
  const executablesSubmenuHeight = getMenuHeight(executableMods.length, 46, 55)

  useEffect(() => {
    if (!hasExecutables) return
    const triggerItem = document.getElementById(
      'instances-executables-trigger-item',
    )
    const submenuEl = document.getElementById('instances-executables-submenu') as
      | (HTMLElement & { hide?: () => void })
      | null
    const mainMenuEl = document.getElementById('instances-engine-menu')

    if (!triggerItem || !submenuEl) return

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

    const onTriggerMouseLeave = (e: MouseEvent) => {
      const related = e.relatedTarget as Node | null
      if (related && (submenuEl === related || submenuEl.contains(related))) {
        return
      }
      scheduleClose()
    }
    const onSubmenuMouseLeave = (e: MouseEvent) => {
      const related = e.relatedTarget as Node | null
      if (
        related &&
        (triggerItem === related || triggerItem.contains(related))
      ) {
        return
      }
      scheduleClose()
    }
    const onMainMenuToggle = () => {
      const open = (mainMenuEl as unknown as { isOpen?: boolean })?.isOpen
      if (open === false) {
        cancelClose()
        submenuEl.hide?.()
      }
    }

    triggerItem.addEventListener('mouseenter', cancelClose)
    triggerItem.addEventListener('mouseleave', onTriggerMouseLeave)
    submenuEl.addEventListener('mouseenter', cancelClose)
    submenuEl.addEventListener('mouseleave', onSubmenuMouseLeave)
    mainMenuEl?.addEventListener('toggle', onMainMenuToggle)

    return () => {
      cancelClose()
      triggerItem.removeEventListener('mouseenter', cancelClose)
      triggerItem.removeEventListener('mouseleave', onTriggerMouseLeave)
      submenuEl.removeEventListener('mouseenter', cancelClose)
      submenuEl.removeEventListener('mouseleave', onSubmenuMouseLeave)
      mainMenuEl?.removeEventListener('toggle', onMainMenuToggle)
    }
  }, [hasExecutables])

  return (
    <>
      <m3e-button variant="outlined" style={ENGINE_TRIGGER_STYLE}>
        <m3e-menu-trigger for="instances-engine-menu"></m3e-menu-trigger>
        <img
          slot="icon"
          src={currentEngine.icon}
          alt=""
          className={`w-5 h-5 rounded object-contain shrink-0 aspect-square transition-all ${
            currentHasWarning ? 'grayscale brightness-90 opacity-75' : ''
          }`}
          style={{
            width: '20px',
            height: '20px',
            minWidth: '20px',
            minHeight: '20px',
            aspectRatio: '1 / 1',
            objectFit: 'contain',
          }}
        />
        <span className="text-sm font-semibold truncate max-w-[9rem] sm:max-w-[13rem]">
          {currentEngine.name}
        </span>
        <span
          slot="trailing-icon"
          className="material-symbols-rounded text-[18px] shrink-0"
          style={{
            color: 'var(--md-sys-color-on-surface-variant)',
            fontSize: '18px',
            width: '18px',
            height: '18px',
            lineHeight: '18px',
          }}
        >
          arrow_drop_down
        </span>
      </m3e-button>

      <m3e-menu
        id="instances-engine-menu"
        position-x="after"
        position-y="below"
        style={ENGINE_MENU_STYLE}
      >
        <m3e-overflow
          direction="vertical"
          style={{ width: '100%', height: engineMenuHeight }}
          thumb-color="var(--md-sys-color-primary)"
          track-color="var(--md-sys-color-outline-variant)"
        >
          <div style={MENU_LIST_STYLE}>
            {supportedEngines.map((engineId) => {
              const definition = ENGINE_DEFINITIONS[engineId]
              const isSelected =
                !isExecutableSelected && engineId === selectedEngineId
              const installedCount = allInstalledCounts[engineId] || 0

              return (
                <m3e-menu-item
                  key={engineId}
                  checked={isSelected}
                  onClick={() => onSelectEngine(engineId)}
                  style={{ margin: '3px 0' }}
                >
                  <img
                    slot="icon"
                    src={definition.icon}
                    alt=""
                    className="w-5 h-5 rounded object-contain shrink-0 aspect-square"
                    style={MENU_ICON_IMG_STYLE}
                  />
                  <span className="flex flex-col items-start leading-tight min-w-0">
                    <span
                      className="text-sm font-semibold truncate"
                      style={{
                        color: isSelected
                          ? 'var(--md-sys-color-primary)'
                          : undefined,
                      }}
                    >
                      {definition.name}
                    </span>
                    <span className="text-[11px] opacity-70 truncate">
                      {installedCount > 0
                        ? `${installedCount} version${installedCount === 1 ? '' : 's'} installed`
                        : 'Not installed'}
                    </span>
                  </span>
                  {isSelected && (
                    <span
                      slot="trailing-icon"
                      className="material-symbols-rounded"
                      style={{ color: 'var(--md-sys-color-primary)' }}
                    >
                      check
                    </span>
                  )}
                </m3e-menu-item>
              )
            })}

            {hasExecutables && (
              <>
                <div
                  className="my-1 border-t opacity-40"
                  style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
                />
                <m3e-menu-item
                  id="instances-executables-trigger-item"
                  style={{ margin: '3px 0' }}
                >
                  <img
                    slot="icon"
                    src="/imgs/icons/categories/exe.png"
                    alt=""
                    className="w-5 h-5 rounded object-contain shrink-0 aspect-square"
                    style={MENU_ICON_IMG_STYLE}
                  />
                  <m3e-menu-trigger for="instances-executables-submenu">
                    <span className="flex flex-col items-start leading-tight min-w-0">
                      <span
                        className="text-sm font-semibold truncate"
                        style={{
                          color: isExecutableSelected
                            ? 'var(--md-sys-color-primary)'
                            : undefined,
                        }}
                      >
                        Instances
                      </span>
                      <span className="text-[11px] opacity-70 truncate">
                        {executableMods.length} executable
                        {executableMods.length === 1 ? '' : 's'}
                      </span>
                    </span>
                  </m3e-menu-trigger>
                </m3e-menu-item>
              </>
            )}
          </div>
        </m3e-overflow>
      </m3e-menu>

      {hasExecutables && (
        <m3e-menu
          id="instances-executables-submenu"
          position-x="after"
          style={ENGINE_MENU_STYLE}
        >
          <m3e-overflow
            direction="vertical"
            style={{ width: '100%', height: executablesSubmenuHeight }}
            thumb-color="var(--md-sys-color-primary)"
            track-color="var(--md-sys-color-outline-variant)"
          >
            <div style={MENU_LIST_STYLE}>
              {executableMods.map((mod) => {
                const modIdStr = String(mod.id)
                const isSelected =
                  isExecutableSelected && selectedExecutableId === modIdStr
                const modTitle = mod.title || mod.name || 'Executable'
                const thumb = resolveModThumbnail(mod)
                const itemIcon = thumb.includes('placeholder-mini')
                  ? mod.icon || '/imgs/icons/categories/exe.png'
                  : thumb

                return (
                  <m3e-menu-item
                    key={modIdStr}
                    checked={isSelected}
                    onClick={() => {
                      onSelectExecutable?.(modIdStr)
                      hideMenuById('instances-executables-submenu')
                      hideMenuById('instances-engine-menu')
                    }}
                    style={{ margin: '3px 0' }}
                  >
                    <img
                      slot="icon"
                      src={itemIcon}
                      alt=""
                      className={`w-5 h-5 rounded object-cover shrink-0 aspect-square ${
                        mod.hasEngineWarning
                          ? 'grayscale brightness-90 opacity-75'
                          : ''
                      }`}
                      style={MENU_ICON_IMG_STYLE}
                    />
                    <span className="flex flex-col items-start leading-tight min-w-0">
                      <span
                        className="text-sm font-semibold truncate max-w-[180px]"
                        style={{
                          color: isSelected
                            ? 'var(--md-sys-color-primary)'
                            : undefined,
                        }}
                      >
                        {modTitle}
                      </span>
                      <span className="text-[11px] opacity-70 truncate max-w-[180px]">
                        {mod.hasEngineWarning
                          ? 'No executable detected'
                          : mod.author || 'Executable'}
                      </span>
                    </span>
                    {isSelected && (
                      <span
                        slot="trailing-icon"
                        className="material-symbols-rounded"
                        style={{ color: 'var(--md-sys-color-primary)' }}
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
      )}
    </>
  )
}
