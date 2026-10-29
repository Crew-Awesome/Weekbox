import React, { useMemo, useEffect, type ReactNode } from 'react'
import { CalloutContext } from '../context'
import { CalloutContainer } from '../CalloutContainer'
import type { CalloutContextType } from '../types'
import { useCalloutState } from './use-callout-state'
import { useCalloutDemo } from './use-callout-demo'

export const CalloutProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const state = useCalloutState()
  const { downloadDemo, demo } = useCalloutDemo({
    show: state.show,
    dismissAll: state.dismissAll,
    download: state.download,
    updateDownload: state.updateDownload,
  })

  const contextValue: CalloutContextType & { demo: () => void } = useMemo(
    () => ({
      ...state,
      downloadDemo,
      demo,
    }),
    [state, downloadDemo, demo],
  )

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.callout = contextValue
      window.toast = contextValue
    }
  }, [contextValue])

  return (
    <CalloutContext.Provider value={contextValue}>
      {children}
      <CalloutContainer
        toasts={state.toasts}
        position={state.toasts[state.toasts.length - 1]?.position || 'top-right'}
        onDismiss={state.dismiss}
        onToggleMinimize={state.toggleMinimize}
      />
    </CalloutContext.Provider>
  )
}

