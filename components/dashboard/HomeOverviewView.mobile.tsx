import Link from 'next/link'
import {
  Users,
  CreditCard,
  AlertTriangle,
  CalendarClock,
  UserX,
  TrendingDown,
  ChevronRight,
  TrendingUp,
  Crown,
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
  iconClasses,
  valueClasses,
}: {
  href: string
  label: string
  value: string
  sub: string
  icon: typeof Users
  iconClasses: string
  valueClasses?: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1.5 rounded-ve-md border border-ve-outline-variant/15 bg-white p-3 active:scale-[0.98] active:bg-ve-surface-container-lowest"
    >
      <div className="flex items-center justify-between">
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${iconClasses}`}>
          <Icon size={15} strokeWidth={2} />
        </span>
        <ChevronRight size={14} className="text-ve-on-surface-variant/30" />
      </div>
      <div>
        <p className={`text-[19px] font-bold leading-tight tabular-nums-lining text-ve-on-surface whitespace-nowrap ${valueClasses ?? ''}`}>{value}</p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ve-on-surface-variant/60 truncate">{label}</p>
        <p className="text-[10.5px] text-ve-on-surface-variant/55 truncate">{sub}</p>
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
        <div className="rounded-ve-lg bg-gradient-to-br from-ve-secondary to-[#7a7dff] p-3.5 text-white">
          <div className="flex items-center gap-2.5">
            <span className="glass-lite flex size-9 shrink-0 items-center justify-center rounded-full">
              <Crown size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold leading-tight">Welcome back! 👋</p>
              <p className="mt-0.5 text-[11.5px] leading-snug opacity-80">
                Here&apos;s what&apos;s happening with your gym today.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <StatCard
            href={`${base}/members`}
            label="Active members"
            value={String(overview.activeMembers)}
            sub={`${overview.presentToday} present today`}
            icon={Users}
            iconClasses="bg-emerald-100 text-emerald-600"
          />
          <StatCard
            href={`${base}/fees`}
            label="Expected"
            value={rupees(expected)}
            sub="Collected + pending"
            icon={CreditCard}
            iconClasses="bg-violet-100 text-violet-600"
          />
          <StatCard
            href={`${base}/fees`}
            label="Profit"
            value={`${(overview.revenue - overview.expenses) < 0 ? '-' : ''}₹${Math.abs(overview.revenue - overview.expenses).toLocaleString('en-IN')}`}
            sub="This month"
            icon={TrendingUp}
            iconClasses="bg-emerald-100 text-emerald-600"
            valueClasses={(overview.revenue - overview.expenses) < 0 ? 'text-red-600' : 'text-emerald-600'}
          />
          <StatCard
            href={`${base}/fees`}
            label="Expenses"
            value={overview.expenses > 0 ? rupees(overview.expenses) : '₹0'}
            sub={overview.expenses > 0 ? 'This month' : 'No expenses added'}
            icon={TrendingDown}
            iconClasses="bg-red-100 text-red-600"
          />
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