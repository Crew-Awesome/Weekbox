import React from 'react'
import type { SidebarNavItem } from './types'

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { id: 'home', label: 'Home', icon: 'home', path: '/home' },
  { id: 'library', label: 'Library', icon: 'local_library', path: '/library' },
  { id: 'instances', label: 'Instances', icon: 'layers', path: '/instances' },
  { id: 'news', label: 'News', icon: 'newspaper', path: '/news' },
]

export const DESKTOP_NAV_ITEM_STYLE: React.CSSProperties = {
  cursor: 'pointer',
  width: '100%',
  '--m3e-nav-item-active-container-color':
    'var(--md-sys-color-secondary-container)',
  '--m3e-nav-item-active-icon-color':
    'var(--md-sys-color-on-secondary-container)',
  '--m3e-nav-item-inactive-icon-color':
    'var(--md-sys-color-on-surface-variant)',
  '--m3e-nav-item-active-label-text-color':
    'var(--md-sys-color-primary)',
  '--m3e-nav-item-inactive-label-text-color':
    'var(--md-sys-color-on-surface-variant)',
  '--m3e-nav-item-label-text-font-size': '11px',
  '--m3e-nav-item-label-text-font-weight': '600',
} as React.CSSProperties

export const MOBILE_NAV_ITEM_STYLE: React.CSSProperties = {
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  '--m3e-nav-item-active-container-color':
    'var(--md-sys-color-secondary-container)',
  '--m3e-nav-item-active-icon-color':
    'var(--md-sys-color-on-secondary-container)',
  '--m3e-nav-item-inactive-icon-color':
    'var(--md-sys-color-on-surface-variant)',
  '--m3e-nav-item-active-label-text-color':
    'var(--md-sys-color-primary)',
  '--m3e-nav-item-inactive-label-text-color':
    'var(--md-sys-color-on-surface-variant)',
  '--m3e-nav-item-label-text-font-size': '10px',
  '--m3e-nav-item-label-text-font-weight': '600',
} as React.CSSProperties

export const ACTION_ICON_BUTTON_STYLE: React.CSSProperties = {
  '--m3e-icon-button-icon-color': 'var(--md-sys-color-on-surface-variant)',
} as React.CSSProperties
