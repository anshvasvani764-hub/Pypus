'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertTriangle, Clock, X } from 'lucide-react'
import type { FeeStatusResult } from '@/app/actions/member-checkin'

export type PopupState =
  | { type: 'success'; checkInTime: string }
  | { type: 'already'; checkInTime: string }
  | { type: 'fees'; fee: Extract<FeeStatusResult, { hasDue: true }> }
  | { type: 'error'; message: string }

interface CheckInPopupProps {
  state: PopupState
  onClose: () => void
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function CheckInPopup({ state, onClose }: CheckInPopupProps) {
  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        <motion.div
          key="sheet"
          initial={{ y: 60, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.97 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl overflow-hidden"
          style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
        >
          {state.type === 'success' && <SuccessPanel checkInTime={state.checkInTime} onClose={onClose} />}
          {state.type === 'already' && <AlreadyPanel checkInTime={state.checkInTime} onClose={onClose} />}
          {state.type === 'fees' && <FeesPanel fee={state.fee} onClose={onClose} />}
          {state.type === 'error' && <ErrorPanel message={state.message} onClose={onClose} />}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Success panel — terminal green
// ---------------------------------------------------------------------------
function SuccessPanel({ checkInTime, onClose }: { checkInTime: string; onClose: () => void }) {
  const now = new Date(checkInTime)
  return (
    <div className="bg-[#060f09] border border-[#00ff88]/20 p-8 flex flex-col items-center gap-5 text-center relative">
      {/* Glow ring */}
      <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,255,136,0.08) 0%, transparent 70%)' }} />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 16, stiffness: 260, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-[#0d2b1a] border-2 border-[#00ff88]/30 flex items-center justify-center shadow-[0_0_40px_rgba(0,255,136,0.3)]"
      >
        <CheckCircle className="w-10 h-10 text-[#00ff88]" />
      </motion.div>

      <div className="space-y-1.5">
        <h2 className="text-[#00ff88] text-xl font-bold tracking-tight">Checked In!</h2>
        <p className="text-[#6b7280] text-sm">
          {formatDate(checkInTime)} · {formatTime(checkInTime)}
        </p>
        <p className="text-[#374151] text-xs mt-1">
          Your attendance has been marked for today.
        </p>
      </div>

      <button
        id="checkin-success-close"
        onClick={onClose}
        className="mt-1 w-full bg-[#00ff88] hover:bg-[#00e67a] text-[#060f09] font-bold py-3.5 rounded-2xl text-sm transition-all duration-150 active:scale-95"
      >
        Done
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Already checked in panel — neutral
// ---------------------------------------------------------------------------
function AlreadyPanel({ checkInTime, onClose }: { checkInTime: string; onClose: () => void }) {
  return (
    <div className="bg-[#0d0f12] border border-[#1f2937] p-8 flex flex-col items-center gap-5 text-center relative">
      <div className="w-20 h-20 rounded-full bg-[#111318] border border-[#1f2937] flex items-center justify-center">
        <Clock className="w-10 h-10 text-[#6b7280]" />
      </div>

      <div className="space-y-1.5">
        <h2 className="text-white text-xl font-bold tracking-tight">Already Checked In</h2>
        <p className="text-[#6b7280] text-sm">
          You checked in today at {formatTime(checkInTime)}.
        </p>
        <p className="text-[#374151] text-xs">
          Only one check-in per day is recorded.
        </p>
      </div>

      <button
        id="checkin-already-close"
        onClick={onClose}
        className="mt-1 w-full bg-[#1f2937] hover:bg-[#374151] text-white font-semibold py-3.5 rounded-2xl text-sm transition-all duration-150 active:scale-95"
      >
        Got it
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fees due panel — amber / red
// ---------------------------------------------------------------------------
function FeesPanel({
  fee,
  onClose,
}: {
  fee: Extract<FeeStatusResult, { hasDue: true }>
  onClose: () => void
}) {
  const isOverdue = fee.status === 'overdue'
  const accentColor = isOverdue ? '#ff4444' : '#f59e0b'
  const bgColor = isOverdue ? '#160808' : '#120e02'
  const borderColor = isOverdue ? 'rgba(255,68,68,0.2)' : 'rgba(245,158,11,0.2)'
  const badgeBg = isOverdue ? '#2a0909' : '#1f1600'
  const badgeText = isOverdue ? '#ff6b6b' : '#fbbf24'
  const buttonBg = isOverdue ? '#ff4444' : '#f59e0b'
  const buttonText = isOverdue ? '#160808' : '#120e02'

  return (
    <div
      className="p-8 flex flex-col gap-5 relative"
      style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: '1.5rem' }}
    >
      <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${accentColor}09 0%, transparent 70%)` }} />

      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: badgeBg, border: `1px solid ${accentColor}30`, boxShadow: `0 0 20px ${accentColor}20` }}
        >
          <AlertTriangle className="w-6 h-6" style={{ color: accentColor }} />
        </div>
        <div>
          <div
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2"
            style={{ background: badgeBg, color: badgeText }}
          >
            {isOverdue ? 'Overdue' : 'Payment Due'}
          </div>
          <h2 className="text-white text-lg font-bold leading-tight">
            {fee.planName}
          </h2>
        </div>
      </div>

      <div
        className="rounded-2xl p-4 flex items-center justify-between"
        style={{ background: badgeBg, border: `1px solid ${accentColor}20` }}
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{ color: accentColor }}>
            Amount Due
          </p>
          <p className="text-white text-2xl font-bold">
            {formatCurrency(fee.amount)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{ color: accentColor }}>
            Due Date
          </p>
          <p className="text-white text-sm font-semibold">
            {formatDate(fee.dueDate + 'T00:00:00')}
          </p>
        </div>
      </div>

      <p className="text-xs leading-relaxed" style={{ color: `${accentColor}99` }}>
        {isOverdue
          ? 'Your attendance has been marked, but your payment is past due. Please contact the gym to settle your balance.'
          : 'Your attendance has been marked. Please clear your balance before the due date.'}
      </p>

      <button
        id="checkin-fees-close"
        onClick={onClose}
        className="w-full font-bold py-3.5 rounded-2xl text-sm transition-all duration-150 active:scale-95"
        style={{ background: buttonBg, color: buttonText }}
      >
        Understood
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Error panel
// ---------------------------------------------------------------------------
function ErrorPanel({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="bg-[#0d0f12] border border-[#ff4444]/20 p-8 flex flex-col items-center gap-5 text-center">
      <div className="w-16 h-16 rounded-full bg-[#160808] border border-[#ff4444]/30 flex items-center justify-center">
        <X className="w-8 h-8 text-[#ff4444]" />
      </div>
      <div>
        <h2 className="text-white text-lg font-bold mb-1.5">Something went wrong</h2>
        <p className="text-[#6b7280] text-sm">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="w-full bg-[#1f2937] hover:bg-[#374151] text-white font-semibold py-3.5 rounded-2xl text-sm transition-all active:scale-95"
      >
        Close
      </button>
    </div>
  )
}
