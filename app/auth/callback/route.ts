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
      const userId = sessionData.user.id

      const { data: memberRow } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces(id, slug)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .single()

      if (memberRow && memberRow.workspaces) {
        const wsSlug = (memberRow.workspaces as any).slug
        return NextResponse.redirect(`${origin}/${wsSlug}`)
      } else {
        return NextResponse.redirect(`${origin}/onboarding`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
