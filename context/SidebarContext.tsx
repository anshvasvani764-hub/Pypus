'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type SidebarMode = 'expanded' | 'collapsed' | 'hover'

type SidebarContextType = {
  /** Effective state — drives the actual `<aside>` width right now. */
  isCollapsed: boolean
  /**
   * The width the page layout reserves space for (the spacer div). Always
   * the RESTING state — hover-driven expansion (whether from 'hover' mode,
   * or the auto-lock's hover escape hatch below) is an ephemeral overlay on
   * top of the page, never a reflow, so this stays collapsed through it.
   */
  isReflowCollapsed: boolean
  /** The 3-way mode picked from the "Sidebar control" menu. */
  mode: SidebarMode
  setMode: (mode: SidebarMode) => void
  isHovered: boolean
  setHovered: (hovered: boolean) => void
  /**
   * Whether something (e.g. the AI assistant panel) is currently asking the
   * sidebar to rest collapsed. This is only ever a temporary *default* —
   * never a hard lock: an explicit control click (see setMode below)
   * restores real mode-driven behaviour, and regardless of that, hovering
   * the icon rail always pops it open as a floating overlay so people
   * aren't stuck closing the assistant just to navigate.
   */
  autoCollapsed: boolean
  /**
   * Temporary default that collapses the sidebar (e.g. while the AI
   * assistant panel is docked open) without touching the user's chosen
   * mode — turning it off snaps straight back to whatever mode they picked.
   */
  setAutoCollapsed: (collapsed: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<SidebarMode>('expanded')
  const [isHovered, setIsHovered] = useState(false)
  const [autoCollapsed, setAutoCollapsedState] = useState(false)
  const [manualOverride, setManualOverride] = useState(false)

  function setHovered(hovered: boolean) {
    setIsHovered(hovered)
  }

  // An explicit choice from the sidebar's own control counts as the user
  // taking manual control — it wins over autoCollapsed's temporary resting
  // default, giving a real reflow-expand instead of just the hover-only
  // escape hatch below.
  function setMode(newMode: SidebarMode) {
    setModeState(newMode)
    setManualOverride(true)
  }

  // Turning the temporary auto-collapse off (assistant panel closing)
  // clears the override too, so next time it turns on we're back to the
  // default resting-collapsed behaviour.
  function setAutoCollapsed(collapsed: boolean) {
    setAutoCollapsedState(collapsed)
    if (!collapsed) setManualOverride(false)
  }

  const modeCollapsed =
    mode === 'collapsed' ? true : mode === 'expanded' ? false : !isHovered // mode === 'hover'

  const autoLocked = autoCollapsed && !manualOverride
  const isCollapsed = autoLocked ? !isHovered : modeCollapsed
  const isReflowCollapsed = autoLocked || mode === 'hover' ? true : isCollapsed

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        isReflowCollapsed,
        mode,
        setMode,
        isHovered,
        setHovered,
        autoCollapsed,
        setAutoCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used inside SidebarProvider')
  }
  return context
}

/**
 * Same as useSidebar but returns null instead of throwing when there's no
 * provider above it — e.g. the mobile layout, which never renders <Sidebar/>.
 * Lets shared components (like the assistant panel) opt into collapsing the
 * sidebar only when one actually exists.
 */
export function useOptionalSidebar() {
  return useContext(SidebarContext) ?? null
}