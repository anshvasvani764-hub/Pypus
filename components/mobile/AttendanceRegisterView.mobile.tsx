'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Search, CheckCircle2, XCircle, AlertTriangle, Users,
  CreditCard, SortAsc
} from 'lucide-react'
import type { Member, AttendanceRecord } from '@/lib/members/types'
import type { MemberFeeSummary } from '@/lib/members/fee-status'
import { MobileTopBar } from '@/components/mobile/MobileTopBar'
import { createClient } from '@/lib/supabase/client'
import { getISTDateString } from '@/lib/utils/date'
import MemberAvatar from '@/components/shared/MemberAvatar'
import { PrintQrButton } from '@/components/attendance/PrintQrButton'

interface Props {
  workspaceSlug: string
  workspaceId: string
  workspaceName: string
  members: Member[]
  todayRecords: AttendanceRecord[]
  feeSummaries: Record<string, MemberFeeSummary>
}

export function AttendanceRegisterView({
  workspaceSlug,
  workspaceId,
  workspaceName,
  members,
  todayRecords: initialTodayRecords,
  feeSummaries,
}: Props) {
  const [query, setQuery] = useState('')
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>(initialTodayRecords)
  const [selectedOverdueMember, setSelectedOverdueMember] = useState<{
    member: Member
    summary: MemberFeeSummary
  } | null>(null)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function flashToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  // Map today's checkins
  const checkedInSet = new Set(
    todayRecords.filter((r) => r.status === 'present').map((r) => r.member_id)
  )

  const presentCount = checkedInSet.size
  const totalMembers = members.length
  const absentCount = totalMembers - presentCount
  const attendanceRate = totalMembers > 0 ? ((presentCount / totalMembers) * 100).toFixed(1) : '0.0'

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.id.toLowerCase().includes(query.toLowerCase()) ||
      m.phone.includes(query)
  )

  const handleCheckIn = async (memberId: string) => {
    if (pendingId) return
    setPendingId(memberId)

    const now = new Date()
    const today = getISTDateString(now)
    const checkInIso = now.toISOString()

    const supabase = createClient()
    const { error } = await supabase.from('attendance').upsert(
      {
        workspace_id: workspaceId,
        member_id: memberId,
        date: today,
        check_in: checkInIso,
        check_out: null,
        status: 'present',
      },
      { onConflict: 'member_id,date' }
    )

    setPendingId(null)

    if (error) {
      console.error('Mobile check-in error:', error.message)
      flashToast('Check-in failed. Try again.')
      return
    }

    setTodayRecords((prev) => [
      ...prev.filter((r) => r.member_id !== memberId),
      {
        id: `local-${memberId}-${today}`,
        member_id: memberId,
        date: today,
        check_in: checkInIso,
        check_out: null,
        status: 'present',
      },
    ])
    flashToast('Checked in')
  }

  const openOverdueAlert = (member: Member, summary: MemberFeeSummary) => {
    setSelectedOverdueMember({ member, summary })
    setIsAlertOpen(true)
  }

  return (
    <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface pb-6">
      <MobileTopBar
        title="Attendance"
        label="Pypus"
        workspaceSlug={workspaceSlug}
        backHref={`/${workspaceSlug}/workspace`}
        action={<PrintQrButton workspaceId={workspaceId} workspaceName={workspaceName} />}
      />

      <main className="px-4 pt-4 space-y-4">
        {/* Stat Cards Section */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {/* Present Today */}
          <div className="col-span-1 bg-ve-primary text-white p-3.5 rounded-2xl shadow-md relative overflow-hidden flex flex-col justify-between h-[88px]">
            <div className="z-10">
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Present Today</p>
              <h2 className="text-[22px] font-black mt-0.5">{presentCount}</h2>
            </div>
            <CheckCircle2 size={40} className="absolute -bottom-1.5 -right-1.5 opacity-20 pointer-events-none" fill="white" />
          </div>

          {/* Absent */}
          <div className="col-span-1 bg-ve-secondary text-white p-3.5 rounded-2xl shadow-md relative overflow-hidden flex flex-col justify-between h-[88px]">
            <div className="z-10">
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Absent</p>
              <h2 className="text-[22px] font-black mt-0.5">{absentCount}</h2>
            </div>
            <XCircle size={40} className="absolute -bottom-1.5 -right-1.5 opacity-20 pointer-events-none" fill="white" />
          </div>

          {/* Attendance Rate */}
          <div className="col-span-2 md:col-span-1 bg-ve-surface-container-highest p-3.5 rounded-2xl border border-ve-outline-variant/30 flex flex-col justify-between h-[88px]">
            <div>
              <p className="text-[10px] font-bold text-ve-on-surface-variant uppercase tracking-wider">Attendance Rate</p>
              <h2 className="text-[22px] font-black text-ve-primary mt-0.5">{attendanceRate}%</h2>
            </div>
            <div className="w-full bg-ve-outline-variant/30 h-1.5 rounded-full overflow-hidden">
              <div className="bg-ve-primary h-full transition-all duration-500" style={{ width: `${attendanceRate}%` }} />
            </div>
          </div>
        </section>

        {/* Search Bar */}
        <section>
          <div className="relative">
            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ve-outline" size={17} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members by name or ID..."
              className="w-full pl-10 pr-3.5 py-3 bg-white border border-ve-outline-variant/30 rounded-xl focus:outline-none focus:border-ve-primary transition-all text-[13px] font-medium text-ve-on-surface placeholder:text-ve-outline"
            />
          </div>
        </section>

        {/* Member List */}
        <section className="space-y-2 pb-6">
          <h3 className="text-[11px] font-bold text-ve-on-surface-variant flex items-center gap-1.5 tracking-wider uppercase">
            <SortAsc size={14} />
            MEMBERS REGISTRY ({filteredMembers.length})
          </h3>

          {filteredMembers.map((member) => {
            const summary = feeSummaries[member.id]
            const isCheckedIn = checkedInSet.has(member.id)
            const isOverdue = summary?.status === 'overdue'
            const planBadge = summary?.planName ?? member.plan?.name ?? 'Standard Plan'

            if (isOverdue && !isCheckedIn) {
              return (
                <div
                  key={member.id}
                  className="bg-white p-3 rounded-2xl border border-ve-error/20 shadow-sm flex items-center gap-3 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-ve-error text-white font-bold text-[7px] tracking-widest rounded-bl-lg uppercase">
                    OVERDUE
                  </div>
                  <div className="h-11 w-11 rounded-full overflow-hidden bg-ve-surface-container shrink-0 border-2 border-ve-error/30 flex items-center justify-center">
                    <MemberAvatar
                      name={member.name}
                      avatarUrl={member.avatar_url}
                      size={44}
                      fallbackClassName="bg-ve-error-container text-ve-on-error-container"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[13.5px] text-ve-on-surface truncate">{member.name}</h4>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-ve-error-container text-ve-on-error-container font-bold text-[9px]">
                      {planBadge.toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => openOverdueAlert(member, summary)}
                    className="bg-ve-error text-white font-bold text-[11px] px-3 py-2 rounded-full shadow-md active:scale-95 transition-transform"
                  >
                    View Alert
                  </button>
                </div>
              )
            }

            return (
              <div
                key={member.id}
                className="bg-white p-3 rounded-2xl border border-ve-outline-variant/20 shadow-sm flex items-center gap-3 hover:border-ve-primary/40 transition-all cursor-pointer"
              >
                <MemberAvatar
                  name={member.name}
                  avatarUrl={member.avatar_url}
                  size={44}
                  fallbackClassName="bg-ve-primary-container text-ve-on-primary-container"
                />
                <Link href={`/${workspaceSlug}/members/${member.id}`} className="flex-1 min-w-0">
                  <h4 className="font-bold text-[13.5px] text-ve-on-surface truncate">{member.name}</h4>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-bold text-[9px] ${
                    summary?.status === 'paid'
                      ? 'bg-ve-secondary-container text-ve-on-secondary-container'
                      : 'bg-ve-surface-container-high text-ve-on-surface-variant'
                  }`}>
                    {planBadge.toUpperCase()}
                  </span>
                </Link>

                {isCheckedIn ? (
                  <span className="bg-ve-primary/10 text-ve-primary font-bold text-[11px] px-3 py-2 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={12} /> Done
                  </span>
                ) : (
                  <button
                    onClick={() => handleCheckIn(member.id)}
                    disabled={pendingId === member.id}
                    className="bg-ve-primary-container text-ve-on-primary-container font-bold text-[11px] px-3 py-2 rounded-full shadow-[0_4px_14px_rgba(0,230,57,0.3)] active:scale-95 transition-transform disabled:opacity-50"
                  >
                    {pendingId === member.id ? '...' : 'Check-in'}
                  </button>
                )}
              </div>
            )
          })}
        </section>
      </main>

      {toast && (
        <div className="fixed bottom-28 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-ve-on-surface px-5 py-2.5 text-xs font-bold text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Bottom Sheet Alert Overlay */}      {isAlertOpen && selectedOverdueMember && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm flex items-end justify-center px-4 pb-0 transition-opacity duration-300"
          onClick={() => setIsAlertOpen(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded-t-[2rem] overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-full flex justify-center py-4">
              <div className="w-12 h-1.5 bg-ve-outline-variant/50 rounded-full" />
            </div>

            <div className="px-6 pb-8 space-y-5">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-ve-error-container flex items-center justify-center text-ve-error shrink-0">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-ve-on-surface">Fees Due</h2>
                  <p className="text-xs text-ve-on-surface-variant opacity-70">
                    {selectedOverdueMember.member.name} owes ₹{selectedOverdueMember.summary.amount ?? 0}.
                  </p>
                </div>
              </div>

              <div className="bg-ve-surface-container-low p-4 rounded-xl border border-ve-outline-variant/20 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-bold text-ve-on-surface-variant uppercase tracking-wider">STATUS</p>
                  <p className="text-lg font-bold text-ve-on-surface">Payment Overdue</p>
                </div>
                <AlertTriangle className="text-ve-error" size={24} />
              </div>

              <div className="flex flex-col gap-2.5">
                <a
                  href={`/${workspaceSlug}/members/${selectedOverdueMember.member.id}/fees`}
                  className="w-full bg-ve-secondary text-white font-bold text-sm py-4 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <CreditCard size={18} />
                  Collect Now
                </a>
                <button
                  onClick={() => {
                    handleCheckIn(selectedOverdueMember.member.id)
                    setIsAlertOpen(false)
                  }}
                  className="w-full bg-ve-surface-container-high text-ve-on-surface font-bold text-sm py-4 rounded-xl active:scale-95 transition-transform"
                >
                  Check In Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}