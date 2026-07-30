'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { LogIn, Loader2, Dumbbell } from 'lucide-react'
import { markAttendance, getFeesStatus } from '@/app/actions/member-checkin'
import { CheckInPopup, type PopupState } from './CheckInPopup'
import MemberAvatar from '@/components/shared/MemberAvatar'

interface CheckInScreenProps {
  workspaceId: string
  workspaceName: string
  memberId: string
  memberName: string
  memberAvatar: string | null
}

export function CheckInScreen({
  workspaceId,
  workspaceName,
  memberName,
  memberAvatar,
}: CheckInScreenProps) {
  const [isPending, startTransition] = useTransition()
  const [popup, setPopup] = useState<PopupState | null>(null)

  const firstName = memberName.split(' ')[0]

  const handleCheckIn = () => {
    startTransition(async () => {
      const attendanceResult = await markAttendance(workspaceId)

      if ('error' in attendanceResult) {
        setPopup({ type: 'error', message: attendanceResult.error })
        return
      }

      if (attendanceResult.alreadyCheckedIn) {
        setPopup({ type: 'already', checkInTime: attendanceResult.checkInTime })
        return
      }

      // Successfully checked in — now check fees status
      const feesResult = await getFeesStatus(workspaceId)

      if ('error' in feesResult) {
        // Don't fail the success experience just because fees lookup errored
        setPopup({ type: 'success', checkInTime: attendanceResult.checkInTime })
        return
      }

      if (feesResult.hasDue) {
        setPopup({ type: 'fees', fee: feesResult })
      } else {
        setPopup({ type: 'success', checkInTime: attendanceResult.checkInTime })
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0c0f] relative overflow-hidden">
      {/* Background grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#00ff88 1px, transparent 1px), linear-gradient(90deg, #00ff88 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[#00ff88]/4 blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-10 pb-4">
        <div className="flex items-center gap-2.5">
          <Dumbbell className="w-5 h-5 text-[#00ff88]" />
          <span className="text-[#6b7280] text-sm font-medium">{workspaceName}</span>
        </div>
        {/* Subtle live indicator */}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          <span className="text-[#374151] text-xs font-mono">LIVE</span>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 gap-12 pb-16">
        {/* Member profile */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center gap-4"
        >
          {/* Avatar */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#00ff88]/10 blur-xl scale-110" />
            <MemberAvatar
              name={memberName}
              avatarUrl={memberAvatar}
              size={96}
              fallbackClassName="bg-gradient-to-br from-[#0d2b1a] to-[#060f09] border-2 border-[#00ff88]/30 text-[#00ff88] shadow-[0_0_32px_rgba(0,255,136,0.2)]"
            />
          </div>

          {/* Name */}
          <div className="text-center">
            <p className="text-[#6b7280] text-sm mb-0.5">Welcome back,</p>
            <h1 className="text-white text-2xl font-bold tracking-tight">{firstName}</h1>
          </div>
        </motion.div>

        {/* Check-in button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.15 }}
          className="w-full max-w-xs"
        >
          <button
            id="member-checkin-btn"
            onClick={handleCheckIn}
            disabled={isPending}
            className="relative w-full group flex flex-col items-center justify-center gap-3 py-10 rounded-3xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(145deg, #0d2b1a, #060f09)',
              border: '1.5px solid rgba(0,255,136,0.3)',
              boxShadow: isPending
                ? 'none'
                : '0 0 40px rgba(0,255,136,0.15), inset 0 1px 0 rgba(0,255,136,0.08)',
            }}
          >
            {/* Hover glow */}
            <div className="absolute inset-0 rounded-3xl bg-[#00ff88]/0 group-hover:bg-[#00ff88]/5 transition-all duration-300 pointer-events-none" />

            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-200"
              style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}
            >
              {isPending ? (
                <Loader2 className="w-8 h-8 text-[#00ff88] animate-spin" />
              ) : (
                <LogIn className="w-8 h-8 text-[#00ff88]" />
              )}
            </div>

            <div className="text-center">
              <p className="text-[#00ff88] text-xl font-bold tracking-tight">
                {isPending ? 'Checking in…' : 'Check In'}
              </p>
              <p className="text-[#374151] text-xs mt-0.5">
                {isPending ? 'Please wait' : 'Tap to mark attendance'}
              </p>
            </div>
          </button>
        </motion.div>

        {/* Today's date */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-[#374151] text-xs font-mono"
        >
          {new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </motion.p>
      </main>

      {/* Popup overlay */}
      {popup && (
        <CheckInPopup state={popup} onClose={() => setPopup(null)} />
      )}
    </div>
  )
}
