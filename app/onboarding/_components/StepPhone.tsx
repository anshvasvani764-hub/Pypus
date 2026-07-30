'use client'

import { useState } from 'react'
import { useOnboarding } from '@/context/OnboardingContext'
import { Smartphone, CheckCircle2 } from 'lucide-react'

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
    <div className="flex-grow flex flex-col justify-between px-4 py-8 max-w-xl mx-auto w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Visual Badge Icon */}
        <div className="flex justify-center pt-2">
          <div className="w-20 h-20 bg-[#0052ff]/10 rounded-full flex items-center justify-center text-[#003ec7] shadow-inner">
            <Smartphone className="w-10 h-10 stroke-[2]" />
          </div>
        </div>

        {/* Headline Section */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#191c1e]">
            Verification
          </h2>
          <p className="text-sm md:text-base text-[#434656] max-w-[300px] mx-auto">
            Enter your phone number to stay updated.
          </p>
        </div>

        {/* Phone Input Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#c3c5d9]/40 shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="phone-number"
              className="text-xs font-semibold text-[#434656] uppercase tracking-wider block"
            >
              Phone Number
            </label>
            <div className="flex items-center bg-[#f2f4f6] border border-[#c3c5d9] rounded-xl px-4 py-3.5 focus-within:border-[#003ec7] focus-within:bg-white transition-all">
              <div className="flex items-center gap-1.5 pr-3 border-r border-[#c3c5d9] text-sm font-bold text-[#191c1e] select-none">
                <span>+91</span>
              </div>
              <input
                id="phone-number"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="00000 00000"
                autoFocus
                className="flex-grow bg-transparent border-none focus:ring-0 text-[#191c1e] font-semibold text-lg placeholder:text-[#c3c5d9] pl-3 py-0 outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-[#ba1a1a] bg-[#ffdad6] p-3 rounded-lg border border-[#ba1a1a]/20">
              {error}
            </p>
          )}

          {/* Fetched Name Notification */}
          <div className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#eceef0] rounded-xl text-xs text-[#434656] font-medium">
            <CheckCircle2 className="w-4 h-4 text-[#003ec7]" />
            <span>We've verified your identity via Google</span>
          </div>
        </div>
      </form>

      {/* Footer Continue Action */}
      <div className="pt-8 space-y-3">
        <button
          onClick={handleSubmit}
          className="w-full bg-[#003ec7] hover:bg-[#0052ff] text-white font-semibold py-4 rounded-xl shadow-lg transition-all duration-200 active:scale-[0.98]"
        >
          Continue
        </button>
        <p className="text-center text-[11px] text-[#737688]">
          By continuing, you agree to receive important operational updates.
        </p>
      </div>
    </div>
  )
}
