'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type SidebarMode = 'expanded' | 'collapsed' | 'hover'

type SidebarContextType = {
  /** Effective state — drives layout/labels right now. */
  isCollapsed: boolean
  /** The 3-way mode picked from the "Sidebar control" menu. */
  mode: SidebarMode
  setMode: (mode: SidebarMode) => void
  isHovered: boolean
  setHovered: (hovered: boolean) => void
  /**
   * Whether something (e.g. the AI assistant panel) is currently forcing the
   * sidebar collapsed. Unlike the ephemeral 'hover' mode expansion, this is a
   * real layout change — components that reserve space for the sidebar
   * (like its own spacer div) need to read this too, or the page content
   * won't reflow into the freed-up width.
   */
  autoCollapsed: boolean
  /**
   * Temporary override that collapses the sidebar (e.g. while the AI
   * assistant panel is docked open) without touching the user's chosen
   * mode — turning it off snaps straight back to whatever mode they picked.
   */
  setAutoCollapsed: (collapsed: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SidebarMode>('expanded')
  const [isHovered, setIsHovered] = useState(false)
  const [autoCollapsed, setAutoCollapsed] = useState(false)

  function setHovered(hovered: boolean) {
    setIsHovered(hovered)
  }

  const modeCollapsed =
    mode === 'collapsed' ? true : mode === 'expanded' ? false : !isHovered // mode === 'hover'
  const isCollapsed = autoCollapsed || modeCollapsed

  return (
    <SidebarContext.Provider
      value={{ isCollapsed, mode, setMode, isHovered, setHovered, autoCollapsed, setAutoCollapsed }}
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