import Link from 'next/link'
import { Plus } from 'lucide-react'

export function MobileFab({ href, label = 'Add' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="fixed right-6 bottom-24 z-50 flex size-14 items-center justify-center rounded-ve-md bg-ve-primary-container text-ve-on-primary-container shadow-lg shadow-ve-primary/30 active:scale-95"
    >
      <Plus size={26} strokeWidth={2.5} />
    </Link>
  )
}
