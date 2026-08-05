"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface UpdateMemberData {
  name?: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
}

export async function updateMember(
  workspaceId: string,
  memberId: string,
  updates: UpdateMemberData
) {
  try {
    const supabase = await createClient();

    // Verify user has access to this workspace
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user is owner or team member
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return { success: false, error: "Access denied" };
    }

    // Update member
    const { data, error } = await supabase
      .from("members")
      .update(updates)
      .eq("id", memberId)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error) {
      console.error("Update member error:", error);
      return { success: false, error: error.message };
    }

    // Revalidate all member-related pages
    const { data: wsData } = await supabase
      .from("workspaces")
      .select("slug")
      .eq("id", workspaceId)
      .single();

    if (wsData?.slug) {
      revalidatePath(`/${wsData.slug}/members`);
      revalidatePath(`/${wsData.slug}/members/${memberId}`);
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("updateMember exception:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteMember(workspaceId: string, memberId: string) {
  try {
    const supabase = await createClient();

    // Verify user has access to this workspace
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user is owner or team member
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return { success: false, error: "Access denied" };
    }

    // Delete member (this will cascade delete fees and attendance if DB is configured)
    const { error } = await supabase
      .from("members")
      .delete()
      .eq("id", memberId)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("Delete member error:", error);
      return { success: false, error: error.message };
    }

    // Revalidate pages
    const { data: wsData } = await supabase
      .from("workspaces")
      .select("slug")
      .eq("id", workspaceId)
      .single();

    if (wsData?.slug) {
      revalidatePath(`/${wsData.slug}/members`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("deleteMember exception:", error);
    return { success: false, error: error.message };
  }
}

export async function uploadMemberAvatar(
  workspaceId: string,
  memberId: string,
  file: File
) {
  try {
    const supabase = await createClient();

    // Verify user has access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check workspace access
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return { success: false, error: "Access denied" };
    }

    // Upload to storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${memberId}-${Date.now()}.${fileExt}`;
    const filePath = `${workspaceId}/members/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const avatarUrl = publicUrlData.publicUrl;

    // Update member with new avatar URL
    const { error: updateError } = await supabase
      .from("members")
      .update({ avatar_url: avatarUrl })
      .eq("id", memberId)
      .eq("workspace_id", workspaceId);

    if (updateError) {
      console.error("Update avatar error:", updateError);
      return { success: false, error: updateError.message };
    }

    // Revalidate pages
    const { data: wsData } = await supabase
      .from("workspaces")
      .select("slug")
      .eq("id", workspaceId)
      .single();

    if (wsData?.slug) {
      revalidatePath(`/${wsData.slug}/members`);
      revalidatePath(`/${wsData.slug}/members/${memberId}`);
    }

    return { success: true, avatarUrl };
  } catch (error: any) {
    console.error("uploadMemberAvatar exception:", error);
    return { success: false, error: error.message };
  }
}
