import type { HostAdapter } from './types'
import type { WeekBoxConsoleApi } from '@/core/devtools/wb-console'

declare global {
  interface Window {
    host: HostAdapter
    wb: WeekBoxConsoleApi
  }
}

export {}
