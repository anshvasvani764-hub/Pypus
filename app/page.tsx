import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LandingPage from '@/components/landing/LandingPage'

export default async function RootPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Unauthenticated visitors land on the public landing page at "/"
  // instead of being redirected to /login.
  if (!user) {
    return <LandingPage />
  }

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
      redirect(`/${ws.slug}`)
    }
  }

  const { data: memberRow } = await supabase
    .from('members')
    .select('workspace_id')
    .eq('auth_user_id', user.id)
    .limit(1)
    .single()

  if (memberRow) {
    redirect(`/m/${memberRow.workspace_id}/checkin`)
  }

  redirect('/onboarding')
}