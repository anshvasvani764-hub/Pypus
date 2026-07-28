import { SupabaseClient } from '@supabase/supabase-js'

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
  // Generate a clean URL slug for the workspace
  const baseSlug = bizName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'workspace'
  const slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`

  // 1. Create workspace
  const { data: ws, error: wsErr } = await supabase
    .from('workspaces')
    .insert({
      name: bizName,
      slug: slug,
      industry: selectedTemplate.slug,
      template_id: selectedTemplate.id,
      owner_id: userId,
      settings: { phone: `+91${phone}`, location },
    })
    .select()
    .single()

  if (wsErr) {
    console.error('Workspace creation error:', wsErr)
    throw new Error(wsErr.message || 'Failed to create workspace')
  }
  const workspaceId = ws.id

  // 2. Create system "Owner" role for this workspace
  const { data: role, error: roleErr } = await supabase
    .from('roles')
    .insert({
      workspace_id: workspaceId,
      name: 'Owner',
      description: 'Full access to workspace',
      is_system: true,
    })
    .select()
    .single()

  if (roleErr) {
    console.error('Role creation error:', roleErr)
    throw new Error(roleErr.message || 'Failed to create Owner role')
  }
  const ownerRoleId = role.id

  // 3. Grant all existing permissions to Owner role
  const { data: perms, error: permsErr } = await supabase
    .from('permissions')
    .select('id')

  if (permsErr) {
    console.error('Permissions fetch error:', permsErr)
    throw new Error(permsErr.message || 'Failed to fetch permissions')
  }

  if (perms?.length) {
    const rows = perms.map((p) => ({
      role_id: ownerRoleId,
      permission_id: p.id,
      enabled: true,
    }))
    const { error: rpErr } = await supabase.from('role_permissions').insert(rows)
    if (rpErr) {
      console.error('Role permissions error:', rpErr)
      throw new Error(rpErr.message || 'Failed to assign role permissions')
    }
  }

  // 4. Add user as workspace member (owner)
  const { error: memErr } = await supabase.from('workspace_members').insert({
    workspace_id: workspaceId,
    user_id: userId,
    role: 'owner',
    role_id: ownerRoleId,
    is_active: true,
  })

  if (memErr) {
    console.error('Workspace member error:', memErr)
    throw new Error(memErr.message || 'Failed to add workspace owner member')
  }

  // 5. Activate this template's modules
  if (selectedTemplate.modules?.length) {
    const rows = selectedTemplate.modules.map((m, i) => ({
      workspace_id: workspaceId,
      module_id: m.id,
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
