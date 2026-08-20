'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { OnboardingAurora } from '@/components/onboarding/OnboardingAurora'

// Dev-only test-user bypass so you can test the dashboard locally without
// going through the real Google OAuth screen every time. It still creates a
// real Supabase session (via signInWithPassword) so everything downstream
// that calls supabase.auth.getUser() keeps working normally.
//
// Setup (one-time, in your Supabase project):
//   1. Dashboard -> Authentication -> Users -> Add user
//   2. Create one with an email/password of your choice, "Auto Confirm User" ON
//   3. Add to .env.local:
//        NEXT_PUBLIC_DEV_TEST_EMAIL=test@pypus.local
//        NEXT_PUBLIC_DEV_TEST_PASSWORD=whatever-you-set
// This button only renders when NODE_ENV === "development" and both env
// vars are set — it's a no-op (and invisible) in production builds.
const DEV_TEST_EMAIL = process.env.NEXT_PUBLIC_DEV_TEST_EMAIL
const DEV_TEST_PASSWORD = process.env.NEXT_PUBLIC_DEV_TEST_PASSWORD
const DEV_BYPASS_AVAILABLE =
  process.env.NODE_ENV === 'development' && !!DEV_TEST_EMAIL && !!DEV_TEST_PASSWORD

export function LoginPageDesktop() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      setErrorMsg(null)
      const supabase = createClient()
      const origin = window.location.origin

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      })

      if (error) {
        setErrorMsg(error.message)
        setIsLoading(false)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred during sign in'
      setErrorMsg(message)
      setIsLoading(false)
    }
  }

  const handleDevBypass = async () => {
    if (!DEV_TEST_EMAIL || !DEV_TEST_PASSWORD) return
    try {
      setIsLoading(true)
      setErrorMsg(null)
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithPassword({
        email: DEV_TEST_EMAIL,
        password: DEV_TEST_PASSWORD,
      })

      if (error) {
        setErrorMsg(`Dev bypass failed: ${error.message}`)
        setIsLoading(false)
        return
      }

      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred during dev sign in'
      setErrorMsg(message)
      setIsLoading(false)
    }
  }

  return (
    <div className="onb-root min-h-screen flex flex-col items-center justify-center px-4 font-sans relative selection:bg-emerald-500/30 selection:text-white">
      <OnboardingAurora />

      <main className="onb-card relative z-10 w-full max-w-[440px] flex flex-col items-center text-center py-12 px-8">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2.5">
          <img src="/logo.png" alt="Pypus logo" className="w-9 h-9 rounded-lg" />
          <span className="font-bold text-xl tracking-tight" style={{ color: 'var(--onb-ink)' }}>
            Pypus
          </span>
        </div>

        <span className="onb-eyebrow mb-5">
          <span />
          WELCOME BACK
        </span>

        {/* Header Text */}
        <div className="space-y-3 mb-8">
          <h1
            className="text-2xl md:text-3xl font-extrabold tracking-tight"
            style={{ letterSpacing: '-0.02em', color: 'var(--onb-ink)' }}
          >
            Run your gym like a system, not a scramble.
          </h1>
          <p className="text-sm md:text-base max-w-[320px] mx-auto leading-relaxed" style={{ color: 'var(--onb-ink-soft)' }}>
            Attendance, fee reminders and receipts that handle themselves — sign in to pick up where you left off.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            className="w-full mb-6 p-3 rounded-xl text-xs font-semibold text-left"
            style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}
          >
            {errorMsg}
          </div>
        )}

        {/* Action Button */}
        <div className="w-full space-y-4">
          <button onClick={handleGoogleLogin} disabled={isLoading} className="onb-btn-primary">
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Redirecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {DEV_BYPASS_AVAILABLE && (
            <button
              onClick={handleDevBypass}
              disabled={isLoading}
              className="w-full text-xs font-semibold py-2 rounded-lg border border-dashed"
              style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'var(--onb-ink-soft)' }}
            >
              🧪 Continue as test user (dev only)
            </button>
          )}
        </div>

        {/* Trust strip */}
        <div
          className="flex items-center justify-center gap-2 mt-8 py-2.5 px-3 rounded-xl text-xs font-medium w-full"
          style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--onb-ink-soft)' }}
        >
          <span style={{ color: 'var(--onb-emerald)' }}>●</span>
          <span>Trusted by gym owners across Gurugram — live in under 24 hours</span>
        </div>

        {/* Microcopy Terms */}
        <p className="mt-6 text-xs max-w-[280px]" style={{ color: 'var(--onb-muted)' }}>
          By continuing, you agree to our{' '}
          <span className="underline cursor-pointer hover:text-[var(--onb-emerald)]">Terms of Service</span> and{' '}
          <span className="underline cursor-pointer hover:text-[var(--onb-emerald)]">Privacy Policy</span>.
        </p>
      </main>
    </div>
  )
}
