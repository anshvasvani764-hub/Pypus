import { createClient } from "@/lib/supabase/server";

export interface BusinessBrainAccessResult {
  ok: boolean;
  status: number;
  error?: string;
  userId?: string;
}

/**
 * Confirms the request has a real logged-in session AND that user is an
 * active member of the workspace_id it's asking to act on — never trusts
 * workspace_id from the browser on its own. Uses the session-scoped
 * (RLS-respecting) Supabase client, so this piggybacks on the workspace
 * membership policies that already exist for workspace_members — no new
 * auth code path, no service-role key involved in the check itself.
 */
export async function checkWorkspaceAccess(workspaceId: string): Promise<BusinessBrainAccessResult> {
  if (!workspaceId || typeof workspaceId !== "string") {
    return { ok: false, status: 400, error: "workspaceId is required" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const { data: membership, error } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: "Could not verify workspace access" };
  }

  if (!membership) {
    return { ok: false, status: 403, error: "You do not have access to this workspace" };
  }

  return { ok: true, status: 200, userId: user.id };
}
