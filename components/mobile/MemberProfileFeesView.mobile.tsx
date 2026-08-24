'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Menu, AlertTriangle, TrendingUp, CheckCircle2, XCircle, MoreVertical, ExternalLink, Pencil, Phone } from 'lucide-react'
import { useMobileNav } from '@/context/MobileNavContext'
import type { Member, FeeRecord } from '@/lib/members/types'
import type { DerivedFeeStatus } from '@/lib/members/fee-status'
import { MarkPaidModal, type PaymentMethod } from '@/components/fees/MarkPaidModal'
import { PlanSelectorModal } from '@/components/members/PlanSelectorModal'
import { assignPlanToMember, markFeeAsPaid } from '@/app/actions/member-plan'
import { createClient } from '@/lib/supabase/client'
import { EditFeeModal } from '@/components/records/EditFeeModal'

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
  const { open } = useMobileNav()
  const [activeTab] = useState<Tab>('Fees')
  const [fees, setFees] = useState<FeeRecord[]>(initialFees)
  const [markPaidOpen, setMarkPaidOpen] = useState(false)
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [workspaceName, setWorkspaceName] = useState('')
  const [editingFee, setEditingFee] = useState<FeeRecord | null>(null)

  useEffect(() => {
    async function fetchWorkspaceName() {
      try {
        const supabase = createClient()
        const { data: wsData } = await supabase
          .from('workspaces')
          .select('name')
          .eq('id', workspaceId)
          .single()
        if (wsData) {
          setWorkspaceName(wsData.name)
        }
      } catch (err) {
        console.error('Failed to fetch workspace name:', err)
      }
    }
    fetchWorkspaceName()
  }, [workspaceId])

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
    if (!payableFeeId || busy) return { success: false, error: 'Invalid state' }
    setBusy(true)
    const result = await markFeeAsPaid({
      workspaceId,
      memberId: member.id,
      feeId: payableFeeId,
      amount: paidAmount,
      paymentMethod: method,
    })
    setBusy(false)
    if (result.success && result.fee) {
      mergeFee(result.fee)
      flashToast(
        !result.recorded
          ? 'Already paid up'
          : result.fee.status === 'paid'
            ? 'Payment recorded — fully paid'
            : 'Partial payment recorded'
      )
    } else {
      flashToast(result.error || 'Failed to mark as paid')
    }
    return result
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

  const initials = member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const feeStatusColors: Record<DerivedFeeStatus, string> = {
    paid: 'bg-ve-primary/10 text-ve-primary border-ve-primary/20',
    due: 'bg-ve-tertiary-container text-ve-on-tertiary-container border-ve-tertiary/20',
    overdue: 'bg-ve-error-container text-ve-on-error-container border-ve-error/20',
    no_plan: 'bg-ve-surface-container text-ve-on-surface-variant border-ve-outline-variant/20',
  }

  const feeLabel: Record<DerivedFeeStatus, string> = {
    paid: 'Paid',
    due: 'Due',
    overdue: 'Overdue',
    no_plan: 'No Plan',
  }

  const statusChipClass: Record<FeeRecord['status'], string> = {
    paid: 'bg-ve-primary/10 text-ve-primary border border-ve-primary/30',
    due: 'bg-ve-tertiary-container text-ve-on-tertiary-container border border-ve-tertiary/30',
    overdue: 'bg-ve-error-container text-ve-on-error-container border border-ve-error/30',
  }

  return (
    <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface pb-6">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-ve-surface/80 px-4 py-2.5 backdrop-blur-xl border-b border-ve-outline-variant/30 shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            onClick={open}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-ve-primary/5 transition-colors active:scale-95"
          >
            <Menu size={18} className="text-ve-primary" />
          </button>
          <Link
            href={`/${workspaceSlug}/members`}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-ve-primary/5 transition-colors active:scale-95"
          >
            <ArrowLeft size={18} className="text-ve-primary" />
          </Link>
          <span className="font-ve-headline-lg-mobile text-ve-primary font-black text-[15px]">Pypus</span>
        </div>
      </header>

      {/* Profile Hero */}
      <section className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-4 mb-3">
          <div className="relative shrink-0">
            <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-white shadow-lg rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.name}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-full w-full bg-ve-secondary-container flex items-center justify-center text-ve-on-secondary-container font-black text-xl">
                  {initials}
                </div>
              )}
            </div>
            {feeStatus === 'paid' && (
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-ve-primary-container border-2 border-white flex items-center justify-center shadow-md">
                <CheckCircle2 size={12} className="text-ve-on-primary-container" fill="currentColor" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-black text-xl leading-tight text-ve-on-surface truncate">{member.name}</h1>
            <p className="flex items-center gap-1.5 text-[12px] text-ve-on-surface-variant mt-0.5">
              <Phone size={12} />
              {member.phone || 'No phone'}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {planName && (
                <span className="rounded-full bg-ve-primary/10 border border-ve-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-ve-primary">
                  {planName}
                </span>
              )}
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${feeStatusColors[feeStatus]}`}>
                {feeLabel[feeStatus]}
              </span>
              {member.trainer_name && (
                <span className="rounded-full bg-ve-secondary-container/20 border border-ve-secondary/20 px-2.5 py-0.5 text-[10px] font-bold text-ve-secondary">
                  {member.trainer_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1 p-1 bg-ve-surface-container-low rounded-xl overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <Link
              key={tab}
              href={tabHref[tab]}
              className={`flex-1 min-w-[90px] rounded-lg py-2 text-center text-[11px] font-bold transition-all ${
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

      <main className="px-4 space-y-4">
        {/* Overdue Alert Banner */}
        {isOverdue && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-ve-error-container border border-ve-error/20 p-3 shadow-lg animate-pulse">
            <AlertTriangle size={18} className="text-ve-error shrink-0" />
            <div className="flex-1">
              <p className="text-[11px] font-bold text-ve-on-error-container">PAYMENT OVERDUE</p>
              <p className="text-[11px] text-ve-on-error-container/80">Due since {fmtDate(dueDate)}</p>
            </div>
            <button
              onClick={() => setMarkPaidOpen(true)}
              disabled={!payableFeeId || busy}
              className="rounded-full bg-ve-error text-white px-2.5 py-1 text-[9px] font-black uppercase tracking-wider disabled:opacity-40"
            >
              Pay Now
            </button>
          </div>
        )}

        {/* Financial Bento Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Current Plan — full width */}
          <div className="col-span-2 relative overflow-hidden rounded-2xl bg-ve-primary text-white p-3.5 shadow-xl shimmer-card">
            <div className="relative z-10">
              <p className="text-[10px] font-bold opacity-70 uppercase tracking-wider">Current Plan</p>
              <h3 className="text-[16px] font-black mt-0.5">{planName ?? 'No Plan'}</h3>
              <div className="flex items-center gap-1.5 mt-1.5">
                <CheckCircle2 size={12} className="opacity-80" />
                <span className="text-[10px] font-bold uppercase">Active Subscription</span>
              </div>
            </div>
            <div className="absolute right-[-16px] bottom-[-16px] opacity-10">
              <TrendingUp size={90} />
            </div>
          </div>

          {/* Total Due */}
          <div className="flex flex-col justify-between rounded-2xl bg-ve-surface-container-high p-3 border border-ve-outline-variant/30 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-wider text-ve-on-surface-variant">Total Due</p>
            <div className="mt-1.5">
              <p className="text-[18px] font-black text-ve-primary">{fmt(totalPending)}</p>
              {isOverdue && (
                <p className="text-[9px] font-bold text-ve-error">+ Late Fee</p>
              )}
            </div>
          </div>

          {/* Next Due Date */}
          <div className="flex flex-col justify-between rounded-2xl bg-white p-3 border border-ve-outline-variant/30 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-wider text-ve-on-surface-variant">Next Due</p>
            <div className="mt-1.5">
              <p className="text-[14px] font-black text-ve-on-surface">{fmtDate(dueDate)}</p>
              <p className="text-[9px] font-bold text-ve-on-surface-variant uppercase">
                {amount ? fmt(amount) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Lifetime Revenue — full width */}
          <div className="col-span-2 flex items-center justify-between rounded-2xl bg-ve-secondary text-white p-3.5 shadow-xl">
            <div>
              <p className="text-[10px] font-bold opacity-70 uppercase tracking-wider">Lifetime Paid</p>
              <p className="text-[18px] font-black mt-0.5">{fmt(totalPaid)}</p>
            </div>
            <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-md">
              <TrendingUp size={22} className="text-white" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5">
          <button
            onClick={() => setMarkPaidOpen(true)}
            disabled={!payableFeeId || busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ve-primary text-white font-bold py-3 shadow-lg active:scale-[0.98] transition-all disabled:opacity-40 text-[13px]"
          >
            <CheckCircle2 size={16} />
            Mark as Paid
          </button>
          <button
            onClick={() => setPlanModalOpen(true)}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white text-ve-primary border-2 border-ve-primary font-bold py-3 active:scale-[0.98] transition-all disabled:opacity-40 text-[13px]"
          >
            {planName ? 'Change Plan' : 'Assign Plan'}
          </button>
        </div>

        {/* Fee History */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[13px] font-bold">Fee History</h3>
            <button className="flex items-center gap-1 text-ve-primary text-[11px] font-bold">
              View All <ExternalLink size={11} />
            </button>
          </div>
          <div className="space-y-2">
            {fees.length === 0 ? (
              <div className="rounded-2xl bg-ve-surface-container p-6 text-center text-[13px] text-ve-on-surface-variant">
                No fee history yet.
              </div>
            ) : (
              fees.slice(0, 5).map((fee) => (
                <div
                  key={fee.id}
                  className="flex items-center justify-between rounded-2xl bg-white p-3 border border-ve-outline-variant/20 hover:bg-ve-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      fee.status === 'paid' ? 'bg-ve-primary-container/20 text-ve-primary' : 'bg-ve-error-container/20 text-ve-error'
                    }`}>
                      {fee.status === 'paid'
                        ? <CheckCircle2 size={18} fill="currentColor" />
                        : <XCircle size={18} fill="currentColor" />}
                    </div>
                    <div>
                      <p className="text-[12.5px] font-bold text-ve-on-surface">{fee.plan_name_snapshot}</p>
                      <p className="text-[11px] text-ve-on-surface-variant">
                        {fee.status === 'paid' ? `Paid: ${fmtDate(fee.paid_date)}` : `Due: ${fmtDate(fee.due_date)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="text-right">
                      <p className="text-[12.5px] font-bold text-ve-on-surface">{fmt(fee.amount_snapshot)}</p>
                      {fee.status !== 'paid' && (fee.paid_amount ?? 0) > 0 && (
                        <p className="text-[9px] font-bold text-amber-600">
                          Paid {fmt(fee.paid_amount ?? 0)} · Pending {fmt(fee.amount_snapshot - (fee.paid_amount ?? 0))}
                        </p>
                      )}
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${statusChipClass[fee.status]}`}>
                        {fee.status}
                      </span>
                    </div>
                    <button
                      onClick={() => setEditingFee(fee)}
                      className="h-8 w-8 rounded-full flex items-center justify-center text-ve-on-surface-variant hover:text-ve-primary hover:bg-ve-primary/5 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Financial Breakdown */}
        {fees.length > 0 && (
          <section className="rounded-2xl bg-ve-surface-container p-3.5 border border-ve-outline-variant/40 mb-4">
            <h4 className="text-[9px] font-bold uppercase tracking-widest text-ve-on-surface-variant mb-3">
              Financial Breakdown
            </h4>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[12px]">
                <span className="text-ve-on-surface-variant">Total Billed</span>
                <span className="font-bold">{fmt(fees.reduce((s, f) => s + f.amount_snapshot, 0))}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-ve-on-surface-variant">Total Paid</span>
                <span className="font-bold text-ve-primary">{fmt(totalPaid)}</span>
              </div>
              <div className="h-px bg-ve-outline-variant/30 my-2.5" />
              <div className="flex justify-between text-[14px]">
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
        memberPhone={member.phone}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        planName={planName}
        amountSnapshot={amount ?? 0}
        alreadyPaid={fees.find((f) => f.id === payableFeeId)?.paid_amount ?? 0}
        dueDate={dueDate}
      />

      <PlanSelectorModal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        onSubmit={handleAssignPlan}
        workspaceId={workspaceId}
        memberName={member.name}
      />

      <EditFeeModal
        isOpen={editingFee !== null}
        onClose={() => setEditingFee(null)}
        record={editingFee}
        workspaceId={workspaceId}
        memberId={member.id}
        onSaved={(updated) => {
          mergeFee(updated)
          flashToast('Fee record updated')
        }}
      />

      {toast && (
        <div className="fixed bottom-28 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-ve-on-surface px-5 py-2.5 text-xs font-bold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}