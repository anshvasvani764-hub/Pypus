import { createServiceClient } from "@/lib/supabase/service";

export type WaReason = "fee_reminder" | "receipt" | "manual" | "other";

export interface WaLogContext {
  workspaceId: string;
  memberId?: string | null;
  reason: WaReason;
}

/** Meta doesn't tell us a message's billing category in the send response —
 * only the delivery/read status webhook confirms it (see
 * app/api/whatsapp/webhook/route.ts, `pricing_category` on the row). This
 * is just our best guess at send time so the dashboard has something to
 * show immediately, before that webhook lands. Update this map if a new
 * approved template gets added. */
const TEMPLATE_CATEGORY_GUESS: Record<string, string> = {
  pre_due_fee_reminder: "utility",
  fee_reminder: "utility",
  payment_receipt: "utility",
};

/** Best-effort country guess from the phone prefix, used to pick the right
 * wa_rate_card row. Only India is handled precisely since that's currently
 * 100% of traffic — extend if a workspace ever has members outside India. */
function guessCountry(toPhone: string): string {
  return toPhone.replace(/[\s\-()+]/g, "").startsWith("91") ? "IN" : "OTHER";
}

/**
 * Writes one row per outbound WhatsApp API call to wa_message_log — the
 * single source of truth the cost dashboard reads from. Called from inside
 * lib/whatsapp/client.ts right after every send attempt (success AND
 * failure — failures are worth seeing too, even though they're never
 * billable), so every call site gets logged automatically without anyone
 * having to remember to do it.
 *
 * Best-effort: a logging failure must never fail the actual WhatsApp send,
 * so this only console.errors and swallows the error.
 */
export async function logWaMessage(
  ctx: WaLogContext,
  details: {
    templateName?: string | null;
    toPhone: string;
    messageId?: string;
    sendStatus: "sent" | "failed";
    error?: string;
  }
): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("wa_message_log").insert({
      workspace_id: ctx.workspaceId,
      member_id: ctx.memberId ?? null,
      reason: ctx.reason,
      template_name: details.templateName ?? null,
      category: details.templateName
        ? TEMPLATE_CATEGORY_GUESS[details.templateName] ?? "unknown"
        : "service",
      country: guessCountry(details.toPhone),
      to_phone: details.toPhone,
      message_id: details.messageId ?? null,
      send_status: details.sendStatus,
      error: details.error ?? null,
    });
    if (error) console.error("logWaMessage insert failed:", error);
  } catch (err) {
    console.error("logWaMessage threw:", err);
  }
}
