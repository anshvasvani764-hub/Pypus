'use client'

import { useState } from 'react'
import { useOnboarding } from '@/context/OnboardingContext'
import { Building } from 'lucide-react'

export default function StepBusinessName() {
  const { bizName, setBizName, selectedTemplate, nextStep } = useOnboarding()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = bizName.trim()
    if (!trimmed) {
      setError(`Please enter your ${selectedTemplate?.name?.toLowerCase() || 'business'} name`)
      return
    }
    setError(null)
    nextStep()
  }

  const entityTitle = selectedTemplate?.name ? selectedTemplate.name.toLowerCase() : 'business'

  return (
    <div className="flex-grow flex flex-col justify-between px-4 py-8 max-w-2xl mx-auto w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Section */}
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#191c1e]">
            What's your {entityTitle} called?
          </h2>
          <p className="text-base text-[#434656]">
            This will be your official workspace name.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#c3c5d9]/40 shadow-[0_4px_20px_rgba(0,0,0,0.04)] space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="bizName"
              className="text-xs font-semibold text-[#434656] uppercase tracking-wider block"
            >
              {selectedTemplate?.name || 'Business'} Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#737688]">
                <Building className="w-5 h-5" />
              </div>
              <input
                id="bizName"
                type="text"
                value={bizName}
                onChange={(e) => {
                  setBizName(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="e.g. Iron & Grace Studio"
                autoFocus
                className="w-full h-14 pl-12 pr-4 rounded-xl border border-[#c3c5d9] bg-[#f7f9fb] text-[#191c1e] text-base placeholder:text-[#737688] focus:bg-white focus:ring-2 focus:ring-[#003ec7] focus:border-[#003ec7] transition-all outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-[#ba1a1a] bg-[#ffdad6] p-3 rounded-lg border border-[#ba1a1a]/20">
              {error}
            </p>
          )}
        </div>
      </form>

      {/* Footer Continue Action */}
      <div className="pt-8">
        <button
          onClick={handleSubmit}
          className="w-full bg-[#003ec7] hover:bg-[#0052ff] text-white font-semibold py-4 rounded-xl shadow-lg transition-all duration-200 active:scale-[0.98]"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
