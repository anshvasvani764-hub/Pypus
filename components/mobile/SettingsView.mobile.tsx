'use client'

import { useState } from 'react'
import { Search, User, Headset, MessageSquare, Send, CheckCircle2, Phone } from 'lucide-react'
import { updateProfileSettings } from '@/app/actions/settings'
import type { Plan } from '@/lib/members/types'

interface Props {
  workspaceId: string
  initialFullName: string
  initialBusinessName: string
  plans: Plan[]
}

export function SettingsView({
  workspaceId,
  initialFullName,
  initialBusinessName,
  plans,
}: Props) {
  const [fullName, setFullName] = useState(initialFullName)
  const [businessName, setBusinessName] = useState(initialBusinessName)
  const [isSaving, setIsSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setSavedMsg(false)
    setErrorMsg(null)
    const result = await updateProfileSettings({ workspaceId, fullName, businessName })
    setIsSaving(false)
    if (result.success) {
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 3000)
    } else {
      setErrorMsg(result.error ?? 'Could not save')
    }
  }

  const activePlan = plans.find((p) => p.status === 'active') ?? plans[0]

  return (
    <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface pb-32">
      {/* Top App Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-ve-surface/80 px-5 py-3 backdrop-blur-xl border-b border-ve-outline-variant/30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-ve-primary-container flex items-center justify-center font-black text-ve-on-primary-container text-xl">
            P
          </div>
          <span className="font-headline-lg-mobile text-headline-lg-mobile font-black text-ve-primary text-xl">Pypus</span>
        </div>
        <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-ve-primary/5 transition-colors active:scale-95">
          <Search size={20} className="text-ve-primary" />
        </button>
      </header>

      <main className="px-5 pt-6 space-y-6">
        {/* Page Title */}
        <section>
          <h1 className="text-2xl font-black text-ve-on-surface">Settings</h1>
          <p className="text-sm text-ve-on-surface-variant mt-0.5">Manage your account and preferences</p>
        </section>

        {/* Profile Section */}
        <section className="bg-ve-surface-container-low rounded-2xl p-5 shadow-sm space-y-4 border border-ve-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-ve-primary-container rounded-full text-ve-on-primary-container">
              <User size={20} />
            </div>
            <h2 className="text-lg font-bold">Profile</h2>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-ve-primary uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 bg-white border-2 border-ve-outline-variant/30 rounded-xl focus:border-ve-primary focus:ring-0 transition-all text-sm font-medium outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-ve-primary uppercase tracking-wider">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full p-3 bg-white border-2 border-ve-outline-variant/30 rounded-xl focus:border-ve-primary focus:ring-0 transition-all text-sm font-medium outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-ve-primary text-white font-bold text-xs py-3.5 px-6 rounded-full shadow-[0_4px_14px_rgba(0,110,22,0.15)] hover:brightness-110 active:scale-95 transition-all w-full disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
            {savedMsg && (
              <span className="flex items-center gap-1 text-xs font-bold text-ve-primary">
                <CheckCircle2 size={16} /> Saved!
              </span>
            )}
          </div>
          {errorMsg && <p className="text-xs font-semibold text-ve-error">{errorMsg}</p>}
        </section>

        {/* Plan Details */}
        <section className="bg-ve-secondary text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">Current Plan</span>
              <h2 className="text-2xl font-black">{activePlan ? activePlan.name : 'Enterprise Elite'}</h2>
              <p className="text-xs opacity-80 mt-1">Next billing cycle: Oct 24, 2026</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 self-start">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black">{activePlan ? `₹${activePlan.price}` : '₹4,999'}</span>
                <span className="text-xs font-bold opacity-80">/{activePlan?.duration ?? 'year'}</span>
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -top-10 h-40 w-40 bg-white/10 rounded-full blur-3xl" />
        </section>

        {/* Action Grid */}
        <div className="grid grid-cols-1 gap-4">
          {/* Customer Support */}
          <section className="bg-ve-surface-container-high rounded-2xl p-5 flex flex-col justify-between items-start border border-ve-outline-variant/10">
            <div className="space-y-2 mb-4">
              <Headset size={36} className="text-ve-secondary" />
              <h3 className="text-lg font-bold">Customer Support</h3>
              <p className="text-xs text-ve-on-surface-variant leading-relaxed">
                Need help? Our dedicated agents are available 24/7 for you.
              </p>
            </div>
            <a
              href="tel:18001234567"
              className="flex items-center gap-2 bg-white text-ve-secondary font-bold text-xs py-3 px-5 rounded-full border-2 border-ve-secondary/20 hover:bg-ve-secondary/5 transition-all"
            >
              <Phone size={16} />
              Call Support
            </a>
          </section>

          {/* Feedback */}
          <section className="bg-ve-tertiary-container rounded-2xl p-5 flex flex-col justify-between items-start border border-ve-outline-variant/10">
            <div className="space-y-2 mb-4">
              <MessageSquare size={36} className="text-ve-tertiary" />
              <h3 className="text-lg font-bold text-ve-on-tertiary-container">Feedback</h3>
              <p className="text-xs text-ve-on-tertiary-container/80 leading-relaxed">
                Help us improve Pypus. Share your ideas and report issues.
              </p>
            </div>
            <button className="flex items-center gap-2 bg-ve-tertiary text-white font-bold text-xs py-3 px-5 rounded-full hover:brightness-110 transition-all">
              <Send size={16} />
              Send Feedback
            </button>
          </section>
        </div>

        {/* System Status Footer */}
        <footer className="py-6 flex flex-col items-center justify-center text-center space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-ve-primary animate-pulse" />
            <span className="text-[10px] font-bold text-ve-on-surface-variant tracking-wider uppercase">
              SYSTEMS OPERATIONAL
            </span>
          </div>
          <p className="text-[10px] font-bold text-ve-outline uppercase tracking-widest">v2.4.0-build.82</p>
        </footer>
      </main>
    </div>
  )
}
