'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, Wallet, Clock, TrendingUp, MoreVertical,
  CheckCircle2, Settings2, UserX, AlertCircle,
} from 'lucide-react'
import type { Member, FeeRecord } from '@/lib/members/types'
import type { DerivedFeeStatus } from '@/lib/members/fee-status'
import { MobileTopBar } from '@/components/mobile/MobileTopBar'
import { MarkPaidModal, type PaymentMethod } from '@/components/fees/MarkPaidModal'
import { PlanSelectorModal } from '@/components/members/PlanSelectorModal'
import { assignPlanToMember, markFeeAsPaid } from '@/app/actions/member-plan'
import MemberAvatar from '@/components/shared/MemberAvatar'

interface MemberFeeRow {
  member: Member
  feeStatus: DerivedFeeStatus
  planName: string | null
  amount: number | null
  dueDate: string | null
  payableFeeId: string | null
}

interface Props {
  workspaceSlug: string
  workspaceId: string
  workspaceName: string
  rows: MemberFeeRow[]
  monthlyCollection: number
  pendingDues: number
  expectedTotal: number
  overdueCount: number
}

type Filter = 'All' | 'Paid' | 'Due' | 'Overdue' | 'No Plan'
const FILTERS: Filter[] = ['All', 'Paid', 'Due', 'Overdue', 'No Plan']

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const STATUS_MAP: Record<DerivedFeeStatus, Filter> = {
  paid: 'Paid',
  due: 'Due',
  overdue: 'Overdue',
  no_plan: 'No Plan',
}

const CHIP_COLORS: Record<DerivedFeeStatus, string> = {
  paid: 'bg-ve-primary/10 text-ve-primary',
  due: 'bg-ve-tertiary-container text-ve-on-tertiary-container',
  overdue: 'bg-ve-error-container text-ve-on-error-container',
  no_plan: 'bg-ve-surface-container text-ve-on-surface-variant',
}

export function FeesDashboardView({
  workspaceSlug,
  workspaceId,
  workspaceName,
  rows,
  monthlyCollection,
  pendingDues,
  expectedTotal,
  overdueCount,
}: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('All')
  const [query, setQuery] = useState('')
  const [markPaidRow, setMarkPaidRow] = useState<MemberFeeRow | null>(null)
  const [planRow, setPlanRow] = useState<MemberFeeRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function flashToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  async function handleMarkPaidConfirm(amount: number, method: PaymentMethod) {
    if (!markPaidRow?.payableFeeId || busy) return { success: false, error: "Invalid state" };
    setBusy(true)
    const result = await markFeeAsPaid({
      workspaceId,
      memberId: markPaidRow.member.id,
      feeId: markPaidRow.payableFeeId,
      amount,
      paymentMethod: method,
    })
    setBusy(false)
    if (result.success) {
      flashToast(result.recorded ? 'Payment recorded' : 'Already paid up')
      router.refresh()
    } else {
      flashToast(result.error || 'Failed to mark as paid')
    }
    return result;
  }

  async function handleAssignPlan(
    planId: string | null,
    planName: string,
    amount: number,
    dueDate: string
  ) {
    if (!planRow || busy) return
    setBusy(true)
    const result = await assignPlanToMember({
      workspaceId,
      memberId: planRow.member.id,
      planId,
      planName,
      amount,
      dueDate,
    })
    setBusy(false)
    setPlanRow(null)
    if (result.success) {
      flashToast('Plan assigned')
      router.refresh()
    } else {
      flashToast(result.error || 'Failed to assign plan')
    }
  }

  const filtered = rows.filter((r) => {
    const matchFilter = filter === 'All' || STATUS_MAP[r.feeStatus] === filter
    const matchQuery =
      query === '' ||
      r.member.name.toLowerCase().includes(query.toLowerCase()) ||
      r.member.id.toLowerCase().includes(query.toLowerCase())
    return matchFilter && matchQuery
  })

  const collectionRate = expectedTotal > 0
    ? Math.round((monthlyCollection / expectedTotal) * 100)
    : 0

  return (
    <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface pb-6">
      <MobileTopBar
        title="Fees"
        label="Pypus"
        workspaceSlug={workspaceSlug}
        backHref={`/${workspaceSlug}/workspace`}
      />

      <main className="px-5 pt-5">
        {/* Snapshot Cards */}
        <div className="flex flex-col gap-3 mb-6">
          {/* Monthly Collection */}
          <div className="relative overflow-hidden rounded-[1.5rem] bg-ve-primary-container text-ve-on-primary-container p-5 shadow-[0_8px_24px_-8px_rgba(0,110,22,0.3)] group hover:scale-[1.02] transition-transform duration-200">
            <div className="flex items-start justify-between z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Monthly Collection</span>
              <Wallet size={20} />
            </div>
            <div className="text-3xl font-black mt-2 z-10">{fmt(monthlyCollection)}</div>
            <div className="flex items-center gap-1 mt-1 z-10">
              <TrendingUp size={14} />
              <span className="text-[11px] font-bold">{collectionRate}% Collection Rate</span>
            </div>
            <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Pending Dues */}
            <div className="relative overflow-hidden rounded-[1.5rem] bg-ve-secondary-container text-ve-on-secondary-container p-5 shadow-[0_8px_24px_-8px_rgba(70,72,212,0.3)] group hover:scale-[1.02] transition-transform duration-200">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Pending</span>
                <Clock size={16} />
              </div>
              <div className="text-2xl font-black mt-2">{fmt(pendingDues)}</div>
              <div className="text-[11px] font-bold mt-1 opacity-80">{overdueCount} overdue</div>
              <div className="absolute -right-4 -bottom-4 h-20 w-20 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            </div>

            {/* Expected */}
            <div className="relative overflow-hidden rounded-[1.5rem] bg-ve-tertiary-container text-ve-on-tertiary-container p-5 shadow-[0_8px_24px_-8px_rgba(133,83,0,0.2)] group hover:scale-[1.02] transition-transform duration-200">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Expected</span>
                <TrendingUp size={16} />
              </div>
              <div className="text-2xl font-black mt-2">{fmt(expectedTotal)}</div>
              <div className="text-[11px] font-bold mt-1 opacity-80">This month</div>
              <div className="absolute -right-4 -bottom-4 h-20 w-20 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 rounded-xl bg-ve-surface-container px-4 py-3 mb-4 border-2 border-transparent focus-within:border-ve-primary transition-all">
          <Search size={18} className="text-ve-outline shrink-0" />
          <input
            className="bg-transparent border-none focus:ring-0 w-full text-sm text-ve-on-surface placeholder:text-ve-outline outline-none"
            placeholder="Search members…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 mb-5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-95 ${
                filter === f
                  ? 'bg-ve-primary text-white shadow-md'
                  : 'bg-ve-surface-container-high text-ve-on-surface-variant hover:bg-ve-surface-container-highest'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-ve-on-surface">
            {filter === 'All' ? 'All Members' : filter} ({filtered.length})
          </h2>
          <Link
            href={`/${workspaceSlug}/fees/plans`}
            className="flex items-center gap-1 text-ve-primary text-xs font-bold px-3 py-2 rounded-lg hover:bg-ve-primary/5 transition-colors"
          >
            <Settings2 size={14} />
            Manage Plans
          </Link>
        </div>

        {/* Payment Cards */}
        <div className="flex flex-col gap-3 pb-4">
          {filtered.length === 0 ? (
            <div className="rounded-[1rem] bg-ve-surface-container p-8 text-center text-sm text-ve-on-surface-variant">
              No members match this filter.
            </div>
          ) : (
            filtered.map((row) => {
              const { member, feeStatus, planName, amount, dueDate, payableFeeId } = row
              return (
              <div
                key={member.id}
                className={`flex items-center justify-between rounded-[1rem] bg-white p-4 shadow-sm border transition-shadow hover:shadow-md ${
                  feeStatus === 'overdue'
                    ? 'border-ve-error/20'
                    : feeStatus === 'no_plan'
                    ? 'border-dashed border-ve-outline-variant'
                    : 'border-ve-outline-variant/30'
                }`}
              >
                <Link
                  href={`/${workspaceSlug}/members/${member.id}/fees`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-ve-surface-container-high border-2 border-white shadow-sm shrink-0 flex items-center justify-center">
                    {feeStatus === 'no_plan' ? (
                      <UserX size={20} className="text-ve-outline" />
                    ) : (
                      <MemberAvatar
                        name={member.name}
                        avatarUrl={member.avatar_url}
                        size={48}
                        fallbackClassName="bg-ve-secondary-container text-ve-on-secondary-container"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ve-on-surface truncate">{member.name}</p>
                    <p className="text-[11px] text-ve-outline truncate">
                      {planName ?? 'No active subscription'} {amount ? `• ${fmt(amount)}` : ''}
                    </p>
                  </div>
                </Link>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${CHIP_COLORS[feeStatus]}`}>
                      {feeStatus === 'no_plan' ? 'No Plan' : feeStatus === 'overdue' ? 'Overdue' : feeStatus === 'due' ? `Due ${fmtDate(dueDate)}` : 'Paid'}
                    </span>
                    {(feeStatus === 'overdue' || feeStatus === 'due') && payableFeeId && (
                      <button
                        onClick={() => setMarkPaidRow(row)}
                        disabled={busy}
                        className="mt-1.5 block w-full bg-ve-primary text-white font-bold text-[10px] px-3 py-1.5 rounded-full text-center active:scale-95 transition-all disabled:opacity-40"
                      >
                        Mark Paid
                      </button>
                    )}
                    {feeStatus === 'no_plan' && (
                      <button
                        onClick={() => setPlanRow(row)}
                        disabled={busy}
                        className="mt-1.5 block w-full bg-ve-secondary text-white font-bold text-[10px] px-3 py-1.5 rounded-full text-center active:scale-95 transition-all disabled:opacity-40"
                      >
                        Assign Plan
                      </button>
                    )}
                  </div>
                </div>
              </div>
              )
            })
          )}
        </div>
      </main>

      <MarkPaidModal
        isOpen={markPaidRow !== null}
        onClose={() => setMarkPaidRow(null)}
        onConfirm={handleMarkPaidConfirm}
        memberName={markPaidRow?.member.name ?? ''}
        memberPhone={markPaidRow?.member.phone ?? ''}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        planName={markPaidRow?.planName ?? null}
        defaultAmount={markPaidRow?.amount ?? 0}
        dueDate={markPaidRow?.dueDate ?? null}
      />

      <PlanSelectorModal
        isOpen={planRow !== null}
        onClose={() => setPlanRow(null)}
        onSubmit={handleAssignPlan}
        workspaceId={workspaceId}
        memberName={planRow?.member.name}
      />

      {toast && (
        <div className="fixed bottom-28 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-ve-on-surface px-5 py-2.5 text-xs font-bold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
