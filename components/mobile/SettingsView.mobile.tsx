'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, User, Headset, MessageSquare, Send, CheckCircle2, Phone, CreditCard, LogOut } from 'lucide-react'
import { MobileTopBar } from '@/components/mobile/MobileTopBar'
import { updateProfileSettings } from '@/app/actions/settings'
import { createClient } from '@/lib/supabase/client'

interface Props {
  workspaceId: string
  workspaceSlug: string
  initialFullName: string
  initialBusinessName: string
  plans: any[]
}

export function SettingsView({
  workspaceId,
  workspaceSlug,
  initialFullName,
  initialBusinessName,
  plans,
}: Props) {
  const [fullName, setFullName] = useState(initialFullName)
  const [businessName, setBusinessName] = useState(initialBusinessName)
  const [isSaving, setIsSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

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

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface pb-32">
      <MobileTopBar
        title="Settings"
        label="Pypus"
        workspaceSlug={workspaceSlug}
        backHref={`/${workspaceSlug}/workspace`}
      />

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

        {/* Plans — link to dedicated Plans page */}
        <Link
          href={`/${workspaceSlug}/fees/plans`}
          className="block bg-ve-surface-container-low rounded-2xl p-5 shadow-sm border border-ve-outline-variant/20 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-ve-primary-container rounded-full text-ve-on-primary-container">
                <CreditCard size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Plans</h2>
                <p className="text-xs text-ve-on-surface-variant">
                  {plans.length} plan{plans.length !== 1 ? 's' : ''} configured
                </p>
              </div>
            </div>
            <div className="text-xs font-bold text-ve-primary uppercase tracking-wider">
              Manage →
            </div>
          </div>
        </Link>

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
              href="tel:+917827621580"
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
            <a
              href={`https://wa.me/917827621580?text=${encodeURIComponent('Hi Ansh, this is ' + (fullName.trim() || 'there') + '. I\'m using Pypus to run ' + (businessName.trim() || 'my gym') + ' and I\'d like to share some feedback:')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-ve-tertiary text-white font-bold text-xs py-3 px-5 rounded-full hover:brightness-110 transition-all"
            >
              <Send size={16} />
              Send Feedback
            </a>
          </section>
        </div>

        {/* Sign Out */}
        <section className="bg-ve-surface-container-low rounded-2xl p-5 shadow-sm border border-ve-outline-variant/20">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            <LogOut size={18} />
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </section>

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
