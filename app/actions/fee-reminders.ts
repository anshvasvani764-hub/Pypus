'use server';

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export type RepeatInterval = "daily" | "every_2_days" | "once";
export type SendMode = "manual" | "auto";

export interface FeeReminderSettings {
  enabled: boolean;
  daysAfterDue: number;
  repeatInterval: RepeatInterval;
  sendMode: SendMode;
}

// Not exported — a "use server" file can only export async functions.
// This constant is only used inside this file (as the fallback return
// value below), so keeping it module-private fixes the "found object" error.
const DEFAULT_FEE_REMINDER_SETTINGS: FeeReminderSettings = {
  enabled: false,
  daysAfterDue: 1,
  repeatInterval: "once",
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
    .select("enabled, days_after_due, repeat_interval, send_mode")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    console.error("getFeeReminderSettings error:", error);
    return DEFAULT_FEE_REMINDER_SETTINGS;
  }
  if (!data) return DEFAULT_FEE_REMINDER_SETTINGS;

  return {
    enabled: data.enabled,
    daysAfterDue: data.days_after_due,
    repeatInterval: data.repeat_interval as RepeatInterval,
    sendMode: data.send_mode as SendMode,
  };
}

/** Saves the Fee Reminders config from the settings panel. Only persists
 * the preference — actually firing reminders on a schedule (the cron job
 * for "auto" mode) is separate, still-to-build work. */
export async function saveFeeReminderSettings(
  workspaceId: string,
  settings: FeeReminderSettings
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("fee_reminder_settings").upsert(
    {
      workspace_id: workspaceId,
      enabled: settings.enabled,
      days_after_due: settings.daysAfterDue,
      repeat_interval: settings.repeatInterval,
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
