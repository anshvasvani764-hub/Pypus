'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

const DEV_TEST_EMAIL = process.env.NEXT_PUBLIC_DEV_TEST_EMAIL
const DEV_TEST_PASSWORD = process.env.NEXT_PUBLIC_DEV_TEST_PASSWORD
const DEV_WORKSPACE_SLUG = '11f-1603'

export function LocalDevLogin() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const login = async () => {
      if (!DEV_TEST_EMAIL || !DEV_TEST_PASSWORD) {
        setError('Local dev login is not configured. Add NEXT_PUBLIC_DEV_TEST_EMAIL and NEXT_PUBLIC_DEV_TEST_PASSWORD to .env.local.')
        return
      }

      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: DEV_TEST_EMAIL,
        password: DEV_TEST_PASSWORD,
      })

      if (cancelled) return

      if (signInError) {
        setError(`Local dev login failed: ${signInError.message}`)
        return
      }

      router.replace(`/${DEV_WORKSPACE_SLUG}`)
      router.refresh()
    }

    login()

    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-black text-white px-6 text-center">
      {error ? (
        <>
          <p className="text-sm font-semibold">Local dev login failed</p>
          <p className="max-w-md text-xs text-white/60">{error}</p>
        </>
      ) : (
        <>
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-sm text-white/70">Signing in to local Pypus test workspace…</p>
        </>
      )}
    </main>
  )
}
