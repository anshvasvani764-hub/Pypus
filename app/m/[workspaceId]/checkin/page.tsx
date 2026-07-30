/**
 * /m/[workspaceId]/checkin — Member self-check-in screen.
 *
 * Server component that validates session + member existence,
 * fetches member profile data, then renders the client-side CheckInScreen.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { CheckInScreen } from './_components/CheckInScreen'

export const dynamic = 'force-dynamic'

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params

  // 1. Validate session
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/m/${workspaceId}`)
  }

  // 2. Look up member row
  const service = createServiceClient()
  const { data: member } = await service
    .from('members')
    .select('id, name, avatar_url, email')
    .eq('workspace_id', workspaceId)
    .eq('auth_user_id', user.id)
    .single()

  if (!member) {
    // Member row doesn't exist yet → back to onboarding
    redirect(`/m/${workspaceId}`)
  }

  // 3. Fetch workspace name for display
  const { data: workspace } = await service
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .single()

  return (
    <CheckInScreen
      workspaceId={workspaceId}
      workspaceName={workspace?.name ?? 'Your Gym'}
      memberId={member.id}
      memberName={member.name}
      memberAvatar={member.avatar_url ?? null}
    />
  )
}
