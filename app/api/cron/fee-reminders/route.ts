import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getFeeWorklist } from "@/lib/agent/queries";
import { getFeeReminderSettings } from "@/app/actions/fee-reminders";
import { sendWhatsAppTemplate } from "@/lib/whatsapp/client";
import { AUTO_WHATSAPP_ENABLED } from "@/lib/config/messaging";
import { formatDueDateForWhatsApp } from "@/lib/agent/fee-reminder-eligibility";

/**
 * Fires every hour (see vercel.json). This is what makes "Automatic" send
 * mode actually real-time instead of depending on the Fee Reminders page
 * being open in a browser tab — unlike the Receipt Agent's auto mode,
 * which piggybacks on the page's own poll-while-open loop, a fee reminder
 * has to land N hours after a due date passes at 2am on a Tuesday whether
 * or not anyone's looking at the dashboard.
 *
 * For each workspace with fee reminders enabled AND send_mode = "auto",
 * this recomputes eligibility the exact same way the page does
 * (getFeeWorklist + evaluateFeeReminder) and sends anything eligible.
 * Workspaces on "manual" mode are skipped here — their eligible fees just
 * sit in the Pending Queue tab waiting for a human to click Send, which
 * getFeeWorklist already surfaces without this job's help.
 *
 * Both templates below are Meta-approved (checked in WhatsApp Manager →
 * Manage templates — green "Approved" status):
 *
 *   pre_due_fee_reminder — before_due stage, 4 body variables:
 *     {{1}} member name, {{2}} workspace/gym name, {{3}} amount (no ₹,
 *     the template text already has the symbol), {{4}} due date.
 *
 *   fee_reminder — overdue stage, 5 body variables: same first four plus
 *     {{5}} number of days pending.
 */

const BEFORE_DUE_TEMPLATE_NAME = "pre_due_fee_reminder";
const OVERDUE_TEMPLATE_NAME = "fee_reminder";
const FEE_REMINDER_TEMPLATES_APPROVED = true;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: enabledSettings, error } = await supabase
    .from("fee_reminder_settings")
    .select("workspace_id, send_mode")
    .eq("enabled", true)
    .eq("send_mode", "auto");

  if (error) {
    console.error("fee-reminders cron: failed to list enabled workspaces", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{ workspaceId: string; eligible: number; sent: number; skipped: string }> = [];

  for (const row of enabledSettings ?? []) {
    const workspaceId = row.workspace_id as string;
    const settings = await getFeeReminderSettings(workspaceId);
    const { data: wsData } = await supabase.from("workspaces").select("name").eq("id", workspaceId).single();
    const workspaceName = wsData?.name ?? "Your Gym";

    const eligible = await getFeeWorklist(workspaceId, settings);

    let sent = 0;
    let skipped = "";

    if (!AUTO_WHATSAPP_ENABLED) {
      skipped = "AUTO_WHATSAPP_ENABLED is off workspace-wide";
    } else if (!FEE_REMINDER_TEMPLATES_APPROVED) {
      skipped = "no approved WhatsApp template for fee reminders yet";
    } else {
      for (const item of eligible) {
        if (!item.memberPhone) continue;

        const templateName = item.reminderStage === "overdue" ? OVERDUE_TEMPLATE_NAME : BEFORE_DUE_TEMPLATE_NAME;
        const amountParam = item.amount.toLocaleString("en-IN");
        const dueDateParam = formatDueDateForWhatsApp(item.dueDate);

        const bodyParams =
          item.reminderStage === "overdue"
            ? [item.memberName, workspaceName, amountParam, dueDateParam, String(item.daysOverdue)]
            : [item.memberName, workspaceName, amountParam, dueDateParam];

        const result = await sendWhatsAppTemplate(item.memberPhone, templateName, bodyParams);

        if (result.success) {
          await supabase.from("reminders").insert({
            workspace_id: workspaceId,
            member_id: item.memberId,
            fee_id: item.feeId,
            channel: "whatsapp",
            message: item.waMessage,
            status: "sent",
            reason: "fees",
            reminder_stage: item.reminderStage,
            sent_at: new Date().toISOString(),
          });
          sent++;
        } else {
          console.error(`fee-reminders cron: send failed for ${item.memberName}`, result.error);
        }
      }
    }

    results.push({ workspaceId, eligible: eligible.length, sent, skipped });
  }

  return NextResponse.json({ ok: true, checked: results.length, results });
}
