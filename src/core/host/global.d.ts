import type { HostAdapter } from './types'

declare global {
  interface Window {
    host: HostAdapter
  }
}

export {}
