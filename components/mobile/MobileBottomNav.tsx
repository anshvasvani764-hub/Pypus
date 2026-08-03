'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, LayoutGrid, Bot, Settings, Users } from 'lucide-react'

export function MobileBottomNav({ workspaceSlug, workspaceName }: { workspaceSlug: string; workspaceName: string }) {
  const pathname = usePathname()
  const base = `/${workspaceSlug}`

  const items = [
    { href: base, icon: LayoutDashboard, label: 'Home', exact: true },
    { href: `${base}/workspace`, icon: LayoutGrid, label: workspaceName, exact: false },
    { href: `${base}/assistant`, icon: Bot, label: 'Assistant', exact: false },
    { href: `${base}/settings`, icon: Settings, label: 'Settings', exact: false },
    { href: `${base}/team`, icon: Users, label: 'Team', exact: false },
  ]

  return (
    <nav className="font-ve fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-ve-lg border-t border-ve-outline-variant/20 bg-ve-surface/90 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_0_rgba(0,110,22,0.12)] backdrop-blur-2xl">
      {items.map(({ href, icon: Icon, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'flex scale-110 flex-col items-center justify-center rounded-ve-sm bg-ve-primary-container px-4 py-2 text-ve-on-primary-container transition-all duration-200 ease-out'
                : 'flex flex-col items-center justify-center rounded-ve-sm px-4 py-2 text-ve-on-surface-variant/70 transition-all active:scale-95'
            }
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            <span className="text-ve-label mt-0.5">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
