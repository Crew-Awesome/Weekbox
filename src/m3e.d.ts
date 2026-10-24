import type * as React from 'react'

export interface M3eOverflowAttributes extends React.HTMLAttributes<HTMLElement> {
  direction?: 'vertical' | 'horizontal' | 'both' | 'auto'
  'track-thickness'?: string | number
  'thumb-thickness'?: string | number
  'thumb-gap'?: string | number
  'thumb-color'?: string
  'track-color'?: string
  class?: string
}

export interface M3eScrollbarAttributes extends React.HTMLAttributes<HTMLElement> {
  direction?: 'vertical' | 'horizontal'
  for?: string
  'track-thickness'?: string | number
  'thumb-thickness'?: string | number
  'thumb-gap'?: string | number
  'thumb-color'?: string
  'track-color'?: string
  class?: string
}

export interface M3eTooltipAttributes extends React.HTMLAttributes<HTMLElement> {
  for?: string
  position?: 'above' | 'below' | 'before' | 'after'
  disabled?: boolean
  'show-delay'?: number
  'hide-delay'?: number
  'touch-gestures'?: 'auto' | 'on' | 'off'
}

export interface M3eSearchViewAttributes extends React.HTMLAttributes<HTMLElement> {
  mode?: 'docked' | 'full-screen' | 'auto'
  contained?: boolean
  open?: boolean
  'clear-label'?: string
  'close-label'?: string
  'hide-search-icon'?: boolean
  class?: string
}

export interface M3eSearchBarAttributes extends React.HTMLAttributes<HTMLElement> {
  clearable?: boolean
  'clear-label'?: string
  class?: string
}

export interface M3eListAttributes extends React.HTMLAttributes<HTMLElement> {
  variant?: 'single' | 'multi'
  class?: string
}

export interface M3eListItemAttributes extends React.HTMLAttributes<HTMLElement> {
  disabled?: boolean
  selected?: boolean
  class?: string
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'm3e-overflow': React.DetailedHTMLProps<M3eOverflowAttributes, HTMLElement>
      'm3e-scrollbar': React.DetailedHTMLProps<M3eScrollbarAttributes, HTMLElement>
      'm3e-tooltip': React.DetailedHTMLProps<M3eTooltipAttributes, HTMLElement>
      'm3e-search-view': React.DetailedHTMLProps<M3eSearchViewAttributes, HTMLElement>
      'm3e-search-bar': React.DetailedHTMLProps<M3eSearchBarAttributes, HTMLElement>
      'm3e-list': React.DetailedHTMLProps<M3eListAttributes, HTMLElement>
      'm3e-list-item': React.DetailedHTMLProps<M3eListItemAttributes, HTMLElement>
      [elemName: `m3e-${string}`]: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > &
        Record<string, unknown>
    }
  }
}

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'm3e-overflow': React.DetailedHTMLProps<M3eOverflowAttributes, HTMLElement>
      'm3e-scrollbar': React.DetailedHTMLProps<M3eScrollbarAttributes, HTMLElement>
      'm3e-tooltip': React.DetailedHTMLProps<M3eTooltipAttributes, HTMLElement>
      'm3e-search-view': React.DetailedHTMLProps<M3eSearchViewAttributes, HTMLElement>
      'm3e-search-bar': React.DetailedHTMLProps<M3eSearchBarAttributes, HTMLElement>
      'm3e-list': React.DetailedHTMLProps<M3eListAttributes, HTMLElement>
      'm3e-list-item': React.DetailedHTMLProps<M3eListItemAttributes, HTMLElement>
      [elemName: `m3e-${string}`]: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > &
        Record<string, unknown>
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'm3e-overflow': React.DetailedHTMLProps<M3eOverflowAttributes, HTMLElement>
      'm3e-scrollbar': React.DetailedHTMLProps<M3eScrollbarAttributes, HTMLElement>
      'm3e-tooltip': React.DetailedHTMLProps<M3eTooltipAttributes, HTMLElement>
      'm3e-search-view': React.DetailedHTMLProps<M3eSearchViewAttributes, HTMLElement>
      'm3e-search-bar': React.DetailedHTMLProps<M3eSearchBarAttributes, HTMLElement>
      'm3e-list': React.DetailedHTMLProps<M3eListAttributes, HTMLElement>
      'm3e-list-item': React.DetailedHTMLProps<M3eListItemAttributes, HTMLElement>
      [elemName: `m3e-${string}`]: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > &
        Record<string, unknown>
    }
  }
}
