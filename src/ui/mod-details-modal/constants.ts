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
  exe: {
    id: 'exe',
    name: 'Standalone Game / EXE',
    icon: '/imgs/icons/categories/exe.png',
    description: 'Independent executable or compiled game distribution.',
  },
}

export const getSupportedEngineCategories = (): EngineCategory[] =>
  Object.values(ENGINE_CATEGORIES)

export const M3E_MENU_STYLE: React.CSSProperties = {
  '--m3e-menu-container-color':
    'var(--md-sys-color-surface-container, var(--wb-surface-container-highest))',
  '--m3e-menu-container-shape': '16px',
  '--m3e-menu-container-min-width': '230px',
  '--m3e-menu-item-color':
    'var(--md-sys-color-on-surface, var(--wb-on-surface))',
  '--m3e-menu-item-icon-size': '18px',
  '--m3e-menu-item-icon-label-space': '8px',
  '--m3e-menu-item-padding-start': '10px',
  '--m3e-menu-item-padding-end': '10px',
  '--m3e-menu-item-container-height': '38px',
  boxShadow:
    '0 12px 32px color-mix(in srgb, var(--md-sys-color-scrim, #000) 25%, transparent)',
  border:
    '1px solid color-mix(in srgb, var(--md-sys-color-outline-variant, #444) 50%, transparent)',
  zIndex: 100,
} as React.CSSProperties

export const M3E_ENGINE_TRIGGER_STYLE: React.CSSProperties = {
  '--m3e-button-outlined-container-shape': '18px',
  '--m3e-button-outlined-outline-color':
    'color-mix(in srgb, var(--md-sys-color-outline-variant) 60%, transparent)',
  '--m3e-button-outlined-label-text-color':
    'var(--md-sys-color-on-surface)',
  cursor: 'pointer',
} as React.CSSProperties

