import { SupabaseClient } from '@supabase/supabase-js'
import { SAAS_PLAN } from '@/lib/subscriptions/plans'

export interface TemplateModule {
  id: string
  slug?: string
  name?: string
}

export interface SelectedTemplate {
  id: string
  slug: string
  name: string
  modules?: TemplateModule[]
}

export async function performWorkspaceCreation(
  supabase: SupabaseClient,
  selectedTemplate: SelectedTemplate,
  bizName: string,
  phone: string,
  location: string,
  userId: string
): Promise<string> {
  if (!userId) {
    throw new Error('User ID is required to create a workspace')
  }
  if (!selectedTemplate.modules?.length) {
    throw new Error(
      `The "${selectedTemplate.name}" industry isn't fully set up yet. Please choose a different one or contact support.`
    )
  }
  const cleanUUID = (val: string | undefined | null) => (val === '' || val == null ? null : val)

  const baseSlug = bizName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'workspace'
  const slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`

  const { data: ws, error: wsErr } = await supabase
    .from('workspaces')
    .insert({
      name: bizName,
      slug: slug,
      industry: selectedTemplate.slug,
      template_id: cleanUUID(selectedTemplate.id),
      owner_id: cleanUUID(userId),
      settings: { phone: `+91${phone}`, location },
    })
    .select()
    .single()

  if (wsErr || !ws?.id) {
    console.error('Workspace creation error:', wsErr)
    throw new Error(wsErr?.message || 'Failed to create workspace')
  }
  const workspaceId = ws.id

  const { data: role, error: roleErr } = await supabase
    .from('roles')
    .insert({
      workspace_id: cleanUUID(workspaceId),
      name: 'Owner',
      description: 'Full access to workspace',
      is_system: true,
    })
    .select()
    .single()

  if (roleErr || !role?.id) {
    console.error('Role creation error:', roleErr)
    throw new Error(roleErr?.message || 'Failed to create Owner role')
  }
  const ownerRoleId = role.id

  const { data: perms, error: permsErr } = await supabase
    .from('permissions')
    .select('id')

  if (permsErr) {
    console.error('Permissions fetch error:', permsErr)
    throw new Error(permsErr.message || 'Failed to fetch permissions')
  }

  if (perms?.length) {
    const rows = perms.map((p) => ({
      role_id: cleanUUID(ownerRoleId),
      permission_id: cleanUUID(p.id),
      enabled: true,
    }))
    const { error: rpErr } = await supabase.from('role_permissions').insert(rows)
    if (rpErr) {
      console.error('Role permissions error:', rpErr)
      throw new Error(rpErr.message || 'Failed to assign role permissions')
    }
  }

  const { error: memErr } = await supabase.from('workspace_members').insert({
    workspace_id: cleanUUID(workspaceId),
    user_id: cleanUUID(userId),
    role: 'owner',
    role_id: cleanUUID(ownerRoleId),
    is_active: true,
  })

  if (memErr) {
    console.error('Workspace member error:', memErr)
    throw new Error(memErr.message || 'Failed to add workspace owner member')
  }

  // Start the 14-day free trial. Must happen AFTER the workspace_members
  // insert above — the RLS policy on workspace_subscriptions requires the
  // caller to already be an active member of the workspace.
  const trialEndsAt = new Date(
    Date.now() + SAAS_PLAN.trialDays * 24 * 60 * 60 * 1000
  ).toISOString()

  const { error: subErr } = await supabase.from('workspace_subscriptions').insert({
    workspace_id: cleanUUID(workspaceId),
    plan_id: SAAS_PLAN.id,
    plan_name: SAAS_PLAN.name,
    amount: SAAS_PLAN.amount,
    billing_period: SAAS_PLAN.billingPeriod,
    status: 'trialing',
    trial_ends_at: trialEndsAt,
  })

  if (subErr) {
    // Don't block workspace creation over this — but log loudly, since a
    // missing subscription row means getSubscriptionState() will treat
    // this workspace as status "none" and block it at the paywall gate.
    console.error('Trial subscription creation error:', subErr)
  }

  if (selectedTemplate.modules?.length) {
    const rows = selectedTemplate.modules.map((m, i) => ({
      workspace_id: cleanUUID(workspaceId),
      module_id: cleanUUID(m.id),
      position: i,
    }))
    const { error: actErr } = await supabase
      .from('workspace_active_modules')
      .insert(rows)
    if (actErr) {
      console.error('Active modules error:', actErr)
      throw new Error(actErr.message || 'Failed to activate template modules')
    }
  }

  return workspaceId
}