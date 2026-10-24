export type OverflowDirection = 'vertical' | 'horizontal' | 'both' | 'auto'

export interface M3eScrollbarProps {
  direction?: 'vertical' | 'horizontal'
  target?: string | HTMLElement
  trackThickness?: string | number
  thumbThickness?: string | number
  thumbGap?: string | number
  thumbColor?: string
  trackColor?: string
}

export interface M3eOverflowProps {
  direction?: OverflowDirection
  autohide?: boolean
}
