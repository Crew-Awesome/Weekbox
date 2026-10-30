import type { EngineId } from '@/core/engines'
import codename from './codename.md?raw'
import fpsplus from './fpsplus.md?raw'
import psych from './psych.md?raw'
import psychonline from './psychonline.md?raw'
import pslice from './pslice.md?raw'
import vslice from './vslice.md?raw'

export const ENGINE_DESCRIPTIONS: Record<EngineId, string> = {
  psych,
  codename,
  pslice,
  vslice,
  psychonline,
  fpsplus,
}
