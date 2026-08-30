import { type PypusTool, type ToolContext, needsConfirmation } from "./shared";
import { generateInvite, removeMember } from "@/app/actions/invites";

type TeamRow = {
  id: string;
  user_id: string;
  role_id: string | null;
  is_active: boolean | null;
  joined_at: string | null;
  fullName: string;
  email: string | null;
  roleName: string;
};

async function loadTeam(ctx: ToolContext): Promise<TeamRow[]> {
  const { data: members, error } = await ctx.supabase
    .from("workspace_members")
    .select("id, user_id, role_id, is_active, joined_at")
    .eq("workspace_id", ctx.workspaceId)
    .eq("is_active", true)
    .order("joined_at", { ascending: true });
  if (error) throw error;

  const rows = (members ?? []) as {
    id: string;
    user_id: string;
    role_id: string | null;
    is_active: boolean | null;
    joined_at: string | null;
  }[];
  const userIds = [...new Set(rows.map((m) => m.user_id))];
  const roleIds = [...new Set(rows.map((m) => m.role_id).filter(Boolean))] as string[];

  const [usersRes, rolesRes] = await Promise.all([
    userIds.length
      ? ctx.supabase.from("users").select("id, full_name, email").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; email: string | null }[] }),
    roleIds.length
      ? ctx.supabase.from("roles").select("id, name").in("id", roleIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const usersMap = new Map(((usersRes.data ?? []) as { id: string; full_name: string; email: string | null }[]).map((u) => [u.id, u]));
  const rolesMap = new Map(((rolesRes.data ?? []) as { id: string; name: string }[]).map((r) => [r.id, r]));

  return rows.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role_id: m.role_id,
    is_active: m.is_active,
    joined_at: m.joined_at,
    fullName: usersMap.get(m.user_id)?.full_name ?? "Unknown",
    email: usersMap.get(m.user_id)?.email ?? null,
    roleName: m.role_id ? rolesMap.get(m.role_id)?.name ?? "Unknown role" : "No role assigned",
  }));
}

async function resolveTeamMember(ctx: ToolContext, rawName: unknown) {
  const query = String(rawName ?? "").trim().toLowerCase();
  if (!query) return { error: "member_name is required" as const };

  const team = await loadTeam(ctx);
  const exact = team.filter((m) => m.fullName.toLowerCase() === query);
  const partial = team.filter((m) => m.fullName.toLowerCase().includes(query));
  const hits = exact.length ? exact : partial;

  if (!hits.length) {
    return { error: "team_member_not_found" as const, searched: String(rawName ?? ""), availableTeamMembers: team.map((m) => m.fullName) };
  }
  if (hits.length > 1) {
    return { error: "ambiguous_team_member" as const, matches: hits.map((m) => m.fullName) };
  }
  return { member: hits[0] };
}

// ── READ ────────────────────────────────────────────────────────────

const teamOverview: PypusTool = {
  name: "get_team_overview",
  riskLevel: "low",
  description:
    "The workspace's active staff/team list: each member's name, email, role and when they joined. Use for 'team mein kaun kaun hai' / staff list questions.",
  parameters: { type: "object", properties: {} },
  async run(ctx) {
    const team = await loadTeam(ctx);
    return {
      totalActiveTeamMembers: team.length,
      team: team.map((m) => ({ name: m.fullName, email: m.email, role: m.roleName, joinedOn: m.joined_at })),
    };
  },
};

const teamMemberProfile: PypusTool = {
  name: "get_team_member_profile",
  riskLevel: "low",
  description: "One staff member's profile: email, role and join date. Use for a single team member's details.",
  parameters: {
    type: "object",
    properties: { member_name: { type: "string" } },
    required: ["member_name"],
  },
  async run(ctx, args) {
    const found = await resolveTeamMember(ctx, args.member_name);
    if ("error" in found) return found;
    return {
      name: found.member.fullName,
      email: found.member.email,
      role: found.member.roleName,
      joinedOn: found.member.joined_at,
    };
  },
};

// ── WRITE ───────────────────────────────────────────────────────────

const inviteTeamMember: PypusTool = {
  name: "invite_team_member",
  riskLevel: "low",
  description:
    "Generates an invite link for a new staff member with a given role. The owner still has to share the link themselves — this tool only creates it. Use for 'naye staff ko invite karo' type requests. If the role doesn't exist yet, it's created.",
  parameters: {
    type: "object",
    properties: {
      role_name: { type: "string", description: "Role to invite for, e.g. 'Trainer', 'Manager'" },
    },
    required: ["role_name"],
  },
  async run(ctx, args) {
    const roleName = typeof args.role_name === "string" ? args.role_name.trim() : "";
    if (!roleName) return { error: "role_name is required" };

    const {
      data: { user },
    } = await ctx.supabase.auth.getUser();
    if (!user) return { error: "Not signed in" };

    try {
      const invite = await generateInvite({
        workspaceId: ctx.workspaceId,
        roleId: "",
        roleName,
        createdBy: user.id,
      });
      return { success: true, role: invite.roleName, inviteLink: invite.link, expiresInDays: 7 };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Could not generate invite" };
    }
  },
};

const updateTeamMemberRole: PypusTool = {
  name: "update_team_member_role",
  riskLevel: "low",
  description:
    "Changes an existing staff member's role to another role that already exists in this workspace. Use invite_team_member first if the target role doesn't exist yet.",
  parameters: {
    type: "object",
    properties: {
      member_name: { type: "string" },
      role_name: { type: "string" },
    },
    required: ["member_name", "role_name"],
  },
  async run(ctx, args) {
    const found = await resolveTeamMember(ctx, args.member_name);
    if ("error" in found) return found;

    const roleName = typeof args.role_name === "string" ? args.role_name.trim().toLowerCase() : "";
    if (!roleName) return { error: "role_name is required" };

    const { data: roles, error: rolesErr } = await ctx.supabase
      .from("roles")
      .select("id, name")
      .eq("workspace_id", ctx.workspaceId);
    if (rolesErr) return { error: `Could not load roles: ${rolesErr.message}` };

    const roleRows = (roles ?? []) as { id: string; name: string }[];
    const role = roleRows.find((r) => r.name.toLowerCase() === roleName);
    if (!role) return { error: "role_not_found" as const, availableRoles: roleRows.map((r) => r.name) };

    const { error } = await ctx.supabase
      .from("workspace_members")
      .update({ role_id: role.id })
      .eq("id", found.member.id)
      .eq("workspace_id", ctx.workspaceId);
    if (error) return { error: `Could not update role: ${error.message}` };

    return { success: true, member: found.member.fullName, previousRole: found.member.roleName, newRole: role.name };
  },
};

const removeTeamMember: PypusTool = {
  name: "remove_team_member",
  riskLevel: "high",
  description:
    "Removes a staff member's access to this workspace (deactivates their membership; does not delete their user account). This cannot be easily undone, so always preview first: call without confirmed:true, show the preview, and only call again with confirmed:true after explicit confirmation.",
  parameters: {
    type: "object",
    properties: {
      member_name: { type: "string" },
      confirmed: { type: "boolean", description: "Set true only after the owner has explicitly confirmed removing this exact team member." },
    },
    required: ["member_name"],
  },
  async run(ctx, args) {
    const found = await resolveTeamMember(ctx, args.member_name);
    if ("error" in found) return found;

    const preview = {
      member: found.member.fullName,
      email: found.member.email,
      role: found.member.roleName,
      warning: "This removes their access to the workspace. It can be undone by inviting them again.",
    };

    const gate = needsConfirmation(args, preview);
    if (gate) return gate;

    try {
      await removeMember(ctx.workspaceId, found.member.id);
      return { success: true, removed: preview };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Could not remove team member" };
    }
  },
};

export const TEAM_TOOLS: PypusTool[] = [
  teamOverview,
  teamMemberProfile,
  inviteTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
];
