'use server';

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export async function createMember(
  workspaceId: string,
  data: { name: string; phone: string; email?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("members").insert({
    workspace_id: workspaceId,
    name: data.name,
    phone: data.phone,
    email: data.email || null,
    avatar_url: null,
    plan_id: null,
    trainer_id: null,
    auth_user_id: null, // admin-created member, not linked to a login yet
  });

  if (error) {
    console.error("createMember error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[app]/members`, "page");
  return { success: true };
}