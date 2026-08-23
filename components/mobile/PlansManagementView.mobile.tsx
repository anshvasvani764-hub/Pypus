'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Menu, Plus, TrendingUp, TrendingDown, Edit2, Trash2, Users, Clock, BadgeCheck } from 'lucide-react'
import { useMobileNav } from '@/context/MobileNavContext'
import type { Plan, Member } from '@/lib/members/types'
import { durationLabel } from '@/lib/members/plan-duration'

interface Props {
  workspaceSlug: string
  workspaceId: string
  plans: Plan[]
  members: Member[]
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export function PlansManagementView({ workspaceSlug, plans, members }: Props) {
  const { open } = useMobileNav()
  const [activeIds, setActiveIds] = useState<Set<string>>(
    new Set(plans.filter((p) => p.status === 'active').map((p) => p.id))
  )

  const toggleActive = (id: string) => {
    setActiveIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Count members per plan
  const memberCountByPlan: Record<string, number> = {}
  for (const m of members) {
    if (m.plan_id) memberCountByPlan[m.plan_id] = (memberCountByPlan[m.plan_id] ?? 0) + 1
  }

  const totalRevenue = plans.reduce((s, p) => s + (p.price ?? 0) * (memberCountByPlan[p.id] ?? 0), 0)
  const avgRevenue = plans.length > 0 ? totalRevenue / plans.length : 0

  return (
    <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface pb-6">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-ve-surface/80 px-5 py-3 backdrop-blur-xl border-b border-ve-outline-variant/30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={open}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-ve-primary/5 transition-colors active:scale-95"
          >
            <Menu size={20} className="text-ve-primary" />
          </button>
          <Link
            href={`/${workspaceSlug}/fees`}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-ve-primary/5 transition-colors active:scale-95"
          >
            <ArrowLeft size={20} className="text-ve-primary" />
          </Link>
          <span className="font-ve-headline-lg-mobile text-ve-primary font-black">Pypus</span>
        </div>
      </header>

      <main className="px-5 pt-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ve-on-surface">Plans</h1>
            <p className="text-sm text-ve-on-surface-variant/70 mt-0.5">Manage your subscription plans</p>
          </div>
          <button className="flex items-center gap-2 rounded-full bg-ve-primary-container text-ve-on-primary-container font-bold text-xs px-5 py-2.5 shadow-lg shadow-ve-primary-container/20 hover:scale-105 active:scale-95 transition-all">
            <Plus size={16} />
            CREATE PLAN
          </button>
        </div>

        {/* Plan Cards */}
        <div className="space-y-4 mb-6">
          {plans.length === 0 ? (
            <div className="rounded-[1.5rem] bg-ve-surface-container p-8 text-center text-sm text-ve-on-surface-variant">
              No plans yet. Create your first plan.
            </div>
          ) : (
            plans.map((plan, idx) => {
              const isActive = activeIds.has(plan.id)
              const memberCount = memberCountByPlan[plan.id] ?? 0
              const isEnterprise = idx === plans.length - 1 && plans.length > 1

              return (
                <div
                  key={plan.id}
                  className={`relative overflow-hidden rounded-[1.5rem] p-5 border transition-all active:scale-[0.98] ${
                    isEnterprise
                      ? 'bg-ve-secondary text-white border-transparent shadow-xl shadow-ve-secondary/20'
                      : 'bg-white border-ve-outline-variant/20 shadow-sm'
                  } ${!isActive ? 'opacity-70' : ''}`}
                >
                  {/* Decorative bg blob */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-ve-primary/5 rounded-full -mr-12 -mt-12 pointer-events-none" />

                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-xl font-bold ${isEnterprise ? 'text-white' : 'text-ve-primary'}`}>
                          {plan.name}
                        </h3>
                        {idx === 0 && plans.length > 1 && (
                          <span className="rounded-full bg-ve-primary/10 text-ve-primary px-2 py-0.5 text-[10px] font-bold tracking-widest">
                            POPULAR
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-black ${isEnterprise ? 'text-white' : 'text-ve-on-surface'}`}>
                          {fmt(plan.price)}
                        </span>
                        <span className={`text-sm ${isEnterprise ? 'text-white/60' : 'text-ve-on-surface-variant/60'}`}>
                          /{durationLabel(plan.duration)}
                        </span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col items-end gap-2">
                      {/* Toggle */}
                      <button
                        onClick={() => toggleActive(plan.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          isActive ? 'bg-ve-primary' : isEnterprise ? 'bg-white/20' : 'bg-ve-outline-variant/40'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                            isActive ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                      {/* Edit / Delete */}
                      <div className="flex gap-1">
                        <button className={`p-2 rounded-full transition-colors ${isEnterprise ? 'hover:bg-white/10' : 'hover:bg-ve-surface-container-high'}`}>
                          <Edit2 size={16} className={isEnterprise ? 'text-white' : 'text-ve-on-surface-variant'} />
                        </button>
                        <button className={`p-2 rounded-full transition-colors ${isEnterprise ? 'hover:bg-white/10 text-red-300' : 'hover:bg-ve-error/5 text-ve-error'}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className={`mt-4 pt-4 border-t flex items-center justify-between relative z-10 ${isEnterprise ? 'border-white/10' : 'border-ve-outline-variant/10'}`}>
                    <div className="flex items-center gap-2">
                      <Users size={14} className={isEnterprise ? 'text-white/70' : 'text-ve-on-surface-variant'} />
                      <span className={`text-xs font-bold ${isEnterprise ? 'text-white' : 'text-ve-on-surface-variant'}`}>
                        {memberCount} Active Members
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isEnterprise ? (
                        <BadgeCheck size={14} className="text-white/60" />
                      ) : (
                        <Clock size={14} className={`${isEnterprise ? 'text-white/60' : 'text-ve-on-surface-variant/60'}`} />
                      )}
                      <span className={`text-[10px] font-bold uppercase ${isEnterprise ? 'text-white/60' : 'text-ve-on-surface-variant/60'}`}>
                        {isEnterprise ? 'CUSTOM' : durationLabel(plan.duration).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Stats Bento */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          <div className="rounded-[1rem] bg-ve-surface-container-low p-4 border border-ve-outline-variant/10">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-ve-on-surface-variant mb-2">
              AVG REVENUE
            </span>
            <p className="text-2xl font-black text-ve-primary">{fmt(avgRevenue)}</p>
            <div className="flex items-center text-ve-primary text-[10px] font-bold mt-1">
              <TrendingUp size={12} className="mr-0.5" /> per plan
            </div>
          </div>
          <div className="rounded-[1rem] bg-ve-surface-container-low p-4 border border-ve-outline-variant/10">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-ve-on-surface-variant mb-2">
              TOTAL PLANS
            </span>
            <p className="text-2xl font-black text-ve-on-surface">{plans.length}</p>
            <div className="flex items-center text-ve-on-surface-variant text-[10px] font-bold mt-1">
              <BadgeCheck size={12} className="mr-0.5 text-ve-primary" /> {activeIds.size} active
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
