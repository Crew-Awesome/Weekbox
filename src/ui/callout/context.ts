import { createContext, useContext } from 'react'
import type { CalloutContextType } from './types'

export const CalloutContext = createContext<CalloutContextType | null>(null)

export const useCallout = (): CalloutContextType => {
  const context = useContext(CalloutContext)
  if (!context) {
    throw new Error('useCallout must be used within a CalloutProvider')
  }
  return context
}

/** Alias for useCallout */
export const useToast = useCallout
