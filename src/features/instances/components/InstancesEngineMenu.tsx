import React from 'react'
import {
  ENGINE_DEFINITIONS,
  type EngineId,
  type EngineDefinition,
} from '@/core/engines'
import {
  ENGINE_TRIGGER_STYLE,
  ENGINE_MENU_STYLE,
  MENU_LIST_STYLE,
  getMenuHeight,
} from '../constants'

export interface InstancesEngineMenuProps {
  currentEngine: EngineDefinition
  supportedEngines: EngineId[]
  selectedEngineId: EngineId
  allInstalledCounts: Record<EngineId, number>
  onSelectEngine: (engineId: EngineId) => void
}

export const InstancesEngineMenu: React.FC<InstancesEngineMenuProps> = ({
  currentEngine,
  supportedEngines,
  selectedEngineId,
  allInstalledCounts,
  onSelectEngine,
}) => {
  const engineMenuHeight = getMenuHeight(supportedEngines.length, 40, 70)

  return (
    <>
      <m3e-button variant="outlined" style={ENGINE_TRIGGER_STYLE}>
        <m3e-menu-trigger for="instances-engine-menu"></m3e-menu-trigger>
        <img
          slot="icon"
          src={currentEngine.icon}
          alt=""
          className="w-5 h-5 rounded object-contain shrink-0 aspect-square"
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
              const isSelected = engineId === selectedEngineId
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
                    style={{
                      width: '20px',
                      height: '20px',
                      minWidth: '20px',
                      minHeight: '20px',
                      aspectRatio: '1 / 1',
                      objectFit: 'contain',
                      borderRadius: '4px',
                    }}
                  />
                  <span className="flex flex-col items-start leading-tight min-w-0">
                    <span className="text-sm font-semibold truncate">
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
    </>
  )
}
