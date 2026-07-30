import { createClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client using the service-role key.
 * This bypasses RLS — only use inside Next.js Server Actions after
 * independently validating the caller's session.
 * Never import this from a client component.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
