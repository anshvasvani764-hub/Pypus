'use client'

import React from 'react'
import { OnboardingProvider, useOnboarding } from '@/context/OnboardingContext'
import { OnboardingAurora } from '@/components/onboarding/OnboardingAurora'
import { ArrowLeft as ArrowLeftIcon } from 'lucide-react'

function OnboardingHeader() {
  const { step, prevStep } = useOnboarding()

  // Calculate progress percentage
  const progressPercent = Math.min((step / 4) * 100, 100)

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'linear-gradient(to bottom, rgba(8,8,10,0.95) 65%, rgba(8,8,10,0) 100%)',
        paddingBottom: 14,
      }}
    >
      {/* Top progress bar */}
      <div className="w-full h-1" style={{ background: 'var(--onb-line)' }}>
        <div
          className="h-1 transition-all duration-500 ease-out"
          style={{ background: 'var(--onb-emerald)', width: `${progressPercent}%` }}
        />
      </div>

      <nav className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
        <button
          onClick={prevStep}
          disabled={step <= 1 || step >= 5}
          aria-label="Go back"
          className={`p-2 rounded-full transition-all active:scale-95 flex items-center justify-center hover:bg-white/5 ${
            step <= 1 || step >= 5 ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          style={{ color: 'var(--onb-emerald)' }}
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>

        <h1 className="font-bold text-base tracking-tight" style={{ color: 'var(--onb-ink)' }}>
          Pypus
        </h1>

        <div
          className="text-xs font-semibold uppercase tracking-wider w-20 text-right"
          style={{ color: 'var(--onb-muted)' }}
        >
          {step < 5 ? `Step ${step} of 4` : ''}
        </div>
      </nav>
    </header>
  )
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      <div className="onb-root min-h-screen flex flex-col font-sans relative selection:bg-emerald-500/30 selection:text-white">
        <OnboardingAurora />
        <div className="relative z-10 flex flex-col flex-1">
          <OnboardingHeader />
          <main className="flex-1 flex flex-col">{children}</main>
        </div>
      </div>
    </OnboardingProvider>
  )
}
