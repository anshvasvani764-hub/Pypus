'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Menu, Dumbbell, Flame, CheckCircle2, XCircle, ArrowRight, Pencil, Phone } from 'lucide-react'
import { useMobileNav } from '@/context/MobileNavContext'
import type { Member, AttendanceRecord } from '@/lib/members/types'
import { EditAttendanceModal } from '@/components/records/EditAttendanceModal'

interface Props {
  member: Member
  workspaceSlug: string
  workspaceId: string
  records: AttendanceRecord[]
}

const TABS = ['Overview', 'Attendance', 'Fees'] as const
type Tab = typeof TABS[number]

function computeStreak(records: AttendanceRecord[]): number {
  const sorted = [...records]
    .filter((r) => r.status === 'present')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  let streak = 0
  let prev: Date | null = null
  for (const r of sorted) {
    const d = new Date(r.date)
    if (!prev) { streak = 1; prev = d; continue }
    const diff = Math.round((prev.getTime() - d.getTime()) / 86400000)
    if (diff === 1) { streak++; prev = d }
    else break
  }
  return streak
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

const SESSION_ICONS = [Dumbbell, Dumbbell, Dumbbell]

export function MemberProfileAttendanceView({ member, workspaceSlug, workspaceId, records }: Props) {
  const { open } = useMobileNav()
  const [recordsState, setRecordsState] = useState<AttendanceRecord[]>(records)
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null)
  const basePath = `/${workspaceSlug}/members/${member.id}`
  const activeTab: Tab = 'Attendance'

  const tabHref: Record<Tab, string> = {
    Overview: basePath,
    Attendance: `${basePath}/attendance`,
    Fees: `${basePath}/fees`,
  }

  const total = recordsState.length
  const present = recordsState.filter((r) => r.status === 'present').length
  const rate = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0'
  const streak = computeStreak(recordsState)

  const initials = member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const recentLogs = [...recordsState]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)

  function handleSaved(originalId: string, updated: AttendanceRecord) {
    setRecordsState((prev) => prev.map((r) => (r.id === originalId ? updated : r)))
  }

  return (
    <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface pb-6">
      <EditAttendanceModal
        isOpen={editingRecord !== null}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        workspaceId={workspaceId}
        memberId={member.id}
        onSaved={handleSaved}
      />

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

      <main className="px-4 pt-4">
        {/* Profile Hero */}
        <section className="flex items-start gap-4 mb-5">
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
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-ve-primary border-2 border-white flex items-center justify-center shadow-md">
              <CheckCircle2 size={12} className="text-white" fill="white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-black text-xl leading-tight text-ve-on-surface truncate">{member.name}</h1>
            <p className="flex items-center gap-1.5 text-[12px] text-ve-on-surface-variant mt-0.5">
              <Phone size={12} />
              {member.phone || 'No phone'}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {member.plan?.name && (
                <span className="rounded-full bg-ve-primary/10 border border-ve-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-ve-primary">
                  {member.plan.name}
                </span>
              )}
              {member.trainer_name && (
                <span className="rounded-full bg-ve-secondary-container/20 border border-ve-secondary/20 px-2.5 py-0.5 text-[10px] font-bold text-ve-secondary">
                  {member.trainer_name}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Tabs */}
        <nav className="flex gap-1 p-1 bg-ve-surface-container-low rounded-xl mb-4 overflow-x-auto no-scrollbar">
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

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-2.5 mb-5">
          {/* Total Sessions */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-ve-outline-variant/30 p-3.5 shadow-sm hover:scale-[1.02] transition-transform">
            <div className="absolute top-2.5 right-2.5 opacity-10">
              <Dumbbell size={32} />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-ve-on-surface-variant">Total Sessions</p>
            <p className="text-[20px] font-black text-ve-on-surface mt-0.5">{total}</p>
          </div>

          {/* Attended */}
          <div className="relative overflow-hidden rounded-2xl bg-white border border-ve-outline-variant/30 p-3.5 shadow-sm hover:scale-[1.02] transition-transform">
            <div className="absolute top-2.5 right-2.5 opacity-10 text-ve-primary">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-ve-on-surface-variant">Attended</p>
            <p className="text-[20px] font-black text-ve-primary mt-0.5">{present}</p>
          </div>

          {/* Attendance Rate */}
          <div className="relative overflow-hidden rounded-2xl bg-ve-primary-container p-3.5 shadow-md hover:scale-[1.02] transition-transform">
            <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-white/20 rounded-full blur-2xl" />
            <p className="text-[9px] font-bold uppercase tracking-wider text-ve-on-primary-container">Rate (%)</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <p className="text-[20px] font-black text-ve-on-primary-container">{rate}</p>
              <span className="text-[10px] font-bold text-ve-on-primary-container">%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-ve-on-primary-container/20">
              <div
                className="h-full rounded-full bg-ve-on-primary-container"
                style={{ width: `${rate}%` }}
              />
            </div>
          </div>

          {/* Current Streak */}
          <div className="relative overflow-hidden rounded-2xl bg-ve-secondary p-3.5 shadow-md hover:scale-[1.02] transition-transform">
            <div className="absolute top-2.5 right-2.5 opacity-20 text-white">
              <Flame size={32} fill="white" />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-white">Streak</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <p className="text-[20px] font-black text-white">{streak}</p>
              <span className="text-[10px] font-bold text-white/80">Days</span>
            </div>
          </div>
        </section>

        {/* Recent Logs */}
        <div className="flex items-end justify-between mb-2.5">
          <h3 className="text-[13px] font-bold text-ve-on-surface">Recent Logs</h3>
          <button className="flex items-center gap-1 text-[11px] font-bold text-ve-primary">
            View History <ArrowRight size={12} />
          </button>
        </div>

        <section className="flex flex-col gap-2 pb-4">
          {recentLogs.length === 0 ? (
            <div className="rounded-2xl bg-ve-surface-container p-6 text-center text-[13px] text-ve-on-surface-variant">
              No attendance records yet.
            </div>
          ) : (
            recentLogs.map((log, i) => {
              const SessionIcon = SESSION_ICONS[i % SESSION_ICONS.length]
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-2xl bg-white p-3 border border-ve-outline-variant/20 hover:bg-ve-surface-container-low transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      log.status === 'present'
                        ? 'bg-ve-primary-container/20 text-ve-primary'
                        : 'bg-ve-secondary-container/20 text-ve-secondary'
                    }`}>
                      <SessionIcon size={18} />
                    </div>
                    <div>
                      <p className="text-[12.5px] font-bold text-ve-on-surface">
                        {log.check_in ? `Check-in ${fmtTime(log.check_in)}` : 'Session'}
                      </p>
                      <p className="text-[10px] text-ve-on-surface-variant/60">{fmtDate(log.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      log.status === 'present'
                        ? 'bg-ve-primary/10 text-ve-primary'
                        : 'bg-ve-error-container text-ve-error'
                    }`}>
                      {log.status === 'present'
                        ? <><CheckCircle2 size={11} fill="currentColor" /> Present</>
                        : <><XCircle size={11} fill="currentColor" /> Absent</>}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingRecord(log)
                      }}
                      className="h-8 w-8 rounded-full flex items-center justify-center text-ve-on-surface-variant hover:text-ve-primary hover:bg-ve-primary/5 transition-colors"
                      title="Edit record"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </section>
      </main>
    </div>
  )
}