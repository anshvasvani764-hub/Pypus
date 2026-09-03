'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, usePathname } from 'next/navigation'
import {
  Home,
  LayoutGrid,
  Bot,
  MessageCircle,
  Settings,
  PanelLeft,
  Check,
  ChevronRight,
  ChevronLeft,
  Receipt,
  Bell,
} from 'lucide-react'
import { useSidebar, SidebarMode } from '@/context/SidebarContext'
import { useUser } from '@/hooks/useUser'
import { useWorkspace } from '@/hooks/useWorkspace'
import NavItem from './NavItem'

const MODE_OPTIONS: { value: SidebarMode; label: string }[] = [
  { value: 'expanded', label: 'Expanded' },
  { value: 'collapsed', label: 'Collapsed' },
  { value: 'hover', label: 'Expand on hover' },
]

// --- Explicit hover rules ---
// 'expanded'  -> always w-64. Hover is ignored entirely.
// 'collapsed' -> always w-20. Hover is ignored entirely.
// 'hover'     -> w-20 at rest, w-64 only while the pointer is over the sidebar.
// Hover state is only ever read in 'hover' mode, and we only bother updating it in that mode too.

export default function Sidebar() {
  const { isCollapsed, mode, setMode, setHovered } = useSidebar()
  const [controlOpen, setControlOpen] = useState(false)
  const controlRef = useRef<HTMLDivElement>(null)

  // Folder is app/[app], so the route param key is "app" (this is the workspace slug).
  const { app } = useParams<{ app: string }>()
  const base = `/${app}`
  const pathname = usePathname()

  // Automations has its own sub-nav (Receipts, Fee reminders) that swaps in
  // for the main nav list, in place — same font/sizing, with a back row.
  const isOnAutomationsRoute = pathname?.startsWith(`${base}/automations`)
  const [navView, setNavView] = useState<'main' | 'automations'>(
    isOnAutomationsRoute ? 'automations' : 'main'
  )

  const { displayName, avatarUrl, isLoading: userLoading } = useUser()
  const { workspaceName, isLoading: workspaceLoading } = useWorkspace(app)

  const restingCollapsed = mode !== 'expanded'
  const isHoverOverlay = mode === 'hover' && !isCollapsed

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (controlRef.current && !controlRef.current.contains(e.target as Node)) {
        setControlOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleMouseEnter() {
    if (mode === 'hover') setHovered(true)
  }

  function handleMouseLeave() {
    if (mode === 'hover') setHovered(false)
  }

  return (
    <>
      {/* Spacer — reserves layout width equal to the RESTING state, so page content never shifts. */}
      <div
        className={`shrink-0 h-screen transition-[width] duration-300 ease-in-out ${
          restingCollapsed ? 'w-20' : 'w-64'
        }`}
      />

      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed left-0 top-0 z-40 h-screen flex flex-col overflow-hidden bg-[#F6F5F1] border-r border-gray-200 transition-[width,box-shadow] duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isHoverOverlay ? 'shadow-xl' : ''}`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-6">
         <img
  src="/logo.png"
  alt="Pypus"
  className="w-9 h-9 rounded-xl object-cover shrink-0"
/>
          <div
            className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
              isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'
            }`}
          >
            <p className="font-bold text-gray-900 leading-tight">Pypus</p>
          </div>
        </div>

        {/* Main nav */}
        <nav className="flex flex-col gap-1 px-3">
          {navView === 'main' ? (
            <>
              <NavItem href={base} icon={Home} label="Home" />
              <NavItem href={`${base}/assistant`} icon={Bot} label="AI Assistant" />
              <button
                onClick={() => setNavView('automations')}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-full transition-colors duration-200 ${
                  isOnAutomationsRoute
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-700 hover:bg-gray-200/70 hover:text-gray-900'
                }`}
              >
                <MessageCircle
                  size={19}
                  className={`shrink-0 transition-colors duration-200 ${
                    isOnAutomationsRoute ? 'text-emerald-700' : 'text-gray-600 group-hover:text-gray-900'
                  }`}
                />
                <span
                  className={`flex-1 text-left text-[15px] whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                    isOnAutomationsRoute ? 'font-bold' : 'font-semibold group-hover:font-bold'
                  } ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[120px] opacity-100'}`}
                >
                  Automations
                </span>
                {!isCollapsed && (
                  <ChevronRight
                    size={16}
                    className={isOnAutomationsRoute ? 'text-emerald-600' : 'text-gray-400'}
                  />
                )}
              </button>
              <NavItem href={`${base}/workspace`} icon={LayoutGrid} label="Workspace" />
            </>
          ) : (
            <>
              <button
                onClick={() => setNavView('main')}
                className="group flex items-center gap-2 px-3 py-2.5 rounded-full text-gray-700 hover:bg-gray-200/70 hover:text-gray-900 transition-colors duration-200"
              >
                <ChevronLeft size={17} className="shrink-0 text-gray-600 group-hover:text-gray-900" />
                <span
                  className={`text-[15px] font-bold whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                    isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'
                  }`}
                >
                  Automations
                </span>
              </button>
              <NavItem href={`${base}/automations/receipts`} icon={Receipt} label="Receipts" />
              <NavItem href={`${base}/automations/fee-reminders`} icon={Bell} label="Fee reminders" />
            </>
          )}
        </nav>

        {/* Business section */}
        <div className="mt-6 px-3">
          <p
            className={`px-3 text-[11px] font-bold tracking-wide text-gray-500 uppercase overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${
              isCollapsed ? 'max-w-0 opacity-0 mb-0' : 'max-w-[160px] opacity-100 mb-1'
            }`}
          >
            Business
          </p>
          <NavItem href={`${base}/settings`} icon={Settings} label="Settings" />
        </div>

        <div className="flex-1" />

        {/* Profile + Sidebar control, same card, button sits in the empty space to the right */}
        <div className="relative px-3 pb-5" ref={controlRef}>
          <div className="relative flex items-center gap-3 border border-gray-200 rounded-2xl px-3 py-2.5 bg-white">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div
              className={`flex-1 flex items-center justify-between gap-2 min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${
                isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[220px] opacity-100'
              }`}
            >
              <div className="text-sm leading-tight min-w-0">
                {userLoading ? (
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1" />
                ) : (
                  <p className="font-bold text-gray-900 truncate">{displayName}</p>
                )}
                {workspaceLoading ? (
                  <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                ) : (
                  <p className="text-gray-500 text-xs truncate">{workspaceName}</p>
                )}
              </div>

              <button
                onClick={() => setControlOpen((prev) => !prev)}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                aria-label="Sidebar control"
              >
                <PanelLeft size={16} />
              </button>
            </div>
          </div>

          {/* Collapsed-state trigger — no room inside the icon-only card, so it sits just below it */}
          {isCollapsed && (
            <button
              onClick={() => setControlOpen((prev) => !prev)}
              className="mt-2 w-full flex items-center justify-center py-2 rounded-full text-gray-500 hover:bg-gray-200/70 hover:text-gray-900 transition-colors"
              aria-label="Sidebar control"
            >
              <PanelLeft size={16} />
            </button>
          )}

          {controlOpen && (
            <div className="absolute bottom-full left-3 mb-2 w-52 rounded-xl border border-gray-200 bg-white shadow-lg py-1.5 z-50">
              <p className="px-3 pt-1.5 pb-2 text-[11px] font-bold tracking-wide text-gray-400 uppercase">
                Sidebar control
              </p>
              {MODE_OPTIONS.map((option) => {
                const selected = mode === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      setMode(option.value)
                      setControlOpen(false)
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-[14px] transition-colors ${
                      selected
                        ? 'text-emerald-700 font-semibold'
                        : 'text-gray-700 font-medium hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span>{option.label}</span>
                    {selected && <Check size={15} className="shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
