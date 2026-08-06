import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const host = request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || 'http'
  const origin = `${protocol}://${host}`

  if (code) {
    const supabase = await createClient()
    const { data: sessionData, error: sessionErr } = await supabase.auth.exchangeCodeForSession(code)

    if (!sessionErr && sessionData.user) {
      const user = sessionData.user
      const cleanUUID = (val: string | undefined | null) => (val === '' || val == null ? null : val)

      // Member QR self-check-in: if a `next` param was passed, redirect there
      // instead of running the staff workspace_members lookup.
      const next = searchParams.get('next')
      if (next && next.startsWith('/m/')) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // Upsert into public.users so every authenticated user has a profile row
      await supabase.from('users').upsert({
        id: cleanUUID(user.id),
        email: user.email ?? '',
        full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? '',
        avatar_url: user.user_metadata?.avatar_url ?? null,
        updated_at: new Date().toISOString(),
      })

      const { data: ownerRow } = await supabase
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single()

      if (ownerRow) {
        const { data: ws } = await supabase
          .from('workspaces')
          .select('slug')
          .eq('id', ownerRow.workspace_id)
          .single()

        if (ws?.slug) {
          return NextResponse.redirect(`${origin}/${ws.slug}`)
        }
      }

      const { data: memberRow } = await supabase
        .from('members')
        .select('workspace_id')
        .eq('auth_user_id', user.id)
        .limit(1)
        .single()

      if (memberRow) {
        return NextResponse.redirect(`${origin}/m/${memberRow.workspace_id}/checkin`)
      }

      // NEW: If logged-in user is not an owner or member, send them directly to onboarding
      return NextResponse.redirect(`${origin}/onboarding`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
