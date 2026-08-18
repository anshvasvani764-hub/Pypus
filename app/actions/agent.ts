'use server';

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { sendWhatsAppText, sendWhatsAppTemplate } from "@/lib/whatsapp/client";
import { formatReceiptDate } from "@/lib/utils/date";
import {
  getAbsenteeWorklist,
  getFeeWorklist,
  getAgentActivity,
  getReceiptWorklist,
} from "@/lib/agent/queries";

export async function getAgentDashboard(workspaceId: string) {
  const [absentees, feesDue, activity, receiptsPending] = await Promise.all([
    getAbsenteeWorklist(workspaceId),
    getFeeWorklist(workspaceId),
    getAgentActivity(workspaceId),
    getReceiptWorklist(workspaceId),
  ]);
  return { absentees, feesDue, activity, receiptsPending };
}

/** Called when the owner taps Send on a pending receipt task — actually
 * sends the receipt over WhatsApp using the approved payment_receipt
 * template (with the receipt photo as the header image), then moves it
 * from "Pending tasks" to "Recent activity".
 *
 * Template body variable order (must match what was approved in Meta):
 *   {{1}} member name, {{2}} amount, {{3}} workspace/gym name,
 *   {{4}} payment method, {{5}} valid till date
 */
export async function sendAgentReceipt({
  receiptId,
  memberPhone,
  memberName,
  amount,
  workspaceName,
  paymentMethod,
  validTillDate,
  receiptImageUrl,
}: {
  receiptId: string;
  memberPhone: string;
  memberName: string;
  amount: number;
  workspaceName: string;
  paymentMethod: string;
  validTillDate: string | null;
  receiptImageUrl: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  if (!receiptImageUrl) {
    return { success: false, error: "Receipt image not ready yet — try again in a moment" };
  }

  const result = await sendWhatsAppTemplate(
    memberPhone,
    "payment_receipt",
    [
      memberName,
      amount.toLocaleString("en-IN"),
      workspaceName,
      paymentMethod,
      validTillDate ? formatReceiptDate(validTillDate) : "—",
    ],
    "en",
    receiptImageUrl
  );

  const { error } = await supabase
    .from("receipts")
    .update({
      whatsapp_sent_at: result.success ? new Date().toISOString() : null,
      whatsapp_message_id: result.messageId ?? null,
      whatsapp_status: result.success ? "sent" : "failed",
    })
    .eq("id", receiptId);

  if (error) {
    console.error("sendAgentReceipt update error:", error);
    return { success: false, error: error.message };
  }

  if (!result.success) {
    return { success: false, error: result.error || "WhatsApp send failed" };
  }

  revalidatePath(`/[app]/agent`, "page");
  return { success: true };
}

/** Called when the owner taps Send on a pending fee/attendance task in the
 * Agent tab — sends the reminder over WhatsApp and logs it, same as the
 * per-member reminder button but triggered from the worklist. */
export async function sendAgentReminder({
  workspaceId,
  memberId,
  memberPhone,
  feeId,
  reason,
  message,
}: {
  workspaceId: string;
  memberId: string;
  memberPhone: string;
  feeId: string | null;
  reason: "fees" | "attendance";
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  const result = await sendWhatsAppText(memberPhone, message);

  if (!result.success) {
    return { success: false, error: result.error || "WhatsApp send failed" };
  }

  const { error } = await supabase.from("reminders").insert({
    workspace_id: workspaceId,
    member_id: memberId,
    fee_id: feeId,
    channel: "whatsapp",
    message,
    status: "sent",
    reason,
    sent_at: new Date().toISOString(),
    whatsapp_message_id: result.messageId ?? null,
    whatsapp_status: "sent",
  });

  if (error) {
    console.error("sendAgentReminder insert error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[app]/agent`, "page");
  return { success: true };
}

/** Called right after a payment is marked paid, so the receipt shows up in
 * the Agent activity feed. Also uploads the receipt image (generated
 * client-side on canvas) to Supabase Storage and saves its public URL —
 * that URL becomes the header image when the receipt is sent on WhatsApp. */
export async function saveReceipt({
  workspaceId,
  memberId,
  feeId,
  receiptNumber,
  amount,
  paymentMethod,
  paidDate,
  imageFile,
}: {
  workspaceId: string;
  memberId: string;
  feeId: string | null;
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  paidDate: string;
  imageFile?: File | null;
}): Promise<{ success: boolean; error?: string; receiptImageUrl?: string }> {
  const supabase = createServiceClient();

  let receiptImageUrl: string | null = null;

  if (imageFile) {
    const filePath = `${workspaceId}/${receiptNumber}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(filePath, imageFile, { contentType: "image/jpeg", upsert: false });

    if (uploadError) {
      // Non-fatal — receipt still saves, WhatsApp send just won't have a
      // photo attached until this is retried.
      console.error("Receipt image upload error:", uploadError);
    } else {
      const { data: publicUrlData } = supabase.storage.from("receipts").getPublicUrl(filePath);
      receiptImageUrl = publicUrlData.publicUrl;
    }
  }

  const { error } = await supabase.from("receipts").insert({
    workspace_id: workspaceId,
    member_id: memberId,
    fee_id: feeId,
    receipt_number: receiptNumber,
    amount,
    payment_method: paymentMethod,
    paid_date: paidDate,
    receipt_image_url: receiptImageUrl,
  });

  if (error) {
    console.error("saveReceipt insert error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[app]/agent`, "page");
  return { success: true, receiptImageUrl: receiptImageUrl ?? undefined };
}
