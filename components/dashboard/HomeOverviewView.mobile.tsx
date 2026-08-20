import Link from 'next/link'
import {
  Users,
  CreditCard,
  Clock,
  AlertTriangle,
  CalendarClock,
  UserX,
  TrendingDown,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'
import type { HomeOverview, AttentionItem } from '@/lib/dashboard/get-home-overview'
import { MobileTopBar } from '@/components/mobile/MobileTopBar'

function rupees(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const ATTENTION_STYLES: Record<
  AttentionItem['kind'],
  { label: string; icon: typeof AlertTriangle; classes: string }
> = {
  overdue: { label: 'Overdue', icon: AlertTriangle, classes: 'bg-ve-error-container text-ve-on-error-container' },
  due_soon: { label: 'Due soon', icon: CalendarClock, classes: 'bg-ve-tertiary-container text-ve-on-tertiary-container' },
  no_plan: { label: 'No plan', icon: UserX, classes: 'bg-ve-surface-container-high text-ve-on-surface-variant' },
  attendance_drop: { label: 'Attendance', icon: TrendingDown, classes: 'bg-ve-secondary-fixed text-ve-on-secondary-fixed-variant' },
}

function StatCard({
  href,
  label,
  value,
  sub,
  icon: Icon,
  gradient,
}: {
  href: string
  label: string
  value: string
  sub: string
  icon: typeof Users
  gradient: string
}) {
  return (
    <Link
      href={href}
      className={`relative flex flex-col justify-between overflow-hidden rounded-ve-md bg-gradient-to-br p-3.5 text-white active:scale-[0.98] ${gradient}`}
      style={{ aspectRatio: '4 / 3' }}
    >
      <Icon className="absolute -top-3 -right-3 opacity-10" size={64} strokeWidth={1.5} />
      <div className="glass-lite flex size-7 items-center justify-center rounded-full">
        <Icon size={15} />
      </div>
      <div className="relative">
        <p className="text-ve-stats tabular-nums-lining leading-none">{value}</p>
        <p className="text-ve-label mt-1.5 uppercase opacity-80">{label}</p>
        <p className="mt-0.5 text-[11px] opacity-70">{sub}</p>
      </div>
    </Link>
  )
}

export function HomeOverviewViewMobile({
  overview,
  workspaceSlug,
  workspaceName,
}: {
  overview: HomeOverview
  workspaceSlug: string
  workspaceName: string
}) {
  const base = `/${workspaceSlug}`
  const expected = overview.collectedThisMonth + overview.pendingDues

  return (
    <div className="pb-4">
      <MobileTopBar label="Hello," title={workspaceName} workspaceSlug={workspaceSlug} />

      <div className="px-ve-margin">
        <div className="grid grid-cols-2 gap-ve-gutter">
          <StatCard
            href={`${base}/members`}
            label="Active members"
            value={String(overview.activeMembers)}
            sub={`${overview.presentToday} present today`}
            icon={Users}
            gradient="from-ve-on-background to-ve-inverse-surface"
          />
          <StatCard
            href={`${base}/fees`}
            label="Expected"
            value={rupees(expected)}
            sub="Collected + pending"
            icon={TrendingUp}
            gradient="from-ve-tertiary to-ve-on-tertiary-container"
          />
        </div>

        <div className="mt-ve-gutter rounded-ve-lg border border-ve-outline-variant/20 bg-white overflow-hidden">
          <div className="grid grid-cols-2">
            <div className="px-3.5 py-2.5 border-r border-ve-outline-variant/20">
              <p className="text-[9px] font-semibold text-ve-on-surface-variant uppercase tracking-wider">Profit</p>
              <p className={`text-[15px] font-bold mt-0.5 ${(overview.revenue - overview.expenses) < 0 ? "text-red-600" : "text-emerald-600"}`}>
                ₹{Math.abs(overview.revenue - overview.expenses).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="px-3.5 py-2.5">
              <p className="text-[9px] font-semibold text-ve-on-surface-variant uppercase tracking-wider">Expenses</p>
              <p className="text-[15px] font-bold mt-0.5 text-red-600">
                ₹{overview.expenses.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        <section className="mt-ve-xl">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-ve-headline-mobile text-ve-on-surface">Needs Attention</h2>
            {overview.attention.length > 0 && (
              <span className="text-ve-label text-ve-on-surface-variant/70">
                {overview.attention.length}
              </span>
            )}
          </div>

          {overview.attention.length === 0 ? (
            <p className="rounded-ve bg-ve-surface-container-lowest p-4 text-ve-body text-ve-on-surface-variant">
              All clear — nothing needs your attention.
            </p>
          ) : (
            <ul className="space-y-2">
              {overview.attention.slice(0, 6).map((item) => {
                const style = ATTENTION_STYLES[item.kind]
                const Icon = style.icon
                return (
                  <li key={`${item.kind}-${item.memberId}`}>
                    <Link
                      href={`${base}/members/${item.memberId}`}
                      className="flex items-center gap-2.5 rounded-ve bg-ve-surface-container-lowest p-2.5 active:scale-[0.99]"
                    >
                      <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${style.classes}`}>
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-ve-on-surface">
                          {item.memberName}
                        </span>
                        <span className="block truncate text-[12px] text-ve-on-surface-variant">
                          {item.detail}
                        </span>
                      </span>
                      <ChevronRight size={16} className="shrink-0 text-ve-on-surface-variant/50" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="mt-ve-xl">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-ve-headline-mobile text-ve-on-surface">Recent Activity</h2>
            {overview.activity.length > 0 && (
              <span className="text-ve-label text-ve-on-surface-variant/70">
                {overview.activity.length}
              </span>
            )}
          </div>
          <div className="rounded-ve bg-ve-surface-container-lowest p-4">
            {overview.activity.length === 0 ? (
              <p className="text-ve-body text-ve-on-surface-variant">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {overview.activity.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-ve-primary" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-ve-on-surface block">{a.text}</span>
                      <span className="text-[11px] text-ve-on-surface-variant/60 mt-0.5 block">
                        {formatRelativeTime(a.at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
