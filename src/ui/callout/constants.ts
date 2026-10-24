import type { CalloutVariant } from './types'

export const DEFAULT_CALLOUT_DURATION = 5000

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
    description:
      'Balanced visual emphasis suitable for general informational content.',
  },
  primary: {
    title: 'Notice',
    icon: 'campaign',
    description:
      'Stronger emphasis highlighting information of higher importance.',
  },
  tertiary: {
    title: 'Tip',
    icon: 'lightbulb',
    description:
      'Alternative emphasis for category-specific or complementary information.',
  },
  error: {
    title: 'Error',
    icon: 'error',
    description:
      'Reserved for critical or blocking information requiring immediate attention.',
  },
  surface: {
    title: 'System',
    icon: 'notifications',
    description:
      'Neutral presentation aligned with the surrounding layout.',
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

