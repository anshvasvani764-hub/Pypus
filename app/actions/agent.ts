'use server';

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { sendWhatsAppText, sendWhatsAppTemplate } from "@/lib/whatsapp/client";
import { notifyReceiptGenerated } from "@/lib/telegram/client";
import { formatReceiptDate } from "@/lib/utils/date";
import { getAgentActivity, getReceiptWorklist } from "@/lib/agent/queries";
import { AUTO_WHATSAPP_ENABLED } from "@/lib/config/messaging";

// Fee/attendance nudges are hidden from the Agent tab for now — it's
// receipts-only. getFeeWorklist / getAbsenteeWorklist still live in
// lib/agent/queries.ts if this needs to come back.
export async function getAgentDashboard(workspaceId: string) {
  const [activity, receiptsPending] = await Promise.all([
    getAgentActivity(workspaceId),
    getReceiptWorklist(workspaceId),
  ]);
  return { activity, receiptsPending };
}

/** Shared core: actually calls the WhatsApp API with the payment_receipt
 * template (receipt photo as header image) and writes the result onto the
 * receipt row. Used both right after a receipt is created (automatic) and
 * from the Agent tab's retry action (fallback for when the automatic send
 * failed, e.g. WhatsApp API hiccup or no phone on file at the time).
 *
 * Template body variable order (must match what was approved in Meta):
 *   {{1}} member name, {{2}} amount, {{3}} workspace/gym name,
 *   {{4}} payment method, {{5}} valid till date
 */
async function sendReceiptOverWhatsApp({
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
  memberPhone: string | null;
  memberName: string;
  amount: number;
  workspaceName: string;
  paymentMethod: string;
  validTillDate: string | null;
  receiptImageUrl: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  if (!AUTO_WHATSAPP_ENABLED) {
    return { success: false, error: "queued" };
  }

  if (!memberPhone) {
    return { success: false, error: "No phone number on file for this member" };
  }
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
    console.error("sendReceiptOverWhatsApp update error:", error);
    return { success: false, error: error.message };
  }

  if (!result.success) {
    return { success: false, error: result.error || "WhatsApp send failed" };
  }

  return { success: true };
}

/** Retry action for the Agent tab's log — used only as a fallback when the
 * automatic send (in `saveReceipt` below) didn't go through. */
export async function sendAgentReceipt(args: {
  receiptId: string;
  memberPhone: string | null;
  memberName: string;
  amount: number;
  workspaceName: string;
  paymentMethod: string;
  validTillDate: string | null;
  receiptImageUrl: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const result = await sendReceiptOverWhatsApp(args);
  if (result.success) {
    revalidatePath(`/[app]/agent`, "page");
  }
  return result;
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
  if (!AUTO_WHATSAPP_ENABLED) {
    return { success: false, error: "queued" };
  }

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

/** Called right after a payment is marked paid. Uploads the receipt image
 * (generated client-side on canvas) to Supabase Storage, saves the row,
 * and pings the owner on Telegram so they know to send it on WhatsApp
 * manually (auto-send via the WhatsApp API is off — see
 * AUTO_WHATSAPP_ENABLED above). The receipt still lands in the Agent
 * tab's log either way, so nothing silently disappears. */
export async function saveReceipt({
  workspaceId,
  memberId,
  memberName,
  memberPhone,
  feeId,
  receiptNumber,
  amount,
  paymentMethod,
  paidDate,
  validTillDate,
  workspaceName,
  imageFile,
}: {
  workspaceId: string;
  memberId: string;
  memberName: string;
  memberPhone: string | null;
  feeId: string | null;
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  paidDate: string;
  validTillDate: string | null;
  workspaceName: string;
  imageFile?: File | null;
}): Promise<{
  success: boolean;
  error?: string;
  receiptId?: string;
  receiptImageUrl?: string;
  whatsapp: { success: boolean; error?: string };
}> {
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

  const { data, error } = await supabase
    .from("receipts")
    .insert({
      workspace_id: workspaceId,
      member_id: memberId,
      fee_id: feeId,
      receipt_number: receiptNumber,
      amount,
      payment_method: paymentMethod,
      paid_date: paidDate,
      receipt_image_url: receiptImageUrl,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("saveReceipt insert error:", error);
    return {
      success: false,
      error: error?.message || "Insert failed",
      whatsapp: { success: false, error: "Receipt was not saved" },
    };
  }

  const whatsapp = AUTO_WHATSAPP_ENABLED
    ? await sendReceiptOverWhatsApp({
        receiptId: data.id,
        memberPhone,
        memberName,
        amount,
        workspaceName,
        paymentMethod,
        validTillDate,
        receiptImageUrl,
      })
    : { success: false, error: "queued" };

  // Ping the owner on Telegram so they know to send the receipt manually.
  notifyReceiptGenerated({
    memberName,
    amount,
    workspaceName,
    paymentMethod,
    receiptNumber,
    memberPhone,
  }).catch((err) => console.error("Telegram notify failed:", err));

  revalidatePath(`/[app]/agent`, "page");
  return {
    success: true,
    receiptId: data.id,
    receiptImageUrl: receiptImageUrl ?? undefined,
    whatsapp,
  };
}