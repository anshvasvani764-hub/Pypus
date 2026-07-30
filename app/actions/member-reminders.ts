'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function sendReminder({
  workspaceId,
  memberId,
  memberPhone,
  memberName,
  workspaceName,
  feeId,
  type,
}: {
  workspaceId: string;
  memberId: string;
  memberPhone: string;
  memberName: string;
  workspaceName: string;
  feeId: string | null;
  type: "fees" | "attendance";
}): Promise<{ success: boolean; error?: string; url?: string }> {
  const supabase = await createClient();

  const cleanPhone = memberPhone.replace(/[^0-9]/g, "");
  const message =
    type === "fees"
      ? `Hi ${memberName}, your gym subscription has expired. Kindly submit your gym fees at the earliest. – ${workspaceName}`
      : `Hi ${memberName}, we haven't seen you at the gym in a while. Hope everything's doing well — come back soon! – ${workspaceName}`;

  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  const { error } = await supabase
    .from("reminders")
    .insert({
      workspace_id: workspaceId,
      member_id: memberId,
      fee_id: feeId,
      channel: "whatsapp",
      message,
      status: "sent",
      sent_at: new Date().toISOString(),
    });

  if (error) {
    console.error("sendReminder insert error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[app]/members/${memberId}`);

  return { success: true, url: waUrl };
}
