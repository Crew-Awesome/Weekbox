import type React from 'react'
import type { LibrarySortOption } from '../types'

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

export const DIVIDER_STYLE: React.CSSProperties = {
  margin: '4px 0',
  borderColor:
    'color-mix(in srgb, var(--md-sys-color-outline-variant) 40%, transparent)',
}

export const SORT_OPTIONS: Array<{ id: LibrarySortOption; label: string; icon: string }> = [
  { id: 'recent', label: 'Recently Installed', icon: 'schedule' },
  { id: 'name', label: 'Name (A-Z)', icon: 'sort_by_alpha' },
  { id: 'size', label: 'Size (Largest)', icon: 'hard_drive' },
  { id: 'engine', label: 'Engine (A-Z)', icon: 'category' },
]
