'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { useSidebar } from '@/context/SidebarContext'

type NavItemProps = {
  href: string
  icon: LucideIcon
  label: string
}

export default function NavItem({ href, icon: Icon, label }: NavItemProps) {
  const { isCollapsed } = useSidebar()
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-full transition-colors duration-200 ${
        isActive
          ? 'bg-emerald-100 text-emerald-700'
          : 'text-gray-700 hover:bg-gray-200/70 hover:text-gray-900'
      }`}
    >
      <Icon
        size={19}
        className={`shrink-0 transition-colors duration-200 ${
          isActive ? 'text-emerald-700' : 'text-gray-600 group-hover:text-gray-900'
        }`}
      />
      <span
        className={`text-[15px] whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
          isActive ? 'font-bold' : 'font-semibold group-hover:font-bold'
        } ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'}`}
      >
        {label}
      </span>
    </Link>
  )
}