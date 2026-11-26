import React from 'react'

export interface EngineCategory {
  id: string
  name: string
  icon: string
  description?: string
}

export const ENGINE_CATEGORIES: Record<string, EngineCategory> = {
  vslice: {
    id: 'vslice',
    name: 'V-Slice Native',
    icon: '/imgs/icons/categories/vslice.png',
    description: 'The definitive rhythm gaming experience featuring official weeks and high-fidelity audio.',
  },
  psych: {
    id: 'psych',
    name: 'Psych Engine',
    icon: '/imgs/icons/categories/psych.png',
    description: 'High-performance extensible framework with real-time Lua/HScript modding support.',
  },
  codename: {
    id: 'codename',
    name: 'Codename Engine',
    icon: '/imgs/icons/categories/codename.png',
    description: 'Next-generation modding architecture designed for hot-reloading code and dynamic skins.',
  },
  fpsplus: {
    id: 'fpsplus',
    name: 'FPS Plus',
    icon: '/imgs/icons/categories/fpsplus.png',
    description: 'Classic high FPS rhythm fork optimized for ultra-smooth rendering.',
  },
  pslice: {
    id: 'pslice',
    name: 'P-Slice Engine',
    icon: '/imgs/icons/categories/pslice.png',
    description: 'V-Slice mechanics and polish ported onto Psych Engine.',
  },
  psychonline: {
    id: 'psychonline',
    name: 'Psych Online',
    icon: '/imgs/icons/categories/psychonline.png',
    description: 'Multiplayer fork of Psych Engine.',
  },
  exe: {
    id: 'exe',
    name: 'Standalone Game / EXE',
    icon: '/imgs/icons/categories/exe.png',
    description: 'Independent executable or compiled game distribution.',
  },
}

export const getSupportedEngineCategories = (): EngineCategory[] =>
  Object.values(ENGINE_CATEGORIES)

const ENGINE_ID_ALIASES: Record<string, string> = {
  executable: 'exe',
  'v-slice': 'vslice',
  base: 'vslice',
  basegame: 'vslice',
  'p-slice': 'pslice',
  'psych-online': 'psychonline',
}

export function normalizeEngineCategoryId(engineId?: string): string {
  const lower = String(engineId || '').trim().toLowerCase()
  return ENGINE_ID_ALIASES[lower] || lower
}

export function findEngineCategory(
  engineId?: string,
  engineName?: string,
): EngineCategory | undefined {
  const normalizedId = normalizeEngineCategoryId(engineId)
  const normalizedName = String(engineName || '').trim().toLowerCase()
  return Object.values(ENGINE_CATEGORIES).find(
    (c) =>
      c.id.toLowerCase() === normalizedId ||
      (normalizedName.length > 0 && c.name.toLowerCase() === normalizedName),
  )
}

export const M3E_MENU_STYLE: React.CSSProperties = {
  '--m3e-menu-container-min-width': '230px',
  boxShadow:
    '0 12px 32px color-mix(in srgb, var(--md-sys-color-scrim) 25%, transparent)',
  border:
    '1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 50%, transparent)',
  zIndex: 100,
} as React.CSSProperties

export const M3E_ENGINE_TRIGGER_STYLE: React.CSSProperties = {
  '--m3e-button-outlined-container-shape': '18px',
  cursor: 'pointer',
} as React.CSSProperties

