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
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SidebarMode>('expanded')
  const [isHovered, setIsHovered] = useState(false)

  function setHovered(hovered: boolean) {
    setIsHovered(hovered)
  }

  const isCollapsed =
    mode === 'collapsed' ? true : mode === 'expanded' ? false : !isHovered // mode === 'hover'

  return (
    <SidebarContext.Provider value={{ isCollapsed, mode, setMode, isHovered, setHovered }}>
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