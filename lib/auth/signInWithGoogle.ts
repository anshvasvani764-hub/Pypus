'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * Triggers the Google OAuth flow directly (used from landing page CTAs
 * so users skip the intermediate /login page entirely).
 * On success the browser is redirected to Google's account chooser.
 * Throws on failure so the caller can fall back to /login?error=auth_failed.
 */
export async function signInWithGoogle() {
  const supabase = createClient()
  const origin = window.location.origin

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    throw error
  }
}
