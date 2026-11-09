import React, { useId } from 'react'
import {
  getSupportedEngineCategories,
  type EngineCategory,
  M3E_MENU_STYLE,
  M3E_ENGINE_TRIGGER_STYLE,
} from '../../constants'
import type { ModItem } from '../../types'

interface DesktopEngineSelectorProps {
  displayCard: ModItem
  engineName: string
  isInstalled: boolean
  engineDropdownRef?: React.RefObject<HTMLDivElement | null>
  engineMenuId: string
  handleSelectEngine: (cat: EngineCategory) => void
}

export const DesktopEngineSelector: React.FC<DesktopEngineSelectorProps> = ({
  displayCard,
  engineName,
  isInstalled,
  engineDropdownRef,
  engineMenuId,
  handleSelectEngine,
}) => {
  const rawId = useId()
  const warningId = `desktop-warning-${rawId.replace(/:/g, '-')}`
  const warningText =
    displayCard.engineWarningMessage ||
    'Cannot detect engine. This mod contains no reference files (_polymod_meta.json, pack.json, or executable) to index its engine. Check the folder to verify if it is a playable mod.'

  if (!displayCard.icon) return null

  if (isInstalled) {
    return (
      <div className="relative z-40 shrink-0" ref={engineDropdownRef}>
        <m3e-button
          variant="outlined"
          style={M3E_ENGINE_TRIGGER_STYLE}
          title="Select engine"
        >
          <m3e-menu-trigger for={engineMenuId}>
            <span className="flex items-center gap-2">
              <span className="relative inline-flex items-center justify-center shrink-0">
                <img
                  src={displayCard.icon}
                  alt=""
                  className="w-4 h-4 object-contain brightness-125 shrink-0"
                />
                {displayCard.hasEngineWarning && (
                  <span
                    id={warningId}
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-500 text-black shadow pointer-events-auto cursor-help overflow-hidden"
                    aria-label="Engine warning"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-2.5 h-2.5 fill-black shrink-0"
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
              <span className="text-xs md:text-sm font-semibold truncate max-w-[120px]">
                {engineName}
              </span>
              <span className="material-symbols-rounded text-base opacity-70 leading-none">
                arrow_drop_down
              </span>
            </span>
          </m3e-menu-trigger>
        </m3e-button>

        {displayCard.hasEngineWarning && (
          <m3e-tooltip for={warningId} position="below">
            {warningText}
          </m3e-tooltip>
        )}

        <m3e-menu
          id={engineMenuId}
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
                style={{ margin: '3px 0' }}
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
    <>
      <m3e-button
        variant="outlined"
        style={{ ...M3E_ENGINE_TRIGGER_STYLE, cursor: 'default' }}
        title={engineName}
      >
        <span className="flex items-center gap-2">
          <span className="relative inline-flex items-center justify-center shrink-0">
            <img
              src={displayCard.icon}
              alt=""
              className="w-4 h-4 object-contain brightness-125 shrink-0"
            />
            {displayCard.hasEngineWarning && (
              <span
                id={warningId}
                className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-500 text-black shadow pointer-events-auto cursor-help overflow-hidden"
                aria-label="Engine warning"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-2.5 h-2.5 fill-black shrink-0"
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
          <span className="text-xs md:text-sm font-semibold truncate max-w-[120px]">
            {engineName}
          </span>
        </span>
      </m3e-button>

      {displayCard.hasEngineWarning && (
        <m3e-tooltip for={warningId} position="below">
          {warningText}
        </m3e-tooltip>
      )}
    </>
  )
}

