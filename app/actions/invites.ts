'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { headers } from 'next/headers';

export interface GeneratedInvite {
  token: string;
  link: string;
  roleName: string;
}

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function generateInvite({
  workspaceId,
  roleId,
  roleName,
  createdBy,
}: {
  workspaceId: string;
  roleId: string;
  roleName: string;
  createdBy: string;
}): Promise<GeneratedInvite> {
  const supabase = await createClient();
  const service = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthenticated');
  }

  let resolvedRoleId = roleId.trim();
  let resolvedRoleName = roleName.trim();

  if (!resolvedRoleId && resolvedRoleName) {
    const { data: newRole, error: roleError } = await service
      .from('roles')
      .insert({
        workspace_id: workspaceId,
        name: resolvedRoleName,
      })
      .select('id')
      .single();

    if (roleError || !newRole?.id) {
      console.error('generateInvite role creation error:', roleError);
      throw new Error(roleError?.message || 'Failed to create role');
    }

    resolvedRoleId = newRole.id;
  }

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { error } = await service.from('invites').insert({
    workspace_id: workspaceId,
    role_id: resolvedRoleId,
    token,
    created_by: createdBy,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error('generateInvite error:', error);
    throw new Error(error.message || 'Failed to create invite');
  }

  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'localhost:3000';
  const protocol = headerList.get('x-forwarded-proto') || 'http';
  const origin = `${protocol}://${host}`;
  const link = `${origin}/invite/${token}`;

  return { token, link, roleName: resolvedRoleName };
}

export async function acceptInvite(token: string): Promise<{ success: boolean; workspaceSlug?: string; error?: string }> {
  const supabase = await createClient();
  const service = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthenticated' };
  }

  const { data: invite, error: inviteError } = await service
    .from('invites')
    .select('*')
    .eq('token', token)
    .single();

  if (inviteError || !invite) {
    return { success: false, error: 'Invalid invite link' };
  }

  if (invite.used_at) {
    return { success: false, error: 'This invite has already been used' };
  }

  if (new Date(invite.expires_at) < new Date()) {
    return { success: false, error: 'This invite has expired' };
  }

  const { data: existing } = await service
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', invite.workspace_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (existing) {
    const { data: ws } = await service
      .from('workspaces')
      .select('slug')
      .eq('id', invite.workspace_id)
      .single();

    return { success: true, workspaceSlug: ws?.slug };
  }

  const { error: memberError } = await service.from('workspace_members').insert({
    workspace_id: invite.workspace_id,
    user_id: user.id,
    role_id: invite.role_id,
    invited_by: invite.created_by,
    is_active: true,
  });

  if (memberError) {
    console.error('acceptInvite member insert error:', memberError);
    return { success: false, error: memberError.message || 'Failed to join workspace' };
  }

  const { error: updateError } = await service
    .from('invites')
    .update({
      used_at: new Date().toISOString(),
      used_by: user.id,
    })
    .eq('id', invite.id);

  if (updateError) {
    console.error('acceptInvite mark used error:', updateError);
  }

  const { data: ws } = await service
    .from('workspaces')
    .select('slug')
    .eq('id', invite.workspace_id)
    .single();

  return { success: true, workspaceSlug: ws?.slug };
}

export async function removeMember(workspaceId: string, memberId: string): Promise<void> {
  const supabase = await createClient();
  const service = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthenticated');
  }

  const { error } = await service
    .from('workspace_members')
    .update({ is_active: false })
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)
    .neq('user_id', user.id);

  if (error) {
    console.error('removeMember error:', error);
    throw new Error(error.message || 'Failed to remove member');
  }
}
