'use client'

import Link from 'next/link'
import { Users, CalendarCheck, CreditCard, Wallet, MoreHorizontal, Sparkles, ArrowRight, Menu } from 'lucide-react'
import { useMobileNav } from '@/context/MobileNavContext'

interface Props {
  workspaceSlug: string
  stats: {
    activeMembers: number
    todayAttendance: number
    pendingFeesCount: number
  }
}

export function ModulesView({ workspaceSlug, stats }: Props) {
  const { open } = useMobileNav()
  const modules = [
    {
      href: `/${workspaceSlug}/members`,
      icon: Users,
      title: 'Members',
      description: 'Manage your gym members',
      accent: 'from-blue-500 to-blue-700',
      shadow: 'shadow-[0_8px_24px_rgba(59,130,246,0.25)]',
    },
    {
      href: `/${workspaceSlug}/attendance`,
      icon: CalendarCheck,
      title: 'Attendance',
      description: 'Track daily check-ins',
      accent: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-[0_8px_24px_rgba(59,130,246,0.25)]',
    },
    {
      href: `/${workspaceSlug}/fees`,
      icon: CreditCard,
      title: 'Fees',
      description: 'Payments & billing',
      accent: 'from-emerald-500 to-emerald-700',
      shadow: 'shadow-[0_8px_24px_rgba(16,185,129,0.25)]',
    },
    {
      href: `/${workspaceSlug}/expenses`,
      icon: Wallet,
      title: 'Expenses',
      description: 'Track spends & categories',
      accent: 'from-red-500 to-rose-700',
      shadow: 'shadow-[0_8px_24px_rgba(239,68,68,0.25)]',
    },
    {
      href: `/${workspaceSlug}/team`,
      icon: Users,
      title: 'Team',
      description: 'Staff and invites',
      accent: 'from-purple-500 to-purple-700',
      shadow: 'shadow-[0_8px_24px_rgba(168,85,247,0.25)]',
    },
  ]

  return (
    <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface pb-6">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-ve-surface/85 backdrop-blur-xl border-b border-ve-outline-variant/20 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 flex items-center gap-2.5 w-full">
        <button
          onClick={open}
          aria-label="Open menu"
          className="flex size-8 shrink-0 -ml-1.5 items-center justify-center rounded-full text-ve-on-surface active:bg-ve-surface-container-high active:scale-95"
        >
          <Menu size={19} />
        </button>
        <h1 className="text-[17px] font-semibold leading-tight text-ve-on-surface">Pypus</h1>
      </header>

      <main className="px-5 pt-6">
        {/* Quick Stats Row */}
        <section className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-ve-surface-container-high p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-[10px] font-bold text-ve-on-surface-variant uppercase tracking-wider mb-1">Today</span>
            <span className="text-2xl font-black text-ve-primary">{stats.todayAttendance}</span>
            <span className="text-[10px] font-bold text-ve-primary/70">Check-ins</span>
          </div>
          <div className="bg-ve-surface-container-high p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-[10px] font-bold text-ve-on-surface-variant uppercase tracking-wider mb-1">Total</span>
            <span className="text-2xl font-black text-ve-secondary">{stats.activeMembers}</span>
            <span className="text-[10px] font-bold text-ve-secondary/70">Members</span>
          </div>
          <div className="bg-ve-surface-container-high p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-[10px] font-bold text-ve-on-surface-variant uppercase tracking-wider mb-1">Pending</span>
            <span className="text-2xl font-black text-ve-error">{stats.pendingFeesCount}</span>
            <span className="text-[10px] font-bold text-ve-error/70">Dues</span>
          </div>
        </section>

        {/* Modules Grid */}
        <section className="mb-8">
          <h2 className="text-ve-headline-mobile text-ve-on-surface mb-4">Modules</h2>
          <div className="grid grid-cols-2 gap-4">
            {modules.map((m) => (
              <Link
                key={m.title}
                href={m.href}
                className={`card-lift relative overflow-hidden aspect-[4/3] rounded-2xl bg-gradient-to-br ${m.accent} p-5 flex flex-col justify-between shadow-lg active:scale-[0.97] transition-all`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <m.icon size={20} className="text-white" />
                  </div>
                  <ArrowRight size={18} className="text-white/70" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">{m.title}</h3>
                  <p className="text-xs font-medium text-white/80 mt-1">{m.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Coming Soon */}
        <section className="mb-6">
          <div className="rounded-2xl border-2 border-dashed border-ve-outline-variant/50 bg-ve-surface-container-lowest p-5 flex items-center justify-center gap-3 opacity-70">
            <MoreHorizontal size={20} className="text-ve-on-surface-variant" />
            <span className="text-xs font-bold text-ve-on-surface-variant">More modules coming soon</span>
          </div>
        </section>

        {/* Tip Card */}
        <section>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-ve-outline-variant/20 flex items-start gap-4">
            <div className="p-2.5 rounded-full bg-ve-primary/10 text-ve-primary shrink-0">
              <Sparkles size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-bold text-ve-on-surface mb-1">Optimization Tip</h4>
              <p className="text-xs text-ve-on-surface-variant leading-relaxed">
                Keep check-ins consistent to boost member engagement and get automated revenue forecasts.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}