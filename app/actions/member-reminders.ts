'use server';

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export async function sendReminder({
  workspaceId,
  memberId,
  memberPhone,
  memberName,
  workspaceName,
  feeId,
  type,
  stage,
  amount,
  dueDate,
  daysOverdue,
}: {
  workspaceId: string;
  memberId: string;
  memberPhone: string;
  memberName: string;
  workspaceName: string;
  feeId: string | null;
  type: "fees" | "attendance";
  /** Required when type === "fees" — which log this send belongs in. */
  stage?: "before_due" | "overdue";
  amount?: number;
  dueDate?: string;
  daysOverdue?: number;
}): Promise<{ success: boolean; error?: string; url?: string }> {
  const supabase = createServiceClient();

  const cleanPhone = memberPhone.replace(/[^0-9]/g, "");
  const amountLabel = amount != null ? `₹${amount.toLocaleString("en-IN")}` : "your";
  const message =
    type === "fees"
      ? stage === "before_due"
        ? `Hi ${memberName}, your gym fee of ${amountLabel} is due on ${dueDate}. Kindly pay on time to avoid interruption. – ${workspaceName}`
        : `Hi ${memberName}, your gym fee of ${amountLabel} is overdue${daysOverdue ? ` by ${daysOverdue} days` : ""}. Kindly clear it at the earliest. – ${workspaceName}`
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
      reason: type,
      reminder_stage: type === "fees" ? (stage ?? "overdue") : null,
      sent_at: new Date().toISOString(),
    });

  if (error) {
    console.error("sendReminder insert error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[app]/members/${memberId}`);

  return { success: true, url: waUrl };
}
