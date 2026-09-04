'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type PanelState = 'closed' | 'open' | 'maximized'

interface AssistantPanelContextValue {
  isOpen: boolean
  isMaximized: boolean
  open: () => void
  close: () => void
  toggleMaximize: () => void
}

const AssistantPanelContext = createContext<AssistantPanelContextValue | null>(null)

/**
 * Owns the open/maximize state for the floating AI assistant panel.
 * Mounted once per layout so the panel stays alive across route changes —
 * opening/closing/maximizing never triggers navigation.
 */
export function AssistantPanelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PanelState>('closed')

  const open = useCallback(() => setState((s) => (s === 'closed' ? 'open' : s)), [])
  const close = useCallback(() => setState('closed'), [])
  const toggleMaximize = useCallback(
    () => setState((s) => (s === 'maximized' ? 'open' : 'maximized')),
    []
  )

  return (
    <AssistantPanelContext.Provider
      value={{
        isOpen: state !== 'closed',
        isMaximized: state === 'maximized',
        open,
        close,
        toggleMaximize,
      }}
    >
      {children}
    </AssistantPanelContext.Provider>
  )
}

export function useAssistantPanel() {
  const ctx = useContext(AssistantPanelContext)
  if (!ctx) {
    throw new Error('useAssistantPanel must be used within an AssistantPanelProvider')
  }
  return ctx
}
