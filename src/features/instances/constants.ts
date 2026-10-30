import React from 'react'
import type { EnginePlatform } from '@/core/engines'

export const PLATFORM_LABELS: Record<EnginePlatform, string> = {
  windows: 'Windows',
  linux: 'Linux',
  macos: 'macOS',
  android: 'Android',
  other: 'Desktop',
}

export const ENGINE_TRIGGER_STYLE = {
  '--m3e-button-container-height': '40px',
  '--m3e-button-shape-round': '999px',
  '--m3e-button-shape-square': '16px',
  '--m3e-button-outline-color': 'var(--md-sys-color-outline-variant)',
  '--m3e-button-label-text-color': 'var(--md-sys-color-on-surface)',
  '--m3e-button-hover-label-text-color': 'var(--md-sys-color-on-surface)',
  '--m3e-button-focus-label-text-color': 'var(--md-sys-color-on-surface)',
  '--m3e-button-icon-color': 'var(--md-sys-color-on-surface-variant)',
  '--m3e-button-leading-space': '12px',
  '--m3e-button-trailing-space': '10px',
  '--m3e-button-icon-label-space': '8px',
  '--m3e-button-icon-size': '20px',
} as React.CSSProperties

export const ENGINE_MENU_STYLE = {
  '--m3e-menu-container-color': 'var(--md-sys-color-surface-container)',
  '--m3e-menu-container-shape': '16px',
  '--m3e-menu-container-min-width': '260px',
  '--m3e-menu-container-max-width': '320px',
  '--m3e-menu-container-max-height': 'none',
  '--m3e-menu-item-color': 'var(--md-sys-color-on-surface)',
  '--m3e-menu-item-container-hover-color': 'var(--md-sys-color-on-surface)',
  '--m3e-menu-item-container-focus-color': 'var(--md-sys-color-on-surface)',
  '--m3e-menu-item-ripple-color': 'var(--md-sys-color-on-surface)',
  '--m3e-menu-item-selected-color':
    'var(--md-sys-color-on-primary-container)',
  '--m3e-menu-item-selected-container-color':
    'var(--md-sys-color-primary-container)',
  '--m3e-menu-item-selected-container-hover-color':
    'var(--md-sys-color-on-primary-container)',
  '--m3e-menu-item-selected-container-focus-color':
    'var(--md-sys-color-on-primary-container)',
  '--m3e-menu-item-selected-ripple-color':
    'var(--md-sys-color-on-primary-container)',
  '--m3e-menu-item-icon-size': '20px',
  '--m3e-menu-item-icon-label-space': '8px',
  '--m3e-menu-item-padding-start': '10px',
  '--m3e-menu-item-padding-end': '10px',
  '--m3e-menu-item-shape': '10px',
  '--m3e-menu-item-first-child-shape': '12px',
  '--m3e-menu-item-last-child-shape': '12px',
  '--m3e-menu-item-container-height': '40px',
  '--m3e-menu-container-elevation':
    'var(--md-sys-elevation-level3, 0 12px 32px rgba(0, 0, 0, 0.32))',
  width: 'min(320px, calc(100vw - 24px))',
  maxHeight: 'none',
  overflow: 'hidden',
} as React.CSSProperties

export const VERSION_TRIGGER_STYLE = {
  '--m3e-button-container-height': '44px',
  '--m3e-button-shape-round': '16px',
  '--m3e-button-shape-square': '16px',
  '--m3e-button-label-text-color': 'var(--md-sys-color-on-surface)',
  '--m3e-button-hover-label-text-color': 'var(--md-sys-color-on-surface)',
  '--m3e-button-icon-color': 'var(--md-sys-color-on-surface-variant)',
  '--m3e-button-leading-space': '10px',
  '--m3e-button-trailing-space': '8px',
  '--m3e-button-icon-label-space': '8px',
  '--m3e-button-icon-size': '22px',
} as React.CSSProperties

export const VERSION_MENU_STYLE = {
  ...ENGINE_MENU_STYLE,
  '--m3e-menu-container-min-width': '270px',
  '--m3e-menu-container-max-height': 'none',
  '--m3e-menu-item-container-height': '40px',
  '--m3e-menu-item-padding-start': '10px',
  '--m3e-menu-item-padding-end': '10px',
} as React.CSSProperties

export const ACTIONS_MENU_STYLE = {
  ...ENGINE_MENU_STYLE,
  '--m3e-menu-container-min-width': '220px',
  '--m3e-menu-item-container-height': '38px',
  '--m3e-menu-item-padding-start': '10px',
  '--m3e-menu-item-padding-end': '10px',
  width: 'min(240px, calc(100vw - 24px))',
} as React.CSSProperties

export const ICON_BUTTON_STYLE = {
  '--m3e-icon-button-icon-color': 'var(--md-sys-color-on-surface-variant)',
} as React.CSSProperties

export const DESCRIPTION_GROUP_STYLE = {
  display: 'flex',
  '--m3e-button-container-height': '32px',
  '--m3e-button-leading-space': '10px',
  '--m3e-button-trailing-space': '10px',
  '--m3e-button-icon-label-space': '6px',
  '--m3e-button-icon-size': '16px',
  '--m3e-button-label-text-font-size': '11.5px',
  '--m3e-button-selected-container-color': 'var(--md-sys-color-primary)',
  '--m3e-button-selected-label-text-color':
    'var(--md-sys-color-on-primary)',
  '--m3e-button-selected-icon-color': 'var(--md-sys-color-on-primary)',
  '--m3e-button-unselected-container-color':
    'var(--md-sys-color-surface-container-high)',
  '--m3e-button-unselected-label-text-color':
    'var(--md-sys-color-on-surface-variant)',
  '--m3e-button-unselected-icon-color':
    'var(--md-sys-color-on-surface-variant)',
} as React.CSSProperties

export const DESCRIPTION_BUTTON_STYLE = {
  flex: '1 1 0px',
  minWidth: 0,
  overflow: 'hidden',
} as React.CSSProperties

export const TRANSLATE_BUTTON_STYLE = {
  '--m3e-icon-button-small-container-height': '32px',
  '--m3e-icon-button-unselected-container-color':
    'var(--md-sys-color-surface-container-high)',
  '--m3e-icon-button-unselected-icon-color':
    'var(--md-sys-color-on-surface-variant)',
  '--m3e-icon-button-selected-container-color': 'var(--md-sys-color-primary)',
  '--m3e-icon-button-selected-icon-color': 'var(--md-sys-color-on-primary)',
} as React.CSSProperties

export const MENU_ITEM_GAP = 4
export const MENU_PADDING = 8

export const MENU_LIST_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  gap: `${MENU_ITEM_GAP}px`,
  paddingBlock: MENU_PADDING / 2,
  paddingInline: '2px 16px',
  width: '100%',
  boxSizing: 'border-box',
  '--m3e-focus-ring-outward-offset': '0px',
  '--m3e-focus-ring-growth-factor': '1.5',
} as React.CSSProperties

export function getVersionActionsMenuId(engineId: string, index: number): string {
  return `instances-version-actions-${engineId}-${index}`
}

export function hideMenuById(id: string): void {
  const menu = document.getElementById(id) as
    | (HTMLElement & { hide?: () => void })
    | null
  menu?.hide?.()
}

export function getMenuHeight(
  itemCount: number,
  itemHeight: number,
  maxViewportHeight: number,
): string {
  const contentHeight =
    itemCount * itemHeight +
    Math.max(0, itemCount - 1) * MENU_ITEM_GAP +
    MENU_PADDING
  return `min(${maxViewportHeight}vh, ${contentHeight}px)`
}
