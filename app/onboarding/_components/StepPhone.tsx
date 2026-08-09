'use client'

import { useState } from 'react'
import { useOnboarding } from '@/context/OnboardingContext'
import { Smartphone, CheckCircle2, ArrowRight } from 'lucide-react'

export default function StepPhone() {
  const { phone, setPhone, nextStep } = useOnboarding()
  const [error, setError] = useState<string | null>(null)

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhone(rawDigits)

    if (error) setError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPhone = phone.trim()
    const indianMobileRegex = /^[6-9]\d{9}$/

    if (!indianMobileRegex.test(cleanPhone)) {
      setError('Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.')
      return
    }

    setError(null)
    nextStep()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full">
      <div className="flex justify-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'var(--onb-emerald-tint)', color: 'var(--onb-emerald)' }}
        >
          <Smartphone className="w-8 h-8" />
        </div>
      </div>

      <div className="text-center">
        <h2
          className="text-3xl font-extrabold tracking-tight mb-2"
          style={{ letterSpacing: '-0.02em', color: 'var(--onb-ink)' }}
        >
          Stay in the loop
        </h2>
        <p className="text-base max-w-[320px] mx-auto" style={{ color: 'var(--onb-ink-soft)' }}>
          Enter your phone number for WhatsApp automations and updates.
        </p>
      </div>

      <div className="onb-card p-6 space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="phone-number"
            className="text-xs font-semibold uppercase tracking-wider block"
            style={{ color: 'var(--onb-muted)' }}
          >
            Phone Number
          </label>
          <div
            className="flex items-center rounded-xl px-4 py-1 transition-all"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--onb-line)' }}
          >
            <span
              className="text-sm font-bold pr-3 mr-1 select-none"
              style={{ borderRight: '1px solid var(--onb-line)', color: 'var(--onb-ink)' }}
            >
              +91
            </span>
            <input
              id="phone-number"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="00000 00000"
              autoFocus
              className="flex-grow bg-transparent border-none outline-none py-3 pl-3 text-lg font-semibold"
              style={{ color: 'var(--onb-ink)' }}
            />
          </div>
        </div>

        {error && (
          <p
            className="text-xs font-medium p-3 rounded-lg"
            style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}
          >
            {error}
          </p>
        )}

        {/* Fetched Name Notification */}
        <div
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-medium"
          style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--onb-ink-soft)' }}
        >
          <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--onb-emerald)' }} />
          <span>We've verified your identity via Google</span>
        </div>
      </div>

      <div className="space-y-3">
        <button onClick={handleSubmit} type="submit" className="onb-btn-primary">
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-center text-[11px]" style={{ color: 'var(--onb-muted)' }}>
          By continuing, you agree to receive important operational updates.
        </p>
      </div>
    </form>
  )
}
