import React from 'react'
import { ENGINE_DEFINITIONS } from '@/core/engines'
import type { EngineId } from '@/core/engines'

interface EngineSelectorProps {
  selectedEngineId: EngineId
  supportedEngines: EngineId[]
  installedCounts: Record<EngineId, number>
  onSelectEngine: (engineId: EngineId) => void
}

export const EngineSelector: React.FC<EngineSelectorProps> = ({
  selectedEngineId,
  supportedEngines,
  installedCounts,
  onSelectEngine,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        {supportedEngines.map((engineId) => {
          const def = ENGINE_DEFINITIONS[engineId]
          const isSelected = selectedEngineId === engineId
          const count = installedCounts[engineId] || 0

          return (
            <button
              key={engineId}
              type="button"
              onClick={() => onSelectEngine(engineId)}
              className={`group relative flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 shrink-0 select-none text-left cursor-pointer ${
                isSelected
                  ? 'shadow-md scale-[1.01]'
                  : 'hover:bg-[var(--md-sys-color-surface-container-high)] opacity-85 hover:opacity-100'
              }`}
              style={{
                backgroundColor: isSelected
                  ? 'var(--md-sys-color-secondary-container)'
                  : 'var(--md-sys-color-surface-container)',
                borderColor: isSelected
                  ? 'var(--md-sys-color-primary)'
                  : 'var(--md-sys-color-outline-variant)',
                color: isSelected
                  ? 'var(--md-sys-color-on-secondary-container)'
                  : 'var(--md-sys-color-on-surface)',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center p-1.5 shrink-0 transition-transform group-hover:scale-105"
                style={{
                  backgroundColor: isSelected
                    ? 'var(--md-sys-color-surface)'
                    : 'var(--md-sys-color-surface-container-highest)',
                }}
              >
                <img
                  src={def.icon}
                  alt={def.name}
                  className="w-full h-full object-contain aspect-square shrink-0"
                  style={{ aspectRatio: '1 / 1', objectFit: 'contain' }}
                  loading="lazy"
                />
              </div>

              <div className="flex flex-col min-w-[120px]">
                <span className="font-semibold text-sm tracking-tight truncate">
                  {def.name}
                </span>

                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      count > 0 ? 'bg-emerald-500' : 'bg-zinc-500'
                    }`}
                  />
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: isSelected
                        ? 'var(--md-sys-color-on-secondary-container)'
                        : 'var(--md-sys-color-on-surface-variant)',
                    }}
                  >
                    {count === 1
                      ? '1 installed'
                      : count > 1
                        ? `${count} installed`
                        : 'Not installed'}
                  </span>
                </div>
              </div>

              {isSelected && (
                <span
                  className="material-symbols-rounded text-base ml-1"
                  style={{ color: 'var(--md-sys-color-primary)' }}
                >
                  check_circle
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
