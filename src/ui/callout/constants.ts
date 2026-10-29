import type { CalloutVariant } from './types'

export const DEFAULT_CALLOUT_DURATION = 5000

export const MAX_CALLOUT_TOASTS = 12

export const VARIANT_DEFAULTS: Record<
  CalloutVariant,
  {
    title: string
    icon: string
    description: string
  }
> = {
  secondary: {
    title: 'Info',
    icon: 'info',
    description: 'Information update',
  },
  primary: {
    title: 'Notice',
    icon: 'campaign',
    description: 'Action completed',
  },
  tertiary: {
    title: 'Tip',
    icon: 'lightbulb',
    description: 'Helpful note',
  },
  error: {
    title: 'Error',
    icon: 'error',
    description: 'An issue occurred',
  },
  surface: {
    title: 'System',
    icon: 'notifications',
    description: 'System notification',
  },
}

export const MORPH_SHAPES = [
  '12-sided-cookie',
  '9-sided-cookie',
  '8-leaf-clover',
  '7-sided-cookie',
  '6-sided-cookie',
  '4-sided-cookie',
  '4-leaf-clover',
  'arch',
  'arrow',
  'soft-burst',
  'circle',
  'square',
]

