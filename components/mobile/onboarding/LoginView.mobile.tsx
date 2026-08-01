'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Loader2, AlertCircle } from 'lucide-react'

export function LoginViewMobile() {
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

  return (
    <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface flex flex-col items-center justify-center p-5 relative overflow-hidden">
      {/* Atmospheric Background Shader */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ve-surface-container-high via-ve-surface to-ve-primary/10" />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-ve-primary/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-ve-secondary/15 blur-[150px]" />
      </div>

      {/* Main Login Container */}
      <main className="w-full max-w-[440px] z-10 flex flex-col items-center">
        {/* Branding */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 text-ve-primary p-3 bg-ve-primary-container rounded-2xl shadow-lg rotate-3">
            <Building2 className="w-10 h-10" />
          </div>
          <h1 className="font-black text-4xl text-ve-on-surface tracking-tight">Pypus</h1>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/40 w-full rounded-[2rem] shadow-2xl p-6 sm:p-8 flex flex-col items-center relative overflow-hidden">
          {/* Error Banner */}
          {errorMsg && (
            <div className="w-full mb-4 p-3 bg-ve-error-container text-ve-on-error-container rounded-xl flex items-center gap-2 text-xs font-semibold">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Header Text */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-ve-on-surface leading-snug">
              Manage your business with ease.
            </h2>
            <p className="text-xs text-ve-on-surface-variant max-w-[300px] mx-auto mt-2 leading-relaxed">
              A powerful management tool for gym owners and service professionals.
            </p>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-ve-primary text-white py-4 px-6 rounded-xl font-bold text-sm shadow-[0_4px_14px_rgba(0,110,22,0.25)] hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
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

          {/* Microcopy Terms */}
          <p className="mt-8 text-[11px] text-ve-on-surface-variant/70 text-center max-w-[280px]">
            By continuing, you agree to our{' '}
            <span className="underline hover:text-ve-primary cursor-pointer">Terms of Service</span> and{' '}
            <span className="underline hover:text-ve-primary cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </main>
    </div>
  )
}
