import type React from 'react'
import type { ModFilter } from '@/services/gamebanana'

export const SORT_ITEMS: Array<{
  id: ModFilter
  name: string
  icon: string
}> = [
  { id: 'ripe', name: 'Ripe', icon: 'favorite' },
  { id: 'popular', name: 'Popular', icon: 'trending_up' },
  { id: 'new', name: 'New', icon: 'new_releases' },
  { id: 'updated', name: 'Updated', icon: 'update' },
]

export const ENGINE_ITEMS = [
  { id: 'executable', name: 'Executable', icon: '/imgs/icons/categories/exe.png' },
  { id: 'psych', name: 'Psych', icon: '/imgs/icons/categories/psych.png' },
  { id: 'vslice', name: 'V-Slice', icon: '/imgs/icons/categories/vslice.png' },
  { id: 'codename', name: 'Codename Engine', icon: '/imgs/icons/categories/codename.png' },
  { id: 'psychonline', name: 'Psych Online', icon: '/imgs/icons/categories/psychonline.png' },
  { id: 'pslice', name: 'P-Slice', icon: '/imgs/icons/categories/pslice.png' },
  { id: 'fpsplus', name: 'FPS Plus', icon: '/imgs/icons/categories/fpsplus.png' },
]

export const M3E_MENU_STYLE: React.CSSProperties = {
  '--m3e-menu-container-min-width': '190px',
  boxShadow:
    '0 12px 32px color-mix(in srgb, var(--md-sys-color-scrim) 20%, transparent)',
  border:
    '1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 50%, transparent)',
  width: 'min(210px, calc(100vw - 24px))',
  maxHeight: 'none',
  overflow: 'hidden',
} as React.CSSProperties

export const M3E_SUBMENU_STYLE: React.CSSProperties = {
  ...M3E_MENU_STYLE,
  '--m3e-menu-container-min-width': '220px',
  width: 'min(240px, calc(100vw - 24px))',
} as React.CSSProperties

export const M3E_BUTTON_STYLE: React.CSSProperties = {
  '--m3e-button-container-height': '46px',
  '--m3e-button-leading-space': '0px',
  '--m3e-button-trailing-space': '0px',
  '--m3e-button-icon-label-space': '0px',
  '--m3e-button-icon-size': '22px',
  cursor: 'pointer',
} as React.CSSProperties
