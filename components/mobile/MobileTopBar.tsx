'use client'

import Link from 'next/link'
import { Search, ArrowLeft, Menu } from 'lucide-react'
import { useMobileNav } from '@/context/MobileNavContext'

type Props = {
  label?: string
  title: string
  workspaceSlug: string
  backHref?: string
  action?: React.ReactNode
}

export function MobileTopBar({ label, title, workspaceSlug, backHref, action }: Props) {
  const { open } = useMobileNav()

  return (
    <header className="font-ve sticky top-0 z-40 bg-ve-surface/85 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur-xl">
      <div className="flex h-9 items-center gap-1">
        <button
          onClick={open}
          aria-label="Open menu"
          className="flex size-8 shrink-0 -ml-1.5 items-center justify-center rounded-full text-ve-on-surface active:bg-ve-surface-container-high active:scale-95"
        >
          <Menu size={19} />
        </button>

        {backHref && (
          <Link
            href={backHref}
            aria-label="Back"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-ve-on-surface active:bg-ve-surface-container-high active:scale-95"
          >
            <ArrowLeft size={19} />
          </Link>
        )}

        <div className="min-w-0 flex-1">
          {label && (
            <p className="text-[10px] leading-none font-semibold uppercase tracking-wide text-ve-on-surface-variant/60">
              {label}
            </p>
          )}
          <h1 className={`truncate text-[17px] font-semibold leading-tight text-ve-on-surface ${label ? 'mt-0.5' : ''}`}>
            {title}
          </h1>
        </div>

        {action ?? (
          <Link
            href={`/${workspaceSlug}/members`}
            aria-label="Search members"
            className="flex size-8 shrink-0 -mr-1.5 items-center justify-center rounded-full text-ve-on-surface active:bg-ve-surface-container-high active:scale-95"
          >
            <Search size={19} />
          </Link>
        )}
      </div>
    </header>
  )
}
