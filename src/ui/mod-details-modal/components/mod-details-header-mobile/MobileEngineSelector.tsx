import React from 'react'
import {
  getSupportedEngineCategories,
  type EngineCategory,
  M3E_MENU_STYLE,
  M3E_ENGINE_TRIGGER_STYLE,
} from '../../constants'
import type { ModItem } from '../../types'

interface MobileEngineSelectorProps {
  displayCard: ModItem
  engineName: string
  isInstalled: boolean
  engineDropdownRef?: React.RefObject<HTMLDivElement | null>
  mobileEngineMenuId: string
  handleSelectEngine: (cat: EngineCategory) => void
}

export const MobileEngineSelector: React.FC<MobileEngineSelectorProps> = ({
  displayCard,
  engineName,
  isInstalled,
  engineDropdownRef,
  mobileEngineMenuId,
  handleSelectEngine,
}) => {
  if (!displayCard.icon) return null

  if (isInstalled) {
    return (
      <div className="relative z-40 shrink-0" ref={engineDropdownRef}>
        <m3e-button
          variant="outlined"
          style={M3E_ENGINE_TRIGGER_STYLE}
          title="Select engine"
        >
          <m3e-menu-trigger for={mobileEngineMenuId}>
            <span className="flex items-center gap-1.5">
              <img
                src={displayCard.icon}
                alt=""
                className="w-4 h-4 object-contain brightness-125 shrink-0"
              />
              <span className="text-xs font-semibold truncate max-w-[100px]">
                {engineName}
              </span>
              <span className="material-symbols-rounded text-base opacity-70 leading-none">
                arrow_drop_down
              </span>
            </span>
          </m3e-menu-trigger>
        </m3e-button>

        <m3e-menu
          id={mobileEngineMenuId}
          position-x="after"
          position-y="below"
          style={M3E_MENU_STYLE}
        >
          {getSupportedEngineCategories().map((cat) => {
            const isSelected =
              String(cat.id).toLowerCase() ===
                String(displayCard.engineId).toLowerCase() ||
              cat.name.toLowerCase() === engineName.toLowerCase()
            const defaultEngineId =
              displayCard.defaultEngineId || displayCard.engineId
            const isDefault =
              Boolean(defaultEngineId) &&
              (String(cat.id).toLowerCase() ===
                String(defaultEngineId).toLowerCase() ||
                cat.name.toLowerCase() === String(defaultEngineId).toLowerCase())
            return (
              <m3e-menu-item
                key={cat.id}
                checked={isSelected}
                onClick={() => handleSelectEngine(cat)}
              >
                <img
                  slot="icon"
                  src={cat.icon}
                  alt=""
                  className="w-5 h-5 object-contain brightness-125 rounded shrink-0"
                />
                <span className="text-xs sm:text-sm font-semibold flex-1 truncate">
                  {cat.name}
                </span>
                {isDefault && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--wb-primary)]/20 text-[var(--wb-primary)] uppercase tracking-wider shrink-0 ml-2 mr-1">
                    Default
                  </span>
                )}
                {isSelected && (
                  <span
                    slot="trailing-icon"
                    className="material-symbols-rounded text-base text-[var(--wb-primary)]"
                  >
                    check
                  </span>
                )}
              </m3e-menu-item>
            )
          })}
        </m3e-menu>
      </div>
    )
  }

  return (
    <m3e-button
      variant="outlined"
      style={{ ...M3E_ENGINE_TRIGGER_STYLE, cursor: 'default' }}
      title={engineName}
    >
      <span className="flex items-center gap-1.5">
        <img
          src={displayCard.icon}
          alt=""
          className="w-4 h-4 object-contain brightness-125 shrink-0"
        />
        <span className="text-xs font-semibold truncate max-w-[100px]">
          {engineName}
        </span>
      </span>
    </m3e-button>
  )
}

