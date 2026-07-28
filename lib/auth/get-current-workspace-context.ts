import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

export interface WorkspaceContext {
  workspaceId: string;
  workspaceSlug: string;
}

/**
 * ⚠️ TEMP: Auth hata diya hai testing ke liye.
 * Jab real login/OAuth aayega, isme user session check wapas add karna hoga
 * aur workspace_members se permissions bhi nikalni hongi.
 */
export async function getCurrentWorkspaceContext(
  workspaceSlug: string
): Promise<WorkspaceContext> {
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("id, slug")
    .eq("slug", workspaceSlug)
    .single();

  if (error || !workspace) {
    notFound();
  }

  return {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
  };
}