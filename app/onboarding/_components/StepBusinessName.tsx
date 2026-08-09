'use client'

import { useState } from 'react'
import { useOnboarding } from '@/context/OnboardingContext'
import { Building, ArrowRight } from 'lucide-react'

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full">
      <div>
        <span className="onb-eyebrow mb-4">
          <span />
          GET STARTED
        </span>
        <h2
          className="text-3xl font-extrabold tracking-tight mt-4 mb-2"
          style={{ letterSpacing: '-0.02em', color: 'var(--onb-ink)' }}
        >
          What's your {entityTitle} called?
        </h2>
        <p className="text-base" style={{ color: 'var(--onb-ink-soft)' }}>
          This will be your official workspace name.
        </p>
      </div>

      <div className="onb-card p-6 space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="bizName"
            className="text-xs font-semibold uppercase tracking-wider block"
            style={{ color: 'var(--onb-muted)' }}
          >
            {selectedTemplate?.name || 'Business'} Name
          </label>
          <div className="relative">
            <div
              className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
              style={{ color: 'var(--onb-muted)' }}
            >
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
              className="onb-input"
              style={{ paddingLeft: 48 }}
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
      </div>

      <button onClick={handleSubmit} type="submit" className="onb-btn-primary">
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  )
}
