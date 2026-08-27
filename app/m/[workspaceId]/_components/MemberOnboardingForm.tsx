'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { User, Phone, Loader2, CheckCircle } from 'lucide-react'
import { registerMember } from '@/app/actions/member-checkin'

interface MemberOnboardingFormProps {
  workspaceId: string
  workspaceName: string
  userEmail: string
  userAvatar: string | null
}

export function MemberOnboardingForm({
  workspaceId,
  workspaceName,
  userEmail,
  userAvatar,
}: MemberOnboardingFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    if (trimmedName.length < 2) {
      setError('Please enter your name.')
      return
    }

    startTransition(async () => {
      const result = await registerMember(workspaceId, trimmedName, phone)
      if (result.error) {
        setError(result.error)
      } else {
        router.push(`/m/${workspaceId}/checkin`)
      }
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-[#0a0c0f]">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#00ff88]/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm flex flex-col gap-7">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <p className="text-xs font-semibold text-[#00ff88] uppercase tracking-widest">
            {workspaceName}
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            One last step
          </h1>
          <p className="text-[#6b7280] text-sm">
            Add your name and phone number to complete your gym profile.
          </p>
        </div>

        {/* Account preview (Google account being used to sign in) */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#111318] border border-[#1f2937]">
          {userAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userAvatar}
              alt="Account avatar"
              className="w-11 h-11 rounded-full object-cover ring-2 ring-[#00ff88]/20"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#00ff88]/30 to-[#00cc6a]/10 flex items-center justify-center text-[#00ff88] font-bold text-sm">
              <User className="w-5 h-5" />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <p className="text-white font-semibold text-sm truncate">Signed in</p>
            <p className="text-[#6b7280] text-xs truncate">{userEmail}</p>
          </div>
          <CheckCircle className="ml-auto w-4 h-4 text-[#00ff88] shrink-0" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="member-name" className="text-xs font-medium text-[#9ca3af] uppercase tracking-wider">
              Full Name
            </label>
            <div
              className={`flex items-center gap-3 bg-[#111318] border rounded-2xl px-4 py-3.5 transition-all ${
                error && name.trim().length < 2
                  ? 'border-[#ff4444]/50 shadow-[0_0_0_2px_rgba(255,68,68,0.15)]'
                  : 'border-[#1f2937] focus-within:border-[#00ff88]/40 focus-within:shadow-[0_0_0_2px_rgba(0,255,136,0.08)]'
              }`}
            >
              <User className="w-4 h-4 text-[#4b5563] shrink-0" />
              <input
                id="member-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setError(null)
                }}
                placeholder="Your full name"
                autoComplete="name"
                autoFocus
                disabled={isPending}
                className="flex-1 bg-transparent text-white placeholder:text-[#374151] text-base outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="member-phone" className="text-xs font-medium text-[#9ca3af] uppercase tracking-wider">
              Phone Number
            </label>
            <div
              className={`flex items-center gap-3 bg-[#111318] border rounded-2xl px-4 py-3.5 transition-all ${
                error && phone.trim().length < 5
                  ? 'border-[#ff4444]/50 shadow-[0_0_0_2px_rgba(255,68,68,0.15)]'
                  : 'border-[#1f2937] focus-within:border-[#00ff88]/40 focus-within:shadow-[0_0_0_2px_rgba(0,255,136,0.08)]'
              }`}
            >
              <Phone className="w-4 h-4 text-[#4b5563] shrink-0" />
              <input
                id="member-phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  setError(null)
                }}
                placeholder="+1 555 000 0000"
                autoComplete="tel"
                disabled={isPending}
                className="flex-1 bg-transparent text-white placeholder:text-[#374151] text-base outline-none disabled:opacity-50"
              />
            </div>
            {error && (
              <p className="text-xs text-[#ff6b6b] mt-0.5 pl-1">{error}</p>
            )}
          </div>

          <button
            id="member-register-submit"
            type="submit"
            disabled={isPending || name.trim().length < 2 || phone.trim().length < 5}
            className="w-full flex items-center justify-center gap-2 bg-[#00ff88] hover:bg-[#00e67a] text-[#0a0c0f] font-bold py-4 rounded-2xl text-base transition-all duration-200 shadow-[0_0_24px_rgba(0,255,136,0.25)] hover:shadow-[0_0_32px_rgba(0,255,136,0.35)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Registering…</span>
              </>
            ) : (
              'Complete Registration'
            )}
          </button>
        </form>

        <p className="text-xs text-[#374151] text-center">
          This information is only shared with your gym.
        </p>
      </div>
    </div>
  )
}
