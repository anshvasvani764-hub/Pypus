'use server';

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import type { Plan, PlanDuration } from "@/lib/members/types";

export async function updateProfileSettings({
  workspaceId,
  fullName,
  businessName,
}: {
  workspaceId: string;
  fullName: string;
  businessName: string;
}): Promise<{ success: boolean; error?: string }> {
  const name = fullName.trim();
  const business = businessName.trim();

  if (!name) return { success: false, error: "Name cannot be empty" };
  if (!business) return { success: false, error: "Business name cannot be empty" };

  const supabase = await createClient();
  const service = createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not signed in" };

  const { error: userError } = await service
    .from("users")
    .update({ full_name: name, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (userError) {
    console.error("updateProfileSettings user error:", userError);
    return { success: false, error: userError.message };
  }

  const { error: wsError } = await service
    .from("workspaces")
    .update({ name: business })
    .eq("id", workspaceId);

  if (wsError) {
    console.error("updateProfileSettings workspace error:", wsError);
    return { success: false, error: wsError.message };
  }

  revalidatePath("/[app]/settings", "page");
  revalidatePath("/[app]", "layout");

  return { success: true };
}

export async function savePlan({
  workspaceId,
  planId,
  name,
  duration,
  price,
  features,
  status,
}: {
  workspaceId: string;
  planId?: string | null;
  name: string;
  duration: PlanDuration;
  price: number;
  features?: string[];
  status?: "active" | "inactive";
}): Promise<{ success: boolean; error?: string; plan?: Plan }> {
  const planName = name.trim();
  if (!planName) return { success: false, error: "Plan name is required" };
  if (!Number.isFinite(price) || price < 0) {
    return { success: false, error: "Enter a valid price" };
  }

  const supabase = createServiceClient();

  if (planId) {
    const { data, error } = await supabase
      .from("plans")
      .update({
        name: planName,
        duration,
        price,
        ...(features ? { features } : {}),
        ...(status ? { status } : {}),
      })
      .eq("id", planId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error) {
      console.error("savePlan update error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/[app]/settings", "page");
    revalidatePath("/[app]/fees/plans", "page");
    return { success: true, plan: data as Plan };
  }

  const { data, error } = await supabase
    .from("plans")
    .insert({
      workspace_id: workspaceId,
      name: planName,
      duration,
      price,
      features: features ?? [],
      status: status ?? "active",
    })
    .select()
    .single();

  if (error) {
    console.error("savePlan insert error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/[app]/settings", "page");
  revalidatePath("/[app]/fees/plans", "page");
  return { success: true, plan: data as Plan };
}

export async function deletePlan({
  workspaceId,
  planId,
}: {
  workspaceId: string;
  planId: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("plans")
    .delete()
    .eq("id", planId)
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("deletePlan error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/[app]/settings", "page");
  revalidatePath("/[app]/fees/plans", "page");
  return { success: true };
}
