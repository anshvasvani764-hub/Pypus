'use client'

import React from 'react'
import { OnboardingProvider, useOnboarding } from '@/context/OnboardingContext'
import { ArrowLeft as ArrowLeftIcon } from 'lucide-react'

function OnboardingHeader() {
  const { step, prevStep } = useOnboarding()

  // Calculate progress percentage
  const progressPercent = Math.min((step / 4) * 100, 100)

  return (
    <header className="sticky top-0 z-50 bg-[#f7f9fb]/90 backdrop-blur-md border-b border-[#c3c5d9]/30">
      {/* Top progress bar */}
      <div className="w-full bg-[#e0e3e5] h-1">
        <div
          className="bg-[#003ec7] h-1 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <nav className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
        <button
          onClick={prevStep}
          disabled={step <= 1 || step >= 5}
          aria-label="Go back"
          className={`p-2 rounded-full text-[#003ec7] hover:bg-[#f2f4f6] transition-all active:scale-95 flex items-center justify-center ${
            step <= 1 || step >= 5 ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>

        <h1 className="font-bold text-lg text-[#003ec7] tracking-tight">Management App</h1>

        <div className="text-xs font-semibold uppercase tracking-wider text-[#434656] w-20 text-right">
          {step < 5 ? `Step ${step} of 4` : ''}
        </div>
      </nav>
    </header>
  )
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      <div className="bg-[#f7f9fb] text-[#191c1e] min-h-screen flex flex-col font-sans selection:bg-[#0052ff] selection:text-white">
        <OnboardingHeader />
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    </OnboardingProvider>
  )
}
