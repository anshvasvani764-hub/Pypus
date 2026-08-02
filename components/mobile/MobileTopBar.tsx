import Link from 'next/link'
import { Search, ArrowLeft } from 'lucide-react'

type Props = {
  label?: string
  title: string
  workspaceSlug: string
  backHref?: string
  action?: React.ReactNode
}

export function MobileTopBar({ label, title, workspaceSlug, backHref, action }: Props) {
  return (
    <header className="font-ve sticky top-0 z-40 bg-ve-surface/80 px-ve-margin pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Back"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ve-surface-container text-ve-on-surface active:scale-95"
          >
            <ArrowLeft size={20} />
          </Link>
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ve-primary text-ve-on-primary">
            <span className="text-lg font-extrabold">{title.charAt(0).toUpperCase()}</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          {label && (
            <p className="text-ve-label text-ve-on-surface-variant/70 uppercase">{label}</p>
          )}
          <h1 className="text-ve-headline-mobile truncate text-ve-primary">{title}</h1>
        </div>

        {action ?? (
          <Link
            href={`/${workspaceSlug}/members`}
            aria-label="Search members"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ve-surface-container text-ve-on-surface active:scale-95"
          >
            <Search size={20} />
          </Link>
        )}
      </div>
    </header>
  )
}
