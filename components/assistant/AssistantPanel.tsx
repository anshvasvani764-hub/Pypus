'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Sparkles, Maximize2, Minimize2, X, RefreshCw } from 'lucide-react'
import { useWorkspace } from '@/hooks/useWorkspace'
import { useAssistantPanel } from '@/context/AssistantPanelContext'
import { useOptionalSidebar } from '@/context/SidebarContext'
import { AssistantChat } from './AssistantChat'

/**
 * Global floating AI assistant.
 *
 * - Mobile: a bottom-sheet overlay (screen is too narrow to show both the
 *   page and the assistant at once, so it dims the page behind it).
 * - Desktop: a fixed, right-anchored panel whose width animates between
 *   three states — closed (0), open (420px docked, page content pushed
 *   over via a spacer), and maximized (full screen up to the sidebar's
 *   edge, page content behind it free to go full-width since it's hidden
 *   under the overlay). Opening (open or maximized) auto-collapses the nav
 *   sidebar to icon-only, and hands control back the moment it closes.
 *   Never navigates or reloads the route underneath it.
 */
export function AssistantPanel() {
  const params = useParams<{ app: string }>()
  const { workspace } = useWorkspace(params?.app ?? '')
  const { isOpen, isMaximized, open, close, toggleMaximize } = useAssistantPanel()
  const [resetCount, setResetCount] = useState(0)
  const sidebar = useOptionalSidebar()

  // Desktop only (mobile has no <Sidebar/>, so `sidebar` is null there):
  // give the panel room by auto-collapsing the nav to icon-only while it's
  // open, and hand control back to the user's chosen mode the moment it closes.
  useEffect(() => {
    sidebar?.setAutoCollapsed(isOpen)
    return () => sidebar?.setAutoCollapsed(false)
  }, [isOpen, sidebar])

  const header = (
    <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          <Sparkles size={16} />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">Pypus AI</p>
          <p className="text-[11px] text-gray-500">{workspace?.name ?? 'Your assistant'}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setResetCount((c) => c + 1)}
          title="Reset conversation"
          aria-label="Reset conversation"
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <RefreshCw size={15} />
        </button>
        <button
          onClick={toggleMaximize}
          title={isMaximized ? 'Minimize' : 'Maximize'}
          aria-label={isMaximized ? 'Minimize' : 'Maximize'}
          className="hidden rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 md:inline-flex"
        >
          {isMaximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
        <button
          onClick={close}
          title="Close"
          aria-label="Close assistant"
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Trigger button — visible on every page, hides while the panel is open */}
      <button
        onClick={open}
        aria-label="Open AI Assistant"
        className={`fixed bottom-6 right-6 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-600/30 transition-all duration-200 hover:scale-105 active:scale-95 ${
          isOpen ? 'pointer-events-none scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <Sparkles size={22} />
      </button>

      {/* Mobile: dimmed backdrop + bottom-sheet overlay (md:hidden — desktop uses the docked pane below) */}
      <div
        onClick={close}
        aria-hidden="true"
        className={`fixed inset-0 z-[90] bg-black/30 backdrop-blur-[1px] transition-opacity duration-200 md:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        role="dialog"
        aria-label="AI Assistant"
        aria-hidden={!isOpen}
        className={`fixed inset-x-0 bottom-0 top-16 z-[95] flex flex-col overflow-hidden rounded-t-2xl border-t border-gray-200 bg-[#FAFAF7] shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-y-0' : 'pointer-events-none translate-y-full'
        }`}
      >
        {header}
        <div className="min-h-0 flex-1">
          <AssistantChat key={resetCount} workspaceId={workspace?.id ?? null} />
        </div>
      </div>

      {/* Desktop: the panel itself is ALWAYS `fixed`, right-anchored, full
          viewport height — closed/open/maximized only ever change its
          `width`, nothing else. That's what makes the animation smooth:
          `position` can never be transitioned by CSS (it jumps instantly no
          matter the duration), so keeping it fixed the whole time and only
          ever tweening `width` is what makes every state change glide.
          Maximized width stops exactly at the sidebar's live edge (via
          `calc(100vw - <sidebar width>)`) so the nav stays visible on top
          of it. A separate spacer (below) reserves layout space for the
          docked 'open' width so the real page content gets pushed over;
          it collapses to 0 when maximized since the panel then covers the
          content anyway. */}
      <div
        className={`hidden shrink-0 transition-[width] duration-300 ease-in-out md:block ${
          isOpen && !isMaximized ? 'w-[420px]' : 'w-0'
        }`}
      />
      <div
        className={`hidden fixed inset-y-0 right-0 z-[100] flex-col overflow-hidden border-l border-gray-200 bg-[#FAFAF7] transition-[width] duration-300 ease-in-out md:flex ${
          !isOpen
            ? 'w-0 border-l-0'
            : isMaximized
              ? sidebar?.isCollapsed === false
                ? 'w-[calc(100vw-16rem)]'
                : 'w-[calc(100vw-5rem)]'
              : 'w-[420px]'
        }`}
      >
        <div className="flex h-full min-w-[420px] flex-col">
          {header}
          <div className="min-h-0 flex-1">
            <AssistantChat key={resetCount} workspaceId={workspace?.id ?? null} />
          </div>
        </div>
      </div>
    </>
  )
}
