import { updateProfileSettings } from "@/app/actions/settings";
import type { PypusTool } from "./shared";

const updateWorkspaceSettings: PypusTool = {
  name: "update_workspace_settings",
  riskLevel: "low",
  description:
    "Updates the owner's display name and/or the gym/business name shown across the app. Pass at least one of full_name or business_name. Use for 'mera naam change karo' / 'gym ka naam change karo' type requests.",
  parameters: {
    type: "object",
    properties: {
      full_name: { type: "string", description: "New owner display name, if changing" },
      business_name: { type: "string", description: "New gym/business name, if changing" },
    },
  },
  async run(ctx, args) {
    const newFullName = typeof args.full_name === "string" && args.full_name.trim() ? args.full_name.trim() : null;
    const newBusinessName =
      typeof args.business_name === "string" && args.business_name.trim() ? args.business_name.trim() : null;
    if (!newFullName && !newBusinessName) {
      return { error: "Nothing to update — pass full_name and/or business_name" };
    }

    const {
      data: { user },
    } = await ctx.supabase.auth.getUser();
    if (!user) return { error: "Not signed in" };

    // updateProfileSettings writes both fields together, so an
    // unchanged field is re-saved with its current value rather than
    // being cleared.
    const [{ data: userRow }, { data: wsRow }] = await Promise.all([
      ctx.supabase.from("users").select("full_name").eq("id", user.id).maybeSingle(),
      ctx.supabase.from("workspaces").select("name").eq("id", ctx.workspaceId).maybeSingle(),
    ]);

    const fullName = newFullName ?? userRow?.full_name ?? "";
    const businessName = newBusinessName ?? wsRow?.name ?? "";
    if (!fullName || !businessName) {
      return { error: "Could not resolve the current name(s) to update" };
    }

    const result = await updateProfileSettings({ workspaceId: ctx.workspaceId, fullName, businessName });
    if (!result.success) return { error: result.error ?? "Could not update settings" };

    return { success: true, fullName, businessName };
  },
};

export const SETTINGS_TOOLS: PypusTool[] = [updateWorkspaceSettings];
