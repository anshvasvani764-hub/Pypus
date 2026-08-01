'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Loader2 } from 'lucide-react'

export function LoginPageDesktop() {
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
    <div className="bg-[#f7f9fb] text-[#191c1e] min-h-screen flex flex-col items-center justify-center px-4 font-sans relative selection:bg-[#0052ff] selection:text-white">
      {/* Decorative Gradient Bar */}
      <div className="h-1 bg-gradient-to-r from-[#003ec7]/10 via-[#003ec7] to-[#003ec7]/10 w-full fixed top-0 left-0" />

      {/* Main Login Card */}
      <main className="w-full max-w-[440px] flex flex-col items-center text-center z-10 py-12 px-6 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-[#c3c5d9]/40 transition-all">
        {/* Logo Section */}
        <div className="mb-6 p-4 bg-[#f2f4f6] rounded-2xl shadow-sm text-[#003ec7] flex items-center justify-center">
          <Building2 className="w-10 h-10 stroke-[2]" />
        </div>

        {/* Header Text */}
        <div className="space-y-3 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#191c1e]">
            Manage your business with ease.
          </h1>
          <p className="text-sm md:text-base text-[#434656] max-w-[320px] mx-auto leading-relaxed">
            A powerful management tool for gym owners and service professionals.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="w-full mb-6 p-3 rounded-xl bg-[#ffdad6] text-[#93000a] text-xs font-semibold text-left border border-[#ba1a1a]/20">
            {errorMsg}
          </div>
        )}

        {/* Action Button */}
        <div className="w-full space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="group relative w-full flex items-center justify-center gap-3 bg-[#003ec7] hover:bg-[#0052ff] text-white py-4 px-6 rounded-xl font-semibold text-base transition-all duration-200 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
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
        </div>

        {/* Microcopy Terms */}
        <p className="mt-8 text-xs text-[#737688] max-w-[280px]">
          By continuing, you agree to our{' '}
          <span className="underline hover:text-[#003ec7] cursor-pointer">Terms of Service</span> and{' '}
          <span className="underline hover:text-[#003ec7] cursor-pointer">Privacy Policy</span>.
        </p>
      </main>

      {/* Decorative Bottom Bar */}
      <div className="h-1 bg-gradient-to-r from-[#003ec7]/10 via-[#003ec7] to-[#003ec7]/10 w-full fixed bottom-0 left-0" />
    </div>
  )
}
