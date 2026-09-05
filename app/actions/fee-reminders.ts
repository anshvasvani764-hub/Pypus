'use server';

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/client";
import { formatDueDateForWhatsApp } from "@/lib/agent/fee-reminder-eligibility";

const BEFORE_DUE_TEMPLATE_NAME = "pre_due_fee_reminder";
const OVERDUE_TEMPLATE_NAME = "fee_reminder";

export type SendMode = "manual" | "auto";

export interface FeeReminderSettings {
  enabled: boolean;
  /** Soft reminder: sent once, this many days before the due date. */
  beforeDueDays: number;
  /** First overdue reminder: sent this many hours after the due date. */
  afterDueHours: number;
  /** Overdue reminders repeat every this many hours after that, until paid. Min 24. */
  repeatIntervalHours: number;
  sendMode: SendMode;
}

// Not exported — a "use server" file can only export async functions.
// This constant is only used inside this file (as the fallback return
// value below), so keeping it module-private fixes the "found object" error.
const DEFAULT_FEE_REMINDER_SETTINGS: FeeReminderSettings = {
  enabled: false,
  beforeDueDays: 1,
  afterDueHours: 24,
  repeatIntervalHours: 48,
  sendMode: "manual",
};

/** Reads the per-workspace Fee Reminders config (Settings corner of the
 * Fee reminders page). Falls back to sane defaults if the workspace hasn't
 * saved anything yet. */
export async function getFeeReminderSettings(
  workspaceId: string
): Promise<FeeReminderSettings> {
  if (!workspaceId) return DEFAULT_FEE_REMINDER_SETTINGS;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("fee_reminder_settings")
    .select("enabled, before_due_days, after_due_hours, repeat_interval_hours, send_mode")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    console.error("getFeeReminderSettings error:", error);
    return DEFAULT_FEE_REMINDER_SETTINGS;
  }
  if (!data) return DEFAULT_FEE_REMINDER_SETTINGS;

  return {
    enabled: data.enabled,
    beforeDueDays: data.before_due_days,
    afterDueHours: data.after_due_hours,
    repeatIntervalHours: data.repeat_interval_hours,
    sendMode: data.send_mode as SendMode,
  };
}

/** Saves the Fee Reminders config from the settings panel. Only persists
 * the preference — actually firing reminders on a schedule (auto mode's
 * cron job) reads this same table at send time. */
export async function saveFeeReminderSettings(
  workspaceId: string,
  settings: FeeReminderSettings
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("fee_reminder_settings").upsert(
    {
      workspace_id: workspaceId,
      enabled: settings.enabled,
      before_due_days: settings.beforeDueDays,
      after_due_hours: settings.afterDueHours,
      repeat_interval_hours: Math.max(24, settings.repeatIntervalHours),
      send_mode: settings.sendMode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" }
  );

  if (error) {
    console.error("saveFeeReminderSettings error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[app]/automations/fee-reminders`, "page");
  return { success: true };
}

/**
 * Sends one fee reminder right now via the WhatsApp Cloud API, using the
 * same approved templates as the auto-send cron job — no wa.me browser
 * link, no manual tap-to-send in WhatsApp. This is what the Fee Reminders
 * page's "Send" / "Send all pending" buttons call.
 */
export async function sendFeeReminderNow({
  workspaceId,
  workspaceName,
  memberId,
  memberPhone,
  memberName,
  feeId,
  stage,
  amount,
  dueDate,
  daysOverdue,
}: {
  workspaceId: string;
  workspaceName: string;
  memberId: string;
  memberPhone: string;
  memberName: string;
  feeId: string;
  stage: "before_due" | "overdue";
  amount: number;
  dueDate: string;
  daysOverdue: number;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  const templateName = stage === "overdue" ? OVERDUE_TEMPLATE_NAME : BEFORE_DUE_TEMPLATE_NAME;
  const amountParam = amount.toLocaleString("en-IN");
  const dueDateParam = formatDueDateForWhatsApp(dueDate);

  const bodyParams =
    stage === "overdue"
      ? [memberName, workspaceName, amountParam, dueDateParam, String(daysOverdue)]
      : [memberName, workspaceName, amountParam, dueDateParam];

  const result = await sendWhatsAppTemplate(memberPhone, templateName, bodyParams);

  if (!result.success) {
    return { success: false, error: result.error || "WhatsApp send failed" };
  }

  const message =
    stage === "overdue"
      ? `Hi ${memberName}, your gym fee of ₹${amountParam} was due on ${dueDateParam} and has been pending for ${daysOverdue} days. – ${workspaceName}`
      : `Hi ${memberName}, your gym fee of ₹${amountParam} is due on ${dueDateParam}. – ${workspaceName}`;

  const { error } = await supabase.from("reminders").insert({
    workspace_id: workspaceId,
    member_id: memberId,
    fee_id: feeId,
    channel: "whatsapp",
    message,
    status: "sent",
    reason: "fees",
    reminder_stage: stage,
    sent_at: new Date().toISOString(),
  });

  if (error) {
    console.error("sendFeeReminderNow: WhatsApp sent but log insert failed", error);
    // The message did go out — don't tell the UI it failed, just log it.
  }

  revalidatePath(`/[app]/automations/fee-reminders`, "page");
  return { success: true };
}
