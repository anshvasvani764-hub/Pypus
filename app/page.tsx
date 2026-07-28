import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 1. If not logged in -> redirect straight to login
  if (!user) {
    redirect('/login')
  }

  // 2. If logged in -> check workspace membership
  const { data: memberRow } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(id, slug)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (memberRow && memberRow.workspaces) {
    const slug = (memberRow.workspaces as any).slug
    redirect(`/${slug}`)
  } else {
    redirect('/onboarding')
  }
}