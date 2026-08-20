'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Menu, Phone, Mail, Users, Verified, BellRing, CreditCard, Plus, MoreVertical, CalendarCheck2, Pencil, Trash2 } from 'lucide-react'
import { useMobileNav } from '@/context/MobileNavContext'
import type { Member, FeeRecord } from '@/lib/members/types'
import type { DerivedFeeStatus } from '@/lib/members/fee-status'
import { MarkPaidModal, type PaymentMethod } from '@/components/fees/MarkPaidModal'
import { markFeeAsPaid } from '@/app/actions/member-plan'
import { sendReminder } from '@/app/actions/member-reminders'
import MemberAvatar from '@/components/shared/MemberAvatar'
import { EditMemberDialog } from '@/components/members/EditMemberDialog'
import { DeleteMemberDialog } from '@/components/members/DeleteMemberDialog'

interface Props {
  member: Member
  workspaceSlug: string
  workspaceId: string
  workspaceName: string
  feeStatus: DerivedFeeStatus
  planName: string | null
  amount: number | null
  dueDate: string | null
  payableFeeId: string | null
  fees: FeeRecord[]
}

const TABS = ['Overview', 'Attendance', 'Fees'] as const
type Tab = typeof TABS[number]

export function MemberProfileOverviewView({
  member,
  workspaceSlug,
  workspaceId,
  workspaceName,
  feeStatus,
  planName,
  amount,
  dueDate,
  payableFeeId,
}: Props) {
  const router = useRouter()
  const { open: openNav } = useMobileNav()
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [markPaidOpen, setMarkPaidOpen] = useState(false)
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function flashToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
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
    if (result.success) {
      flashToast(result.recorded ? 'Payment recorded' : 'Already paid up')
      router.refresh()
    } else {
      flashToast(result.error || 'Failed to mark as paid')
    }
    return result
  }

  async function handleRemind() {
    if (busy) return
    setBusy(true)
    const result = await sendReminder({
      workspaceId,
      memberId: member.id,
      memberPhone: member.phone,
      memberName: member.name,
      workspaceName,
      feeId: payableFeeId,
      type: 'fees',
    })
    setBusy(false)
    if (result.success && result.url) {
      window.open(result.url, '_blank', 'noopener,noreferrer')
      flashToast('Reminder sent')
    } else {
      flashToast(result.error || 'Failed to send reminder')
    }
  }

  const basePath = `/${workspaceSlug}/members/${member.id}`

  const tabHref: Record<Tab, string> = {
    Overview: basePath,
    Attendance: `${basePath}/attendance`,
    Fees: `${basePath}/fees`,
  }

  const initials = member.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

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

  const joinedDate = new Date(member.joined_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  // Stub notes — in production these would come from the DB
  const notes = [
    {
      date: joinedDate,
      text: member.notes ?? 'No notes yet for this member. Tap + to add a note.',
    },
  ]

  return (
    <>
      {showEditDialog && (
        <EditMemberDialog
          member={member}
          workspaceId={workspaceId}
          onClose={() => setShowEditDialog(false)}
          onSuccess={() => {
            router.refresh();
            flashToast("Member updated successfully");
          }}
        />
      )}

      {showDeleteDialog && (
        <DeleteMemberDialog
          member={member}
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
          onClose={() => setShowDeleteDialog(false)}
        />
      )}

      <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface pb-6">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-ve-surface/80 px-5 py-3 backdrop-blur-xl border-b border-ve-outline-variant/30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={openNav}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-ve-primary/5 transition-colors active:scale-95"
          >
            <Menu size={20} className="text-ve-primary" />
          </button>
          <Link
            href={`/${workspaceSlug}/members`}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-ve-primary/5 transition-colors active:scale-95"
          >
            <ArrowLeft size={20} className="text-ve-primary" />
          </Link>
          <span className="font-ve-headline-lg-mobile text-ve-primary font-black">Pypus</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Send Reminder */}
          <button
            onClick={handleRemind}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-full border-2 border-ve-primary px-4 py-2 text-ve-primary transition-all active:scale-95 disabled:opacity-40"
          >
            <BellRing size={16} />
            <span className="text-xs font-bold tracking-wide">Remind</span>
          </button>
          {payableFeeId && (
            <button
              onClick={() => setMarkPaidOpen(true)}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-full bg-ve-primary-container px-4 py-2 text-ve-on-primary-container shadow-[0_4px_12px_rgba(0,255,65,0.2)] transition-all active:scale-95 disabled:opacity-40"
            >
              <CreditCard size={16} />
              <span className="text-xs font-bold tracking-wide">Mark Paid</span>
            </button>
          )}
          {/* More Options Menu */}
          <div className="relative">
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-ve-primary/5 transition-colors active:scale-95"
            >
              <MoreVertical size={20} className="text-ve-on-surface" />
            </button>
            {showOptionsMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowOptionsMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border border-ve-outline-variant/30 bg-white shadow-lg py-1">
                  <button
                    onClick={() => {
                      setShowEditDialog(true);
                      setShowOptionsMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-ve-on-surface hover:bg-ve-surface-container-low flex items-center gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Member
                  </button>
                  <div className="border-t border-ve-outline-variant/20 my-1" />
                  <button
                    onClick={() => {
                      setShowDeleteDialog(true);
                      setShowOptionsMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-ve-error hover:bg-ve-error-container/20 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Member
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="px-5 pt-6">
        {/* Profile Hero */}
        <section className="flex items-start gap-5 mb-8">
          <div className="relative shrink-0">
            <div className="h-24 w-24 rounded-[1.5rem] overflow-hidden border-4 border-white shadow-xl rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.name}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-full w-full bg-ve-secondary-container flex items-center justify-center text-ve-on-secondary-container font-black text-2xl">
                  {initials}
                </div>
              )}
            </div>
            {feeStatus === 'paid' && (
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-ve-primary-container border-2 border-white flex items-center justify-center shadow-md">
                <Verified size={14} className="text-ve-on-primary-container" fill="currentColor" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-black text-2xl leading-tight text-ve-on-surface truncate">{member.name}</h1>
            <p className="flex items-center gap-1.5 text-sm text-ve-on-surface-variant mt-1">
              <Phone size={14} />
              {member.phone || 'No phone'}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {planName && (
                <span className="rounded-full bg-ve-primary/10 border border-ve-primary/20 px-3 py-0.5 text-xs font-bold text-ve-primary">
                  {planName}
                </span>
              )}
              <span className={`rounded-full border px-3 py-0.5 text-xs font-bold ${feeStatusColors[feeStatus]}`}>
                {feeLabel[feeStatus]}
              </span>
              {member.trainer_name && (
                <span className="rounded-full bg-ve-secondary-container/20 border border-ve-secondary/20 px-3 py-0.5 text-xs font-bold text-ve-secondary">
                  {member.trainer_name}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Tabs */}
        <nav className="flex gap-1 p-1 bg-ve-surface-container-low rounded-xl mb-6 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <Link
              key={tab}
              href={tabHref[tab]}
              onClick={() => setActiveTab(tab)}
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

        {/* Contact Details Card */}
        <div className="glass-lite rounded-[1.5rem] p-5 mb-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-full bg-ve-primary/10 flex items-center justify-center text-ve-primary">
              <Mail size={18} />
            </div>
            <h2 className="text-lg font-bold">Contact Details</h2>
          </div>
          <ul className="space-y-4">
            <li className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-ve-on-surface-variant">Email</span>
              <span className="text-sm text-ve-on-surface">{member.email || '—'}</span>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-ve-on-surface-variant">Phone</span>
              <span className="text-sm text-ve-on-surface">{member.phone || '—'}</span>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-ve-on-surface-variant">Member Since</span>
              <span className="text-sm text-ve-on-surface">{joinedDate}</span>
            </li>
            {member.trainer_name && (
              <li className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-ve-on-surface-variant">Trainer</span>
                <span className="text-sm text-ve-on-surface">{member.trainer_name}</span>
              </li>
            )}
          </ul>
        </div>

        {/* Next Session Card */}
        <div className="relative overflow-hidden rounded-[1.5rem] bg-ve-secondary-container p-5 mb-4 shadow-md group">
          <div className="relative z-10 text-ve-on-secondary-container">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Status</span>
            <div className="text-3xl font-black mt-1 capitalize">{feeLabel[feeStatus]}</div>
            <p className="text-sm mt-2 opacity-90">
              {feeStatus === 'paid'
                ? 'Membership active — all payments cleared.'
                : feeStatus === 'overdue'
                ? 'Payment overdue — please collect fees.'
                : feeStatus === 'due'
                ? 'Payment due soon — remind member.'
                : 'No active plan assigned.'}
            </p>
          </div>
          <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <CalendarCheck2 size={160} />
          </div>
        </div>

        {/* Member Notes */}
        <div className="glass-lite rounded-[1.5rem] p-5 mb-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-ve-tertiary-container/30 flex items-center justify-center text-ve-tertiary">
                <Users size={18} />
              </div>
              <h2 className="text-lg font-bold">Member Notes</h2>
            </div>
            <button className="h-10 w-10 rounded-full hover:bg-ve-surface-container-high flex items-center justify-center transition-colors">
              <Plus size={20} className="text-ve-on-surface-variant" />
            </button>
          </div>
          <div className="space-y-3">
            {notes.map((note, i) => (
              <div
                key={i}
                className="rounded-xl border border-ve-outline-variant/20 bg-ve-surface-container-low p-4 hover:border-ve-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-bold text-ve-primary">{note.date}</span>
                  <button className="text-ve-on-surface-variant/40 hover:text-ve-on-surface">
                    <MoreVertical size={16} />
                  </button>
                </div>
                <p className="text-sm text-ve-on-surface leading-relaxed">{note.text}</p>
              </div>
            ))}
          </div>
        </div>
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
        defaultAmount={amount ?? 0}
        dueDate={dueDate}
      />

      {toast && (
        <div className="fixed bottom-28 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-ve-on-surface px-5 py-2.5 text-xs font-bold text-white shadow-lg">
          {toast}
        </div>
      )}
      </div>
    </>
  )
}
