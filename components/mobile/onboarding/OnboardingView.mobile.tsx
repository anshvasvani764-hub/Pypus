'use client'

import { useState } from 'react'
import { useOnboarding } from '@/context/OnboardingContext'
import {
  Dumbbell, Scissors, GraduationCap, Utensils,
  Building2, Smartphone, MapPin, CheckCircle2,
  ArrowLeft, Check, Sparkles, Loader2
} from 'lucide-react'

export function OnboardingViewMobile() {
  const {
    step,
    prevStep,
    nextStep,
    selectedTemplate,
    setSelectedTemplate,
    bizName,
    setBizName,
    phone,
    setPhone,
    location,
    setLocation,
    state,
    setState,
    isSubmitting,
    creationError,
    submitOnboarding,
  } = useOnboarding()

  const [bizError, setBizError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [locError, setLocError] = useState<string | null>(null)

  const progressPercent = Math.min((step / 4) * 100, 100)

  // Step 1: Industry Submit
  const handleSelectIndustry = (templateId: string) => {
    setSelectedTemplate({
      id: templateId,
      slug: templateId,
      name: templateId === 'gym' ? 'Gym & Fitness' : templateId,
    })
    nextStep()
  }

  // Step 2: Business Name Submit
  const handleBizSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!bizName.trim()) {
      setBizError('Please enter your business name.')
      return
    }
    setBizError(null)
    nextStep()
  }

  // Step 3: Phone Submit
  const handlePhoneSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const cleanPhone = phone.trim()
    const indianMobileRegex = /^[6-9]\d{9}$/
    if (!indianMobileRegex.test(cleanPhone)) {
      setPhoneError('Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.')
      return
    }
    setPhoneError(null)
    nextStep()
  }

  // Step 4: Location Submit
  const handleLocSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!location.trim()) {
      setLocError('Please enter your city.')
      return
    }
    setLocError(null)
    nextStep() // moves to step 5
    await submitOnboarding()
  }

  return (
    <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface flex flex-col justify-between selection:bg-ve-primary selection:text-white">
      {/* Top Header & Progress */}
      <div className="sticky top-0 z-50 bg-ve-surface/90 backdrop-blur-md border-b border-ve-outline-variant/30">
        <div className="flex justify-between items-center px-5 pt-4 pb-2">
          <button
            onClick={prevStep}
            disabled={step <= 1 || step >= 5}
            aria-label="Go back"
            className={`p-2 rounded-full text-ve-primary hover:bg-ve-primary/5 transition-all active:scale-95 flex items-center justify-center ${
              step <= 1 || step >= 5 ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-ve-primary tracking-wide">
            {step < 5 ? `Step ${step} of 4` : 'Setting Up'}
          </span>
          <span className="text-xs font-bold text-ve-on-surface-variant">
            {step < 5 ? `${progressPercent}%` : '100%'}
          </span>
        </div>
        <div className="h-2 w-full bg-ve-surface-container">
          <div
            className="h-full bg-ve-primary-container transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col px-5 py-6 max-w-md mx-auto w-full">
        {/* STEP 1: CHOOSE INDUSTRY (Screen 16) */}
        {step === 1 && (
          <div className="flex-1 flex flex-col justify-between space-y-6">
            <div>
              <h1 className="text-2xl font-black text-ve-on-surface mb-1">What's your business?</h1>
              <p className="text-sm text-ve-on-surface-variant/80">Choose the industry that best fits your daily operations.</p>
              
              <div className="space-y-3 mt-6">
                {/* Gym & Fitness (Active) */}
                <button
                  onClick={() => handleSelectIndustry('gym')}
                  className="w-full text-left p-4 bg-white border-2 border-ve-primary rounded-2xl shadow-[0_0_20px_2px_rgba(0,255,65,0.15)] flex items-center justify-between active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-ve-primary-container flex items-center justify-center text-ve-on-primary-container shrink-0">
                      <Dumbbell size={24} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-ve-on-surface">Gym &amp; Fitness</h3>
                      <p className="text-xs text-ve-on-surface-variant">Membership management &amp; schedules</p>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-ve-primary flex items-center justify-center text-white shrink-0">
                    <Check size={16} />
                  </div>
                </button>

                {/* Salon (Coming soon) */}
                <div className="p-4 bg-ve-surface-container-low border-2 border-ve-outline-variant/30 rounded-2xl opacity-60 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-ve-surface-container-high flex items-center justify-center text-ve-on-surface-variant shrink-0">
                    <Scissors size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-ve-on-surface-variant">Beauty &amp; Salon</h3>
                      <span className="px-2 py-0.5 bg-ve-secondary-container text-ve-on-secondary-container text-[9px] font-bold rounded uppercase">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-xs text-ve-on-surface-variant">Appointments &amp; client history</p>
                  </div>
                </div>

                {/* Coaching (Coming soon) */}
                <div className="p-4 bg-ve-surface-container-low border-2 border-ve-outline-variant/30 rounded-2xl opacity-60 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-ve-surface-container-high flex items-center justify-center text-ve-on-surface-variant shrink-0">
                    <GraduationCap size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-ve-on-surface-variant">Coaching</h3>
                      <span className="px-2 py-0.5 bg-ve-secondary-container text-ve-on-secondary-container text-[9px] font-bold rounded uppercase">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-xs text-ve-on-surface-variant">1-on-1 sessions &amp; progress tracking</p>
                  </div>
                </div>

                {/* Restaurant (Coming soon) */}
                <div className="p-4 bg-ve-surface-container-low border-2 border-ve-outline-variant/30 rounded-2xl opacity-60 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-ve-surface-container-high flex items-center justify-center text-ve-on-surface-variant shrink-0">
                    <Utensils size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-ve-on-surface-variant">Restaurant</h3>
                      <span className="px-2 py-0.5 bg-ve-secondary-container text-ve-on-secondary-container text-[9px] font-bold rounded uppercase">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-xs text-ve-on-surface-variant">Orders, tables &amp; inventory</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: BUSINESS NAME (Screen 15) */}
        {step === 2 && (
          <form onSubmit={handleBizSubmit} className="flex-1 flex flex-col justify-between space-y-6">
            <div>
              <h1 className="text-2xl font-black text-ve-on-surface mb-1">
                What's your {selectedTemplate?.name?.toLowerCase() || 'gym'} called?
              </h1>
              <p className="text-sm text-ve-on-surface-variant/80">This will be your official workspace name.</p>

              <div className="bg-white p-5 rounded-2xl border border-ve-outline-variant/40 shadow-sm mt-6 space-y-3">
                <label className="text-[10px] font-bold text-ve-primary uppercase tracking-wider block">
                  {selectedTemplate?.name || 'Business'} Name
                </label>
                <div className="relative">
                  <Building2 size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-ve-outline" />
                  <input
                    type="text"
                    value={bizName}
                    onChange={(e) => {
                      setBizName(e.target.value)
                      if (bizError) setBizError(null)
                    }}
                    placeholder="e.g. Iron & Grace Studio"
                    autoFocus
                    className="w-full h-14 pl-12 pr-4 rounded-xl border border-ve-outline-variant/40 bg-ve-surface-container-low text-ve-on-surface text-base font-medium focus:bg-white focus:ring-2 focus:ring-ve-primary focus:border-ve-primary transition-all outline-none"
                  />
                </div>
                {bizError && (
                  <p className="text-xs font-semibold text-ve-error bg-ve-error-container p-3 rounded-xl">
                    {bizError}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-ve-primary text-white font-bold py-4 rounded-xl shadow-[0_4px_14px_rgba(0,110,22,0.2)] active:scale-[0.98] transition-all text-sm"
            >
              Continue
            </button>
          </form>
        )}

        {/* STEP 3: PHONE VERIFICATION (Screen 18) */}
        {step === 3 && (
          <form onSubmit={handlePhoneSubmit} className="flex-1 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex justify-center pt-2 mb-4">
                <div className="w-20 h-20 bg-ve-primary/10 rounded-full flex items-center justify-center text-ve-primary shadow-inner">
                  <Smartphone size={36} />
                </div>
              </div>
              <h1 className="text-2xl font-black text-center text-ve-on-surface mb-1">Verification</h1>
              <p className="text-sm text-center text-ve-on-surface-variant/80 max-w-[280px] mx-auto">
                Enter your phone number to stay updated.
              </p>

              <div className="bg-white p-5 rounded-2xl border border-ve-outline-variant/40 shadow-sm mt-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-ve-primary uppercase tracking-wider block">
                    Phone Number
                  </label>
                  <div className="flex items-center bg-ve-surface-container-low border border-ve-outline-variant/40 rounded-xl px-4 py-3 focus-within:border-ve-primary focus-within:bg-white transition-all">
                    <span className="pr-3 border-r border-ve-outline-variant/40 text-sm font-bold text-ve-on-surface select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '').slice(0, 10)
                        setPhone(raw)
                        if (phoneError) setPhoneError(null)
                      }}
                      placeholder="00000 00000"
                      autoFocus
                      className="flex-1 bg-transparent border-none focus:ring-0 text-ve-on-surface font-bold text-lg placeholder:text-ve-outline pl-3 outline-none"
                    />
                  </div>
                </div>

                {phoneError && (
                  <p className="text-xs font-semibold text-ve-error bg-ve-error-container p-3 rounded-xl">
                    {phoneError}
                  </p>
                )}

                <div className="flex items-center justify-center gap-2 py-2.5 px-3 bg-ve-surface-container rounded-xl text-xs text-ve-on-surface-variant font-medium">
                  <CheckCircle2 size={16} className="text-ve-primary" />
                  <span>We've verified your identity via Google</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-ve-primary text-white font-bold py-4 rounded-xl shadow-[0_4px_14px_rgba(0,110,22,0.2)] active:scale-[0.98] transition-all text-sm"
            >
              Continue
            </button>
          </form>
        )}

        {/* STEP 4: BUSINESS LOCATION (Screen 17) */}
        {step === 4 && (
          <form onSubmit={handleLocSubmit} className="flex-1 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex justify-center pt-2 mb-4">
                <div className="w-20 h-20 bg-ve-primary/10 rounded-full flex items-center justify-center text-ve-primary shadow-inner">
                  <MapPin size={36} />
                </div>
              </div>
              <h1 className="text-2xl font-black text-center text-ve-on-surface mb-1">Where is your business?</h1>
              <p className="text-sm text-center text-ve-on-surface-variant/80 max-w-[280px] mx-auto">
                Help members find your facility easily.
              </p>

              <div className="bg-white p-5 rounded-2xl border border-ve-outline-variant/40 shadow-sm mt-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-ve-primary uppercase tracking-wider block">
                    City / Town
                  </label>
                  <input
                    type="text"
                     value={location}
                     onChange={(e) => {
                       setLocation(e.target.value)
                       if (locError) setLocError(null)
                     }}
                    placeholder="e.g. Mumbai, Indiranagar, etc."
                    autoFocus
                    className="w-full h-14 px-4 rounded-xl border border-ve-outline-variant/40 bg-ve-surface-container-low text-ve-on-surface text-base font-medium focus:bg-white focus:ring-2 focus:ring-ve-primary focus:border-ve-primary transition-all outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-ve-primary uppercase tracking-wider block">
                    State (Optional)
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Maharashtra"
                    className="w-full h-14 px-4 rounded-xl border border-ve-outline-variant/40 bg-ve-surface-container-low text-ve-on-surface text-base font-medium focus:bg-white focus:ring-2 focus:ring-ve-primary focus:border-ve-primary transition-all outline-none"
                  />
                </div>

                {locError && (
                  <p className="text-xs font-semibold text-ve-error bg-ve-error-container p-3 rounded-xl">
                    {locError}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-ve-primary text-white font-bold py-4 rounded-xl shadow-[0_4px_14px_rgba(0,110,22,0.2)] active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Workspace...
                </>
              ) : (
                'Create My Workspace'
              )}
            </button>
          </form>
        )}

        {/* STEP 5: SETTING UP WORKSPACE (Screen 18b Loading / Success) */}
        {step === 5 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-12">
            <div className="w-24 h-24 rounded-full bg-ve-primary-container flex items-center justify-center text-ve-on-primary-container shadow-2xl animate-pulse">
              {isSubmitting ? (
                <Loader2 className="w-12 h-12 animate-spin text-ve-primary" />
              ) : (
                <CheckCircle2 className="w-12 h-12 text-ve-primary" />
              )}
            </div>

            <div>
              <h1 className="text-2xl font-black text-ve-on-surface">
                {isSubmitting ? 'Setting up your workspace...' : 'All set! Launching Pypus...'}
              </h1>
              <p className="text-xs text-ve-on-surface-variant mt-2 max-w-[280px] mx-auto">
                {isSubmitting
                  ? 'Configuring your modules, members registry, and fee ledgers.'
                  : 'Your workspace is ready. Redirecting you to your dashboard now.'}
              </p>
            </div>

            {creationError && (
              <p className="text-xs font-semibold text-ve-error bg-ve-error-container p-3 rounded-xl max-w-sm">
                {creationError}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
