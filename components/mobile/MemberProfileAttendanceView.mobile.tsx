'use client'

import Link from 'next/link'
import { ArrowLeft, Dumbbell, Flame, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import type { Member, AttendanceRecord } from '@/lib/members/types'

interface Props {
  member: Member
  workspaceSlug: string
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
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

const SESSION_ICONS = [Dumbbell, Dumbbell, Dumbbell]

export function MemberProfileAttendanceView({ member, workspaceSlug, records }: Props) {
  const basePath = `/${workspaceSlug}/members/${member.id}`
  const activeTab: Tab = 'Attendance'

  const tabHref: Record<Tab, string> = {
    Overview: basePath,
    Attendance: `${basePath}/attendance`,
    Fees: `${basePath}/fees`,
  }

  const total = records.length
  const present = records.filter((r) => r.status === 'present').length
  const rate = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0'
  const streak = computeStreak(records)

  const initials = member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  const recentLogs = [...records]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)

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

      <main className="px-5 pt-6">
        {/* Profile Header (centered) */}
        <section className="flex flex-col items-center mb-7">
          <div className="relative mb-4">
            <div className="h-24 w-24 rounded-full border-4 border-ve-primary-container p-1 bg-ve-surface-container shadow-lg">
              <div className="h-full w-full rounded-full overflow-hidden bg-ve-surface-container-high">
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
            </div>
            <div className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-ve-primary border-2 border-white flex items-center justify-center shadow">
              <CheckCircle2 size={12} className="text-white" fill="white" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-ve-on-surface">{member.name}</h2>
          <p className="text-xs font-bold text-ve-on-surface-variant/70 tracking-widest uppercase mt-0.5">
            Member • ID: #{member.id.slice(-4).toUpperCase()}
          </p>
        </section>

        {/* Tabs */}
        <nav className="flex gap-1 p-1 bg-ve-surface-container-low rounded-xl mb-6 overflow-x-auto no-scrollbar">
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

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-3 mb-7">
          {/* Total Sessions */}
          <div className="relative overflow-hidden rounded-[1.25rem] bg-white border border-ve-outline-variant/30 p-4 shadow-sm hover:scale-[1.02] transition-transform">
            <div className="absolute top-3 right-3 opacity-10">
              <Dumbbell size={40} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ve-on-surface-variant">Total Sessions</p>
            <p className="text-3xl font-black text-ve-on-surface mt-1">{total}</p>
          </div>

          {/* Attended */}
          <div className="relative overflow-hidden rounded-[1.25rem] bg-white border border-ve-outline-variant/30 p-4 shadow-sm hover:scale-[1.02] transition-transform">
            <div className="absolute top-3 right-3 opacity-10 text-ve-primary">
              <CheckCircle2 size={40} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-ve-on-surface-variant">Attended</p>
            <p className="text-3xl font-black text-ve-primary mt-1">{present}</p>
          </div>

          {/* Attendance Rate */}
          <div className="relative overflow-hidden rounded-[1.25rem] bg-ve-primary-container p-4 shadow-md hover:scale-[1.02] transition-transform">
            <div className="absolute -right-4 -bottom-4 h-24 w-24 bg-white/20 rounded-full blur-2xl" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-ve-on-primary-container">Rate (%)</p>
            <div className="flex items-baseline gap-1 mt-1">
              <p className="text-3xl font-black text-ve-on-primary-container">{rate}</p>
              <span className="text-xs font-bold text-ve-on-primary-container">%</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-ve-on-primary-container/20">
              <div
                className="h-full rounded-full bg-ve-on-primary-container"
                style={{ width: `${rate}%` }}
              />
            </div>
          </div>

          {/* Current Streak */}
          <div className="relative overflow-hidden rounded-[1.25rem] bg-ve-secondary p-4 shadow-md hover:scale-[1.02] transition-transform">
            <div className="absolute top-3 right-3 opacity-20 text-white">
              <Flame size={40} fill="white" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white">Streak</p>
            <div className="flex items-baseline gap-1 mt-1">
              <p className="text-3xl font-black text-white">{streak}</p>
              <span className="text-xs font-bold text-white/80">Days</span>
            </div>
          </div>
        </section>

        {/* Recent Logs */}
        <div className="flex items-end justify-between mb-3">
          <h3 className="text-lg font-bold text-ve-on-surface">Recent Logs</h3>
          <button className="flex items-center gap-1 text-xs font-bold text-ve-primary">
            View History <ArrowRight size={14} />
          </button>
        </div>

        <section className="flex flex-col gap-2 pb-4">
          {recentLogs.length === 0 ? (
            <div className="rounded-[1rem] bg-ve-surface-container p-6 text-center text-sm text-ve-on-surface-variant">
              No attendance records yet.
            </div>
          ) : (
            recentLogs.map((log, i) => {
              const SessionIcon = SESSION_ICONS[i % SESSION_ICONS.length]
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-[1rem] bg-white p-4 border border-ve-outline-variant/20 hover:bg-ve-surface-container-low transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-full flex items-center justify-center ${
                      log.status === 'present'
                        ? 'bg-ve-primary-container/20 text-ve-primary'
                        : 'bg-ve-secondary-container/20 text-ve-secondary'
                    }`}>
                      <SessionIcon size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ve-on-surface">
                        {log.check_in ? `Check-in ${fmtTime(log.check_in)}` : 'Session'}
                      </p>
                      <p className="text-[11px] text-ve-on-surface-variant/60">{fmtDate(log.date)}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                    log.status === 'present'
                      ? 'bg-ve-primary/10 text-ve-primary'
                      : 'bg-ve-error-container text-ve-error'
                  }`}>
                    {log.status === 'present'
                      ? <><CheckCircle2 size={12} fill="currentColor" /> Present</>
                      : <><XCircle size={12} fill="currentColor" /> Absent</>}
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
