'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, ChevronRight, LayoutDashboard, LayoutGrid, Sparkles, Bot, Settings } from 'lucide-react'
import { useMobileNav } from '@/context/MobileNavContext'

const DRAWER_WIDTH = 280
const EDGE_ZONE = 24
// fraction of the drawer that must be revealed/hidden before we snap the rest of the way
const COMMIT_RATIO = 0.35

type NavLeaf = {
  type: 'link'
  href: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  label: string
}

type NavSection = {
  type: 'section'
  id: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  label: string
  children: { href: string; label: string }[]
}

type NavEntry = NavLeaf | NavSection

export function MobileNavDrawer({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname()
  const { isOpen, open, close } = useMobileNav()
  const base = `/${workspaceSlug}`

  const panelRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const axis = useRef<'x' | 'y' | null>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const currentX = useRef(-DRAWER_WIDTH)

  const items: NavEntry[] = [
    { type: 'link', href: base, icon: LayoutDashboard, label: 'Home' },
    {
      type: 'section',
      id: 'modules',
      icon: LayoutGrid,
      label: 'Modules',
      children: [
        { href: `${base}/members`, label: 'Members' },
        { href: `${base}/attendance`, label: 'Attendance' },
        { href: `${base}/fees`, label: 'Fees' },
        { href: `${base}/expenses`, label: 'Expenses' },
        { href: `${base}/team`, label: 'Team' },
      ],
    },
    { type: 'link', href: `${base}/agent`, icon: Sparkles, label: 'Agent' },
    { type: 'link', href: `${base}/assistant`, icon: Bot, label: 'Assistant' },
    { type: 'link', href: `${base}/settings`, icon: Settings, label: 'Settings' },
  ]

  // Vercel's project sidebar keeps exactly one section open at a time —
  // opening a new one collapses whichever was already expanded.
  const activeSectionId = items.find(
    (i): i is NavSection =>
      i.type === 'section' && i.children.some((c) => pathname.startsWith(c.href))
  )?.id
  const [openSection, setOpenSection] = useState<string | null>(activeSectionId ?? null)

  const toggleSection = (id: string) => {
    setOpenSection((prev) => (prev === id ? null : id))
  }

  const setTransform = useCallback((x: number, animate: boolean) => {
    const panel = panelRef.current
    const backdrop = backdropRef.current
    if (!panel || !backdrop) return
    panel.style.transition = animate ? 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none'
    backdrop.style.transition = animate ? 'opacity 280ms ease' : 'none'
    panel.style.transform = `translateX(${x}px)`
    const ratio = Math.max(0, Math.min(1, 1 + x / DRAWER_WIDTH))
    backdrop.style.opacity = String(ratio * 0.45)
    backdrop.style.pointerEvents = ratio > 0 ? 'auto' : 'none'
    currentX.current = x
  }, [])

  // Keep panel in sync when opened/closed via the hamburger button or a nav Link
  useEffect(() => {
    setTransform(isOpen ? 0 : -DRAWER_WIDTH, true)
  }, [isOpen, setTransform])

  const handleStart = (clientX: number, clientY: number) => {
    dragging.current = true
    axis.current = null
    startX.current = clientX
    startY.current = clientY
  }

  const handleMove = (clientX: number, clientY: number, e: React.TouchEvent) => {
    if (!dragging.current) return
    const dx = clientX - startX.current
    const dy = clientY - startY.current

    if (!axis.current) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        axis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      }
      if (!axis.current) return
    }
    if (axis.current !== 'x') return

    e.preventDefault()
    const base = isOpen ? 0 : -DRAWER_WIDTH
    const next = Math.max(-DRAWER_WIDTH, Math.min(0, base + dx))
    setTransform(next, false)
  }

  const handleEnd = () => {
    if (!dragging.current) return
    dragging.current = false
    if (axis.current !== 'x') {
      axis.current = null
      return
    }
    axis.current = null
    const shouldOpen = currentX.current > -DRAWER_WIDTH * (1 - COMMIT_RATIO)
    if (shouldOpen) open()
    else close()
  }

  return (
    <>
      {/* Thin edge strip — swipe right from the screen edge to open, only listens when closed */}
      {!isOpen && (
        <div
          className="fixed inset-y-0 left-0 z-40"
          style={{ width: EDGE_ZONE }}
          onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY, e)}
          onTouchEnd={handleEnd}
        />
      )}

      <div
        ref={backdropRef}
        className="fixed inset-0 z-40 bg-black"
        style={{ opacity: 0, pointerEvents: 'none' }}
        onClick={close}
        onTouchStart={(e) => isOpen && handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => isOpen && handleMove(e.touches[0].clientX, e.touches[0].clientY, e)}
        onTouchEnd={handleEnd}
      />

      <div
        ref={panelRef}
        className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-ve-surface pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] shadow-2xl"
        style={{ transform: `translateX(-${DRAWER_WIDTH}px)` }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY, e)}
        onTouchEnd={handleEnd}
      >
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-[15px] font-semibold text-ve-on-surface">Menu</span>
          <button
            onClick={close}
            aria-label="Close menu"
            className="flex size-8 items-center justify-center rounded-full text-ve-on-surface-variant active:bg-ve-surface-container-high"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2">
          <ul className="space-y-0.5">
            {items.map((item) => {
              if (item.type === 'link') {
                const { href, icon: Icon, label } = item
                const active = href === base ? pathname === href : pathname.startsWith(href)
                return (
                  <li key={label}>
                    <Link
                      href={href}
                      onClick={close}
                      className={`flex items-center gap-3 rounded-ve px-3 py-2.5 text-[14px] font-medium transition-colors ${
                        active
                          ? 'bg-ve-primary-container text-ve-on-primary-container'
                          : 'text-ve-on-surface active:bg-ve-surface-container-high'
                      }`}
                    >
                      <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                      {label}
                    </Link>
                  </li>
                )
              }

              const { id, icon: Icon, label, children } = item
              const expanded = openSection === id
              const parentActive = children.some((c) => pathname.startsWith(c.href))

              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => toggleSection(id)}
                    aria-expanded={expanded}
                    className={`flex w-full items-center gap-3 rounded-ve px-3 py-2.5 text-left text-[14px] font-medium transition-colors ${
                      parentActive
                        ? 'bg-ve-surface-container-high text-ve-on-surface'
                        : 'text-ve-on-surface active:bg-ve-surface-container-high'
                    }`}
                  >
                    <Icon size={18} strokeWidth={parentActive ? 2.4 : 2} />
                    <span className="flex-1">{label}</span>
                    <ChevronRight
                      size={16}
                      strokeWidth={2.2}
                      className={`shrink-0 text-ve-on-surface-variant/70 transition-transform duration-200 ease-out ${
                        expanded ? 'rotate-90' : 'rotate-0'
                      }`}
                    />
                  </button>

                  {/* grid-rows trick: animate 0fr -> 1fr so height transitions without
                      measuring the content, no jump/glitch even with dynamic children */}
                  <div
                    className={`grid transition-[grid-template-rows] duration-[220ms] ease-out ${
                      expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <ul className="space-y-0.5 py-0.5 pl-4">
                        {children.map((child) => {
                          const childActive = pathname.startsWith(child.href)
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={close}
                                className={`block rounded-ve border-l border-ve-outline-variant/40 py-2 pl-4 text-[13px] font-normal transition-colors ${
                                  childActive
                                    ? 'border-ve-primary text-ve-on-primary-container font-medium'
                                    : 'text-ve-on-surface-variant/85 active:bg-ve-surface-container-high'
                                }`}
                              >
                                {child.label}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </>
  )
}