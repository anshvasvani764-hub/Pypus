'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, AlertTriangle, TrendingUp, CheckCircle2, XCircle, MoreVertical, ExternalLink } from 'lucide-react'
import MemberAvatar from '@/components/shared/MemberAvatar'
import type { Member, FeeRecord } from '@/lib/members/types'
import type { DerivedFeeStatus } from '@/lib/members/fee-status'
import { MarkPaidModal, type PaymentMethod } from '@/components/fees/MarkPaidModal'
import { PlanSelectorModal } from '@/components/members/PlanSelectorModal'
import { assignPlanToMember, markFeeAsPaid } from '@/app/actions/member-plan'

interface Props {
  member: Member
  workspaceSlug: string
  feeStatus: DerivedFeeStatus
  planName: string | null
  amount: number | null
  dueDate: string | null
  totalPaid: number
  totalPending: number
  fees: FeeRecord[]
  payableFeeId: string | null
  workspaceId: string
}

const TABS = ['Overview', 'Attendance', 'Fees'] as const
type Tab = typeof TABS[number]

function fmt(val: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function MemberProfileFeesView({
  member,
  workspaceSlug,
  feeStatus,
  planName,
  amount,
  dueDate,
  totalPaid,
  totalPending,
  fees: initialFees,
  payableFeeId,
  workspaceId,
}: Props) {
  const [activeTab] = useState<Tab>('Fees')
  const [fees, setFees] = useState<FeeRecord[]>(initialFees)
  const [markPaidOpen, setMarkPaidOpen] = useState(false)
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function flashToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  function mergeFee(fee: FeeRecord) {
    setFees((prev) =>
      prev.some((f) => f.id === fee.id)
        ? prev.map((f) => (f.id === fee.id ? fee : f))
        : [...prev, fee]
    )
  }

  async function handleMarkPaidConfirm(paidAmount: number, method: PaymentMethod) {
    if (!payableFeeId || busy) return
    setBusy(true)
    const result = await markFeeAsPaid({
      workspaceId,
      memberId: member.id,
      feeId: payableFeeId,
      amount: paidAmount,
      paymentMethod: method,
    })
    setBusy(false)
    setMarkPaidOpen(false)
    if (result.success && result.fee) {
      mergeFee(result.fee)
      flashToast(result.recorded ? 'Payment recorded' : 'Already paid up')
    } else {
      flashToast(result.error || 'Failed to mark as paid')
    }
  }

  async function handleAssignPlan(
    planId: string | null,
    newPlanName: string,
    planAmount: number,
    planDueDate: string
  ) {
    if (busy) return
    setBusy(true)
    const result = await assignPlanToMember({
      workspaceId,
      memberId: member.id,
      planId,
      planName: newPlanName,
      amount: planAmount,
      dueDate: planDueDate,
    })
    setBusy(false)
    setPlanModalOpen(false)
    if (result.success && result.fee) {
      mergeFee(result.fee)
      flashToast('Plan assigned')
    } else {
      flashToast(result.error || 'Failed to assign plan')
    }
  }

  const basePath = `/${workspaceSlug}/members/${member.id}`
  const tabHref: Record<Tab, string> = {
    Overview: basePath,
    Attendance: `${basePath}/attendance`,
    Fees: `${basePath}/fees`,
  }

  const isOverdue = feeStatus === 'overdue'

  const statusChipClass: Record<FeeRecord['status'], string> = {
    paid: 'bg-ve-primary/10 text-ve-primary border border-ve-primary/30',
    due: 'bg-ve-tertiary-container text-ve-on-tertiary-container border border-ve-tertiary/30',
    overdue: 'bg-ve-error-container text-ve-on-error-container border border-ve-error/30',
  }

  return (
    <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface pb-32">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-ve-surface/80 px-5 py-3 backdrop-blur-xl border-b border-ve-outline-variant/30 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href={`/${workspaceSlug}/members`}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-ve-primary/5 transition-colors active:scale-95"
          >
            <ArrowLeft size={20} className="text-ve-primary" />
          </Link>
          <span className="font-ve-headline-lg-mobile text-ve-primary font-black">Pypus</span>
        </div>
      </header>

      {/* Member Sub-header */}
      <section className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-4 mb-4">
          <MemberAvatar name={member.name} avatarUrl={member.avatar_url} size={56} />
          <div>
            <h2 className="text-xl font-bold text-ve-on-surface">{member.name}</h2>
            <p className="text-xs font-bold text-ve-on-surface-variant tracking-widest uppercase">
              Member ID: #{member.id.slice(-6).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1 p-1 bg-ve-surface-container-low rounded-xl mt-4 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <Link
              key={tab}
              href={tabHref[tab]}
              className={`flex-1 min-w-[90px] rounded-lg py-2.5 text-center text-xs font-bold transition-all ${
                activeTab === tab
                  ? 'bg-ve-primary-container text-ve-on-primary-container shadow-sm'
                  : 'text-ve-on-surface-variant/70 hover:bg-white/50'
              }`}
            >
              {tab}
            </Link>
          ))}
        </nav>
      </section>

      <main className="px-5 space-y-5">
        {/* Overdue Alert Banner */}
        {isOverdue && (
          <div className="flex items-center gap-3 rounded-[1rem] bg-ve-error-container border border-ve-error/20 p-4 shadow-lg animate-pulse">
            <AlertTriangle size={20} className="text-ve-error shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-ve-on-error-container">PAYMENT OVERDUE</p>
              <p className="text-xs text-ve-on-error-container/80">Due since {fmtDate(dueDate)}</p>
            </div>
            <button
              onClick={() => setMarkPaidOpen(true)}
              disabled={!payableFeeId || busy}
              className="rounded-full bg-ve-error text-white px-3 py-1 text-[10px] font-black uppercase tracking-wider disabled:opacity-40"
            >
              Pay Now
            </button>
          </div>
        )}

        {/* Financial Bento Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Current Plan — full width */}
          <div className="col-span-2 relative overflow-hidden rounded-[1.5rem] bg-ve-primary text-white p-5 shadow-xl shimmer-card">
            <div className="relative z-10">
              <p className="text-xs font-bold opacity-70 uppercase tracking-wider">Current Plan</p>
              <h3 className="text-xl font-black mt-1">{planName ?? 'No Plan'}</h3>
              <div className="flex items-center gap-1.5 mt-2">
                <CheckCircle2 size={14} className="opacity-80" />
                <span className="text-xs font-bold uppercase">Active Subscription</span>
              </div>
            </div>
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
              <TrendingUp size={120} />
            </div>
          </div>

          {/* Total Due */}
          <div className="flex flex-col justify-between rounded-[1rem] bg-ve-surface-container-high p-4 border border-ve-outline-variant/30 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ve-on-surface-variant">Total Due</p>
            <div className="mt-2">
              <p className="text-2xl font-black text-ve-primary">{fmt(totalPending)}</p>
              {isOverdue && (
                <p className="text-[10px] font-bold text-ve-error">+ Late Fee</p>
              )}
            </div>
          </div>

          {/* Next Due Date */}
          <div className="flex flex-col justify-between rounded-[1rem] bg-white p-4 border border-ve-outline-variant/30 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ve-on-surface-variant">Next Due</p>
            <div className="mt-2">
              <p className="text-lg font-black text-ve-on-surface">{fmtDate(dueDate)}</p>
              <p className="text-[10px] font-bold text-ve-on-surface-variant uppercase">
                {amount ? fmt(amount) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Lifetime Revenue — full width */}
          <div className="col-span-2 flex items-center justify-between rounded-[1.5rem] bg-ve-secondary text-white p-5 shadow-xl">
            <div>
              <p className="text-xs font-bold opacity-70 uppercase tracking-wider">Lifetime Paid</p>
              <p className="text-2xl font-black mt-1">{fmt(totalPaid)}</p>
            </div>
            <div className="rounded-xl bg-white/20 p-3 backdrop-blur-md">
              <TrendingUp size={28} className="text-white" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setMarkPaidOpen(true)}
            disabled={!payableFeeId || busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-[1rem] bg-ve-primary text-white font-bold py-4 shadow-lg active:scale-[0.98] transition-all disabled:opacity-40"
          >
            <CheckCircle2 size={18} />
            Mark as Paid
          </button>
          <button
            onClick={() => setPlanModalOpen(true)}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-[1rem] bg-white text-ve-primary border-2 border-ve-primary font-bold py-4 active:scale-[0.98] transition-all disabled:opacity-40"
          >
            {planName ? 'Change Plan' : 'Assign Plan'}
          </button>
        </div>

        {/* Fee History */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">Fee History</h3>
            <button className="flex items-center gap-1 text-ve-primary text-xs font-bold">
              View All <ExternalLink size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {fees.length === 0 ? (
              <div className="rounded-[1rem] bg-ve-surface-container p-6 text-center text-sm text-ve-on-surface-variant">
                No fee history yet.
              </div>
            ) : (
              fees.slice(0, 5).map((fee) => (
                <div
                  key={fee.id}
                  className="flex items-center justify-between rounded-[1rem] bg-white p-4 border border-ve-outline-variant/20 hover:bg-ve-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-full flex items-center justify-center ${
                      fee.status === 'paid' ? 'bg-ve-primary-container/20 text-ve-primary' : 'bg-ve-error-container/20 text-ve-error'
                    }`}>
                      {fee.status === 'paid'
                        ? <CheckCircle2 size={20} fill="currentColor" />
                        : <XCircle size={20} fill="currentColor" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ve-on-surface">{fee.plan_name_snapshot}</p>
                      <p className="text-xs text-ve-on-surface-variant">
                        {fee.status === 'paid' ? `Paid: ${fmtDate(fee.paid_date)}` : `Due: ${fmtDate(fee.due_date)}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-ve-on-surface">{fmt(fee.amount_snapshot)}</p>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${statusChipClass[fee.status]}`}>
                      {fee.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Financial Breakdown */}
        {fees.length > 0 && (
          <section className="rounded-[1.5rem] bg-ve-surface-container p-5 border border-ve-outline-variant/40 mb-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-ve-on-surface-variant mb-4">
              Financial Breakdown
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ve-on-surface-variant">Total Billed</span>
                <span className="font-bold">{fmt(fees.reduce((s, f) => s + f.amount_snapshot, 0))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ve-on-surface-variant">Total Paid</span>
                <span className="font-bold text-ve-primary">{fmt(totalPaid)}</span>
              </div>
              <div className="h-px bg-ve-outline-variant/30 my-3" />
              <div className="flex justify-between text-base">
                <span className="font-black">Balance Due</span>
                <span className={`font-black ${totalPending > 0 ? 'text-ve-error' : 'text-ve-primary'}`}>
                  {fmt(totalPending)}
                </span>
              </div>
            </div>
          </section>
        )}
      </main>

      <MarkPaidModal
        isOpen={markPaidOpen}
        onClose={() => setMarkPaidOpen(false)}
        onConfirm={handleMarkPaidConfirm}
        memberName={member.name}
        planName={planName}
        defaultAmount={amount ?? 0}
        dueDate={dueDate}
      />

      <PlanSelectorModal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        onSubmit={handleAssignPlan}
        workspaceId={workspaceId}
        memberName={member.name}
      />

      {toast && (
        <div className="fixed bottom-28 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-ve-on-surface px-5 py-2.5 text-xs font-bold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
