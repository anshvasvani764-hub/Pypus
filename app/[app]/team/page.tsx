import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { TeamView as TeamViewDesktop } from '@/components/team/TeamView';
import { TeamViewMobile } from '@/components/team/TeamView.mobile';
import { getDevice } from '@/lib/device';

export default async function TeamPage({
  params,
}: {
  params: Promise<{ app: string }>;
}) {
  const { app: workspaceSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const service = createServiceClient();

  const { data: workspace } = await service
    .from('workspaces')
    .select('id, name')
    .eq('slug', workspaceSlug)
    .single();

  const workspaceId = workspace?.id ?? '';

  const { data: members } = await service
    .from('workspace_members')
    .select('id, user_id, role, role_id, invited_by, is_active, joined_at')
    .eq('workspace_id', workspaceId)
    .order('joined_at', { ascending: true });

  const { data: roles } = await service
    .from('roles')
    .select('id, name')
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true });

  const userIds = (members ?? []).map((m) => m.user_id);
  const roleIds = (members ?? []).map((m) => m.role_id).filter(Boolean) as string[];
  const uniqueUserIds = [...new Set(userIds)];

  const [usersResult, rolesResult] = await Promise.all([
    uniqueUserIds.length
      ? service.from('users').select('id, full_name, email, avatar_url').in('id', uniqueUserIds)
      : Promise.resolve({ data: [] as any[] }),
    roleIds.length
      ? service.from('roles').select('id, name').in('id', roleIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const usersMap = new Map((usersResult.data ?? []).map((u) => [u.id, u]));
  const rolesMap = new Map((rolesResult.data ?? []).map((r) => [r.id, r]));

  const enrichedMembers = (members ?? []).map((m) => ({
    ...m,
    users: usersMap.get(m.user_id) || null,
    roles: m.role_id ? rolesMap.get(m.role_id) || null : null,
  }));

  if ((await getDevice()) === 'mobile') {
    return (
      <TeamViewMobile
        workspaceSlug={workspaceSlug}
        workspaceId={workspaceId}
        members={enrichedMembers}
        roles={roles ?? []}
        currentUserId={user.id}
      />
    );
  }

  return (
    <TeamViewDesktop
      workspaceSlug={workspaceSlug}
      workspaceId={workspaceId}
      members={enrichedMembers}
      roles={roles ?? []}
      currentUserId={user.id}
    />
  );
}
