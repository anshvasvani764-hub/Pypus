'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Menu,
  Plus,
  TrendingUp,
  Edit2,
  Trash2,
  Users,
  Clock,
  BadgeCheck,
  X,
} from 'lucide-react'
import { useMobileNav } from '@/context/MobileNavContext'
import type { Plan, PlanDuration, Member } from '@/lib/members/types'
import { durationLabel, PLAN_DURATION_OPTIONS } from '@/lib/members/plan-duration'
import { savePlan, deletePlan } from '@/app/actions/settings'

interface Props {
  workspaceSlug: string
  workspaceId: string
  plans: Plan[]
  members: Member[]
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export function PlansManagementView({ workspaceSlug, workspaceId, plans: initialPlans, members }: Props) {
  const { open } = useMobileNav()
  const [plans, setPlans] = useState<Plan[]>(initialPlans)
  const [formOpen, setFormOpen] = useState(false)
  const [editPlan, setEditPlan] = useState<Plan | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const memberCountByPlan = useMemo(() => {
    const map: Record<string, number> = {}
    for (const m of members) {
      if (m.plan_id) map[m.plan_id] = (map[m.plan_id] ?? 0) + 1
    }
    return map
  }, [members])

  const totalRevenue = plans.reduce((s, p) => s + (p.price ?? 0) * (memberCountByPlan[p.id] ?? 0), 0)
  const avgRevenue = plans.length > 0 ? totalRevenue / plans.length : 0
  const activeCount = plans.filter((p) => p.status === 'active').length

  function openCreate() {
    setError(null)
    setEditPlan(null)
    setFormOpen(true)
  }

  function openEdit(plan: Plan) {
    setError(null)
    setEditPlan(plan)
    setFormOpen(true)
  }

  async function handleSave(data: {
    name: string
    duration: PlanDuration
    price: number
    features: string[]
    status: 'active' | 'inactive'
  }) {
    setError(null)
    const result = await savePlan({
      workspaceId,
      planId: editPlan?.id ?? null,
      ...data,
    })

    if (result.success && result.plan) {
      setPlans((prev) => {
        const exists = prev.some((p) => p.id === result.plan!.id)
        return exists
          ? prev.map((p) => (p.id === result.plan!.id ? result.plan! : p))
          : [...prev, result.plan!]
      })
      setFormOpen(false)
      setEditPlan(null)
    } else {
      setError(result.error ?? 'Failed to save plan')
    }
  }

  async function handleToggleStatus(plan: Plan) {
    setError(null)
    setBusyId(plan.id)
    const result = await savePlan({
      workspaceId,
      planId: plan.id,
      name: plan.name,
      duration: plan.duration,
      price: plan.price,
      status: plan.status === 'active' ? 'inactive' : 'active',
    })
    setBusyId(null)

    if (result.success && result.plan) {
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? result.plan! : p)))
    } else {
      setError(result.error ?? 'Failed to update plan')
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return
    setError(null)
    setBusyId(deleteTarget.id)
    const result = await deletePlan({ workspaceId, planId: deleteTarget.id })
    setBusyId(null)

    if (result.success) {
      setPlans((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      setDeleteTarget(null)
    } else {
      setError(result.error ?? 'Failed to delete plan')
      setDeleteTarget(null)
    }
  }

  return (
    <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface pb-6">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-ve-surface/80 px-5 py-3 backdrop-blur-xl border-b border-ve-outline-variant/30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={open}
            aria-label="Open menu"
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-ve-primary/5 transition-colors active:scale-95"
          >
            <Menu size={20} className="text-ve-primary" />
          </button>
          <Link
            href={`/${workspaceSlug}/fees`}
            aria-label="Back to fees"
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-ve-primary/5 transition-colors active:scale-95"
          >
            <ArrowLeft size={20} className="text-ve-primary" />
          </Link>
          <span className="font-ve-headline-lg-mobile text-ve-primary font-black">Pypus</span>
        </div>
      </header>

      <main className="px-5 pt-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ve-on-surface">Plans</h1>
            <p className="text-sm text-ve-on-surface-variant/70 mt-0.5">Manage your subscription plans</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-full bg-ve-primary-container text-ve-on-primary-container font-bold text-xs px-5 py-3 min-h-[44px] shadow-lg shadow-ve-primary-container/20 active:scale-95 transition-all shrink-0"
          >
            <Plus size={16} />
            CREATE PLAN
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Plan Cards */}
        <div className="space-y-4 mb-6">
          {plans.length === 0 ? (
            <div className="rounded-[1.5rem] bg-ve-surface-container p-8 text-center text-sm text-ve-on-surface-variant">
              No plans yet. Create your first plan.
            </div>
          ) : (
            plans.map((plan, idx) => {
              const isActive = plan.status === 'active'
              const memberCount = memberCountByPlan[plan.id] ?? 0
              const isBusy = busyId === plan.id

              return (
                <div
                  key={plan.id}
                  className={`relative overflow-hidden rounded-[1.5rem] p-5 border transition-all bg-white border-ve-outline-variant/20 shadow-sm ${
                    !isActive ? 'opacity-70' : ''
                  } ${isBusy ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-ve-primary/5 rounded-full -mr-12 -mt-12 pointer-events-none" />

                  <div className="flex items-start justify-between relative z-10 gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-xl font-bold text-ve-primary truncate">
                          {plan.name}
                        </h3>
                        {idx === 0 && plans.length > 1 && (
                          <span className="rounded-full bg-ve-primary/10 text-ve-primary px-2 py-0.5 text-[10px] font-bold tracking-widest shrink-0">
                            POPULAR
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-ve-on-surface">
                          {fmt(plan.price)}
                        </span>
                        <span className="text-sm text-ve-on-surface-variant/60">
                          /{durationLabel(plan.duration)}
                        </span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(plan)}
                        disabled={isBusy}
                        aria-label={isActive ? 'Deactivate plan' : 'Activate plan'}
                        aria-pressed={isActive}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                          isActive ? 'bg-ve-primary' : 'bg-ve-outline-variant/40'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                            isActive ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(plan)}
                          aria-label={`Edit ${plan.name}`}
                          className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-ve-surface-container-high active:scale-95"
                        >
                          <Edit2 size={16} className="text-ve-on-surface-variant" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(plan)}
                          aria-label={`Delete ${plan.name}`}
                          className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-ve-error/5 text-ve-error active:scale-95"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex items-center justify-between relative z-10 border-ve-outline-variant/10">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-ve-on-surface-variant" />
                      <span className="text-xs font-bold text-ve-on-surface-variant">
                        {memberCount} Active Member{memberCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} className="text-ve-on-surface-variant/60" />
                      <span className="text-[10px] font-bold uppercase text-ve-on-surface-variant/60">
                        {durationLabel(plan.duration).toUpperCase()}
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
              <BadgeCheck size={12} className="mr-0.5 text-ve-primary" /> {activeCount} active
            </div>
          </div>
        </div>
      </main>

      {formOpen && (
        <PlanFormSheet
          editPlan={editPlan}
          onClose={() => {
            setFormOpen(false)
            setEditPlan(null)
          }}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-sm rounded-[1.5rem] bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-ve-on-surface">Delete {deleteTarget.name}?</h2>
            <p className="mt-2 text-sm text-ve-on-surface-variant">
              This can&apos;t be undone. Members already on this plan keep their existing fee records.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 min-h-[44px] rounded-full border border-ve-outline-variant/40 text-sm font-bold text-ve-on-surface-variant active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                disabled={busyId === deleteTarget.id}
                className="flex-1 min-h-[44px] rounded-full bg-ve-error text-white text-sm font-bold active:scale-95 transition-all disabled:opacity-60"
              >
                {busyId === deleteTarget.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PlanFormSheet({
  editPlan,
  onClose,
  onSave,
}: {
  editPlan: Plan | null
  onClose: () => void
  onSave: (data: {
    name: string
    duration: PlanDuration
    price: number
    features: string[]
    status: 'active' | 'inactive'
  }) => Promise<void>
}) {
  const [name, setName] = useState(editPlan?.name ?? '')
  const [duration, setDuration] = useState<PlanDuration>(editPlan?.duration ?? '1')
  const [price, setPrice] = useState(editPlan ? String(editPlan.price) : '')
  const [features, setFeatures] = useState(editPlan?.features.join('\n') ?? '')
  const [status, setStatus] = useState<'active' | 'inactive'>(editPlan?.status ?? 'active')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    const numericPrice = Number(price)

    if (!trimmedName) {
      setFormError('Plan name is required')
      return
    }
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setFormError('Enter a valid price')
      return
    }

    setFormError(null)
    setSaving(true)
    await onSave({
      name: trimmedName,
      duration,
      price: numericPrice,
      features: features
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean),
      status,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40">
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[1.5rem] sm:rounded-[1.5rem] bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-5 py-4 border-b border-ve-outline-variant/10">
          <h2 className="text-base font-bold text-ve-on-surface">
            {editPlan ? 'Edit Plan' : 'Create Plan'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ve-on-surface-variant hover:bg-ve-surface-container transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {formError}
            </div>
          )}

          <div>
            <label htmlFor="plan-name" className="block text-sm font-medium text-ve-on-surface mb-1">
              Plan Name
            </label>
            <input
              id="plan-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Gold Plan"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-ve-outline-variant/40 bg-white text-sm text-ve-on-surface placeholder:text-ve-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-ve-primary/30 focus:border-ve-primary transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="plan-duration" className="block text-sm font-medium text-ve-on-surface mb-1">
                Duration
              </label>
              <select
                id="plan-duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-ve-outline-variant/40 bg-white text-sm text-ve-on-surface focus:outline-none focus:ring-2 focus:ring-ve-primary/30 focus:border-ve-primary transition-all"
              >
                {PLAN_DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="plan-price" className="block text-sm font-medium text-ve-on-surface mb-1">
                Price (₹)
              </label>
              <input
                id="plan-price"
                type="number"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min="0"
                placeholder="4999"
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-ve-outline-variant/40 bg-white text-sm text-ve-on-surface placeholder:text-ve-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-ve-primary/30 focus:border-ve-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="plan-features" className="block text-sm font-medium text-ve-on-surface mb-1">
              Features (one per line)
            </label>
            <textarea
              id="plan-features"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              rows={4}
              placeholder={'Unlimited gym access\nPersonal training\nNutrition consultation'}
              className="w-full px-4 py-2.5 rounded-xl border border-ve-outline-variant/40 bg-white text-sm text-ve-on-surface placeholder:text-ve-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-ve-primary/30 focus:border-ve-primary transition-all resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-ve-on-surface">Status</span>
            <button
              type="button"
              onClick={() => setStatus(status === 'active' ? 'inactive' : 'active')}
              aria-pressed={status === 'active'}
              aria-label="Toggle plan status"
              className={`relative w-12 h-7 rounded-full transition-colors ${
                status === 'active' ? 'bg-ve-primary' : 'bg-ve-outline-variant/40'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                  status === 'active' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-xs text-ve-on-surface-variant">
              {status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>

          <p className="text-xs text-ve-on-surface-variant/70">
            Changing a plan price does not retroactively affect existing member subscriptions.
          </p>

          <div className="-mx-5 -mb-5 mt-5 flex items-center gap-3 px-5 py-4 border-t border-ve-outline-variant/10 bg-ve-surface-container-low/60">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] rounded-full text-sm font-bold text-ve-on-surface-variant border border-ve-outline-variant/40 bg-white active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 min-h-[44px] rounded-full text-sm font-bold bg-ve-primary text-white active:scale-95 transition-all disabled:opacity-60"
            >
              {saving ? 'Saving…' : editPlan ? 'Save Changes' : 'Save Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
