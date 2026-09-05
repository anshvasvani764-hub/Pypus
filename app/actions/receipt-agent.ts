'use server';

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import type { ReceiptTemplateVars } from "@/lib/receipts/template-vars";

export type ReceiptSendMode = "manual" | "auto";

export interface ReceiptAgentSettings {
  sendMode: ReceiptSendMode;
}

// Not exported — a "use server" file can only export async functions, so
// this runtime constant (used only as the fallback below) stays private.
const DEFAULT_RECEIPT_AGENT_SETTINGS: ReceiptAgentSettings = {
  sendMode: "manual",
};

/** Reads the per-workspace Receipt Agent config (the Configuration gear on
 * Automations > Receipts). Falls back to "manual" if nothing's saved yet. */
export async function getReceiptAgentSettings(
  workspaceId: string
): Promise<ReceiptAgentSettings> {
  if (!workspaceId) return DEFAULT_RECEIPT_AGENT_SETTINGS;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("receipt_agent_settings")
    .select("send_mode")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    console.error("getReceiptAgentSettings error:", error);
    return DEFAULT_RECEIPT_AGENT_SETTINGS;
  }
  if (!data) return DEFAULT_RECEIPT_AGENT_SETTINGS;

  return { sendMode: data.send_mode as ReceiptSendMode };
}

/** Saves the Receipt Agent send-mode preference from the Configuration panel. */
export async function saveReceiptAgentSettings(
  workspaceId: string,
  settings: ReceiptAgentSettings
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("receipt_agent_settings").upsert(
    {
      workspace_id: workspaceId,
      send_mode: settings.sendMode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" }
  );

  if (error) {
    console.error("saveReceiptAgentSettings error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[app]/automations/receipts`, "page");
  return { success: true };
}

/** Saves edited template variables for a queued receipt (the pencil-icon
 * edit in the Receipt Agent queue/popup) — the exact {{1}}-{{5}} values
 * that'll be sent to the payment_receipt WhatsApp template, overriding the
 * auto-computed defaults. */
export async function updateReceiptTemplateVars(
  receiptId: string,
  vars: ReceiptTemplateVars
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("receipts")
    .update({ whatsapp_template_vars: vars })
    .eq("id", receiptId);

  if (error) {
    console.error("updateReceiptTemplateVars error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[app]/automations/receipts`, "page");
  return { success: true };
}

/** Pulls a receipt out of the pending queue without marking it sent — used
 * by the "Remove" action on a queued row (e.g. it was already shared with
 * the member some other way). */
export async function dismissReceiptFromQueue(
  receiptId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("receipts")
    .update({ agent_dismissed: true })
    .eq("id", receiptId);

  if (error) {
    console.error("dismissReceiptFromQueue error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[app]/automations/receipts`, "page");
  return { success: true };
}
