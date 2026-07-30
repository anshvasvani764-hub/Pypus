/**
 * /m/[workspaceId] — Member QR entry point.
 *
 * Server component that:
 * 1. Reads the Supabase session.
 * 2. No session  → renders MemberLoginScreen (Google OAuth).
 * 3. Session found, no member row → renders MemberOnboardingForm (phone only).
 * 4. Session found, member row exists → redirects to /m/[workspaceId]/checkin.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { MemberLoginScreen } from './_components/MemberLoginScreen'
import { MemberOnboardingForm } from './_components/MemberOnboardingForm'

export const dynamic = 'force-dynamic'

export default async function MemberEntryPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params

  // --- 1. Session check ---
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Not logged in → show Google sign-in screen
    return <MemberLoginScreen workspaceId={workspaceId} />
  }

  // --- 2. Look up member row ---
  const service = createServiceClient()

  // Also fetch workspace name for a friendlier UI
  const [{ data: memberRow }, { data: workspace }] = await Promise.all([
    service
      .from('members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('auth_user_id', user.id)
      .single(),
    service
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single(),
  ])

  if (memberRow) {
    // Already a member → go straight to check-in
    redirect(`/m/${workspaceId}/checkin`)
  }

  const workspaceName = workspace?.name ?? 'the gym'

  // --- 3. Show phone-number onboarding form ---
  return (
    <MemberOnboardingForm
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      userName={
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split('@')[0] ??
        'there'
      }
      userEmail={user.email ?? ''}
      userAvatar={user.user_metadata?.avatar_url ?? null}
    />
  )
}
