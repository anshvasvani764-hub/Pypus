import { createServiceClient } from "@/lib/supabase/service";
import { getISTDateString, formatISTDateTime } from "@/lib/utils/date";
import { buildReceiptPreviewText, type ReceiptTemplateVars } from "@/lib/receipts/template-vars";
import {
  evaluateFeeReminder,
  type FeeReminderSettingsLike,
  type ReminderStage,
} from "@/lib/agent/fee-reminder-eligibility";

export interface AbsenteeWorklistItem {
  memberId: string;
  memberName: string;
  memberPhone: string | null;
  daysAbsent: number;
  lastSeenDate: string | null;
  alreadyMessagedToday: boolean;
  waMessage: string;
}

export interface FeeWorklistItem {
  memberId: string;
  feeId: string;
  memberName: string;
  memberPhone: string | null;
  planName: string | null;
  amount: number;
  dueDate: string;
  status: "due" | "overdue";
  daysOverdue: number;
  alreadyMessagedToday: boolean;
  waMessage: string;
  /** Which reminder is eligible right now: the once-off soft reminder
   *  before the due date, or the repeating overdue chain. */
  reminderStage: ReminderStage;
}

export interface ReceiptWorklistItem {
  receiptId: string;
  memberId: string;
  memberName: string;
  memberPhone: string | null;
  receiptNumber: string;
  amount: number;
  paidDate: string;
  paymentMethod: string;
  validTillDate: string | null;
  receiptImageUrl: string | null;
  waMessage: string;
  /** The exact {{1}}-{{5}} values that'll be sent — the owner's saved
   * edit if there is one, otherwise the auto-computed default. */
  templateVars: ReceiptTemplateVars;
  /** True when templateVars is an owner-edited override, not the auto-generated default. */
  isMessageEdited: boolean;
}

export interface AgentActivityItem {
  id: string;
  kind: "reminder" | "receipt";
  reason: "fees" | "attendance" | null; // set for kind "reminder", null for "receipt"
  /** Only meaningful when reason === "fees" — which log this belongs in. */
  stage: ReminderStage | null;
  memberName: string;
  detail: string;
  at: string; // formatted IST datetime (display only — don't sort on this)
  atRaw: string; // ISO timestamp, used for sorting
}

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Members with no "present" attendance row in the last `minDaysAbsent` days (and at least one historical record, so brand-new members aren't flagged). */
export async function getAbsenteeWorklist(
  workspaceId: string,
  minDaysAbsent = 3
): Promise<AbsenteeWorklistItem[]> {
  const supabase = createServiceClient();
  const today = getISTDateString();
  const windowStart = shiftDate(today, -30); // look back 30 days for "last seen"
  const cutoff = shiftDate(today, -minDaysAbsent);

  const [membersRes, attRes, remindersRes] = await Promise.all([
    supabase
      .from("members")
      .select("id, name, phone")
      .eq("workspace_id", workspaceId),
    supabase
      .from("attendance")
      .select("member_id, date, status")
      .eq("workspace_id", workspaceId)
      .gte("date", windowStart)
      .lte("date", today)
      .order("date", { ascending: false }),
    supabase
      .from("reminders")
      .select("member_id, sent_at, reason")
      .eq("workspace_id", workspaceId)
      .eq("reason", "attendance")
      .gte("sent_at", `${windowStart}T00:00:00.000Z`),
  ]);

  if (membersRes.error) throw membersRes.error;
  if (attRes.error) throw attRes.error;

  const members = membersRes.data ?? [];
  const attendance = attRes.data ?? [];

  // Latest attendance reminder sent per member — a reminder only "covers" the
  // CURRENT absence episode if it was sent after their last present day. This
  // way "done" is permanent for this episode, not just for today, but a member
  // who comes back and goes absent again correctly gets flagged fresh.
  const lastAttReminderByMember = new Map<string, string>();
  for (const r of remindersRes.data ?? []) {
    const existing = lastAttReminderByMember.get(r.member_id);
    if (!existing || r.sent_at > existing) lastAttReminderByMember.set(r.member_id, r.sent_at);
  }

  const lastPresentByMember = new Map<string, string>();
  for (const row of attendance) {
    if (row.status !== "present") continue;
    const existing = lastPresentByMember.get(row.member_id);
    if (!existing || row.date > existing) lastPresentByMember.set(row.member_id, row.date);
  }

  const out: AbsenteeWorklistItem[] = [];
  for (const m of members) {
    const lastSeen = lastPresentByMember.get(m.id) ?? null;
    // Skip members who were never seen present in the window — likely brand new, not "absent".
    if (!lastSeen) continue;
    if (lastSeen > cutoff) continue; // seen recently enough, not flagged

    const daysAbsent = Math.round(
      (new Date(today).getTime() - new Date(lastSeen).getTime()) / 86400000
    );

    const lastReminded = lastAttReminderByMember.get(m.id);
    // Reminded after this absence episode started? Then it's handled — skip.
    if (lastReminded && lastReminded.slice(0, 10) >= lastSeen) continue;

    out.push({
      memberId: m.id,
      memberName: m.name,
      memberPhone: m.phone ?? null,
      daysAbsent,
      lastSeenDate: lastSeen,
      alreadyMessagedToday: false,
      waMessage: `Hi ${m.name}, we haven't seen you at the gym in ${daysAbsent} days. Hope everything's doing well — come back soon!`,
    });
  }

  return out.sort((a, b) => b.daysAbsent - a.daysAbsent);
}

/** Fees with a reminder eligible to fire right now (before-due soft
 *  reminder, or the next step of the overdue repeat chain), each with a
 *  ready WhatsApp message. Paid fees never appear here — they drop out of
 *  the `fees` query the moment they're marked paid, which is also what
 *  "cancels" any reminder chain for them; there's no separate cancel step. */
export async function getFeeWorklist(
  workspaceId: string,
  settings: FeeReminderSettingsLike
): Promise<FeeWorklistItem[]> {
  const supabase = createServiceClient();
  const today = getISTDateString();
  const now = Date.now();

  const [feesRes, membersRes, remindersRes] = await Promise.all([
    supabase
      .from("fees")
      .select("id, member_id, plan_name_snapshot, amount_snapshot, paid_amount, due_date, status")
      .eq("workspace_id", workspaceId)
      .in("status", ["due", "overdue"]),
    supabase.from("members").select("id, name, phone").eq("workspace_id", workspaceId),
    supabase
      .from("reminders")
      .select("fee_id, sent_at, reminder_stage")
      .eq("workspace_id", workspaceId)
      .eq("reason", "fees"),
  ]);

  if (feesRes.error) throw feesRes.error;
  if (membersRes.error) throw membersRes.error;
  if (remindersRes.error) throw remindersRes.error;

  const nameById = new Map((membersRes.data ?? []).map((m) => [m.id, m]));

  // Latest sent_at per fee, split by stage — evaluateFeeReminder needs the
  // most recent send of each kind to know where in the chain a fee is.
  const lastSentByFeeAndStage = new Map<string, string>(); // key: `${feeId}:${stage}`
  for (const r of remindersRes.data ?? []) {
    if (!r.reminder_stage) continue;
    const key = `${r.fee_id}:${r.reminder_stage}`;
    const existing = lastSentByFeeAndStage.get(key);
    if (!existing || r.sent_at > existing) lastSentByFeeAndStage.set(key, r.sent_at);
  }

  const out: FeeWorklistItem[] = [];
  for (const f of feesRes.data ?? []) {
    const member = nameById.get(f.member_id);
    if (!member) continue;
    const outstanding = (f.amount_snapshot ?? 0) - (f.paid_amount ?? 0);
    if (outstanding <= 0) continue;

    const evalResult = evaluateFeeReminder(
      f.due_date,
      settings,
      lastSentByFeeAndStage.get(`${f.id}:before_due`) ?? null,
      lastSentByFeeAndStage.get(`${f.id}:overdue`) ?? null,
      now
    );
    if (!evalResult.eligible || !evalResult.stage) continue;

    const daysOverdue =
      f.due_date < today
        ? Math.round((new Date(today).getTime() - new Date(f.due_date).getTime()) / 86400000)
        : 0;

    out.push({
      memberId: f.member_id,
      feeId: f.id,
      memberName: member.name,
      memberPhone: member.phone ?? null,
      planName: f.plan_name_snapshot,
      amount: outstanding,
      dueDate: f.due_date,
      status: f.status as "due" | "overdue",
      daysOverdue,
      alreadyMessagedToday: false,
      reminderStage: evalResult.stage,
      waMessage:
        evalResult.stage === "overdue"
          ? `Hi ${member.name}, your gym fee of ₹${outstanding.toLocaleString("en-IN")} is overdue by ${daysOverdue} days. Kindly clear it at the earliest.`
          : `Hi ${member.name}, your gym fee of ₹${outstanding.toLocaleString("en-IN")} is due on ${f.due_date}. Kindly pay on time to avoid interruption.`,
    });
  }

  return out.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/** Receipts that were generated but not yet sent to the member on WhatsApp. */
export async function getReceiptWorklist(
  workspaceId: string,
  workspaceName: string
): Promise<ReceiptWorklistItem[]> {
  const supabase = createServiceClient();

  const [receiptsRes, membersRes] = await Promise.all([
    supabase
      .from("receipts")
      .select(
        "id, member_id, fee_id, receipt_number, amount, paid_date, payment_method, receipt_image_url, whatsapp_template_vars"
      )
      .eq("workspace_id", workspaceId)
      .is("whatsapp_sent_at", null)
      .eq("agent_dismissed", false),
    supabase.from("members").select("id, name, phone").eq("workspace_id", workspaceId),
  ]);

  if (receiptsRes.error) throw receiptsRes.error;

  const nameById = new Map((membersRes.data ?? []).map((m) => [m.id, m]));

  // "Valid till" = the due_date on the fee this receipt was paid against,
  // i.e. the next renewal date the payment covers up to. Plan amount /
  // remaining amount also come from here (amount_snapshot / paid_amount)
  // rather than being duplicated onto the receipt row.
  const feeIds = (receiptsRes.data ?? []).map((r) => r.fee_id).filter(Boolean) as string[];
  const feeById = new Map<string, { due_date: string; amount_snapshot: number; paid_amount: number }>();
  if (feeIds.length > 0) {
    const feesRes = await supabase
      .from("fees")
      .select("id, due_date, amount_snapshot, paid_amount")
      .in("id", feeIds);
    for (const f of feesRes.data ?? []) feeById.set(f.id, f);
  }

  return (receiptsRes.data ?? []).map((r) => {
    const member = nameById.get(r.member_id);
    const amount = Number(r.amount);
    const fee = r.fee_id ? feeById.get(r.fee_id) : undefined;
    const validTillDate = fee?.due_date ?? null;
    const defaultVars: ReceiptTemplateVars = {
      name: member?.name ?? "",
      workspaceName,
      planAmount: fee ? Number(fee.amount_snapshot) : amount,
      amountPaid: amount,
      paymentMethod: r.payment_method ?? "Cash",
      remainingAmount: fee ? Math.max(Number(fee.amount_snapshot) - Number(fee.paid_amount), 0) : 0,
      paymentDate: r.paid_date,
      validTillDate,
    };
    const savedVars = (r.whatsapp_template_vars as ReceiptTemplateVars | null) ?? null;
    const templateVars = savedVars ?? defaultVars;
    return {
      receiptId: r.id,
      memberId: r.member_id,
      memberName: member?.name ?? "Unknown member",
      memberPhone: member?.phone ?? null,
      receiptNumber: r.receipt_number,
      amount,
      paidDate: r.paid_date,
      paymentMethod: r.payment_method ?? "Cash",
      validTillDate,
      receiptImageUrl: r.receipt_image_url ?? null,
      waMessage: buildReceiptPreviewText(templateVars),
      templateVars,
      isMessageEdited: Boolean(savedVars),
    };
  });
}

/** Recent agent actions (reminders sent + receipts generated) for the "proof it's working" feed. */
export async function getAgentActivity(workspaceId: string, limit = 100): Promise<AgentActivityItem[]> {
  const supabase = createServiceClient();

  const [remindersRes, receiptsRes, membersRes] = await Promise.all([
    supabase
      .from("reminders")
      .select("id, member_id, reason, message, sent_at, reminder_stage")
      .eq("workspace_id", workspaceId)
      .order("sent_at", { ascending: false })
      .limit(limit),
    supabase
      .from("receipts")
      .select("id, member_id, receipt_number, amount, generated_at")
      .eq("workspace_id", workspaceId)
      // Only receipts actually confirmed sent belong in the "Sent" history —
      // otherwise a receipt shows as both "Queued" (from getReceiptWorklist)
      // and "Sent" (from here) at the same time.
      .not("whatsapp_sent_at", "is", null)
      .order("generated_at", { ascending: false })
      .limit(limit),
    supabase.from("members").select("id, name").eq("workspace_id", workspaceId),
  ]);

  if (remindersRes.error) throw remindersRes.error;
  if (receiptsRes.error) throw receiptsRes.error;

  const nameById = new Map((membersRes.data ?? []).map((m) => [m.id, m.name]));

  const reminderItems: AgentActivityItem[] = (remindersRes.data ?? []).map((r) => ({
    id: `reminder-${r.id}`,
    kind: "reminder",
    reason: (r.reason as "fees" | "attendance" | null) ?? null,
    stage: (r.reminder_stage as ReminderStage | null) ?? null,
    memberName: nameById.get(r.member_id) ?? "Unknown member",
    // Reminders are logged the instant they go out (wa.me link opened, or
    // the WhatsApp API call succeeded) — never a "will send later" queue —
    // so the log should say sent, not promise a future send.
    detail:
      r.reason === "fees"
        ? r.reminder_stage === "before_due"
          ? "Soft reminder sent on WhatsApp"
          : "Overdue reminder sent on WhatsApp"
        : "Attendance nudge sent on WhatsApp",
    at: formatISTDateTime(r.sent_at),
    atRaw: r.sent_at,
  }));

  const receiptItems: AgentActivityItem[] = (receiptsRes.data ?? []).map((r) => ({
    id: `receipt-${r.id}`,
    kind: "receipt",
    reason: null,
    stage: null,
    memberName: nameById.get(r.member_id) ?? "Unknown member",
    detail: `Receipt #${r.receipt_number} generated — ₹${Number(r.amount).toLocaleString("en-IN")}`,
    at: formatISTDateTime(r.generated_at),
    atRaw: r.generated_at,
  }));

  // Sort on the raw ISO timestamp, not the formatted display string — string
  // sorting "12:33 am" vs "01:37 am" puts 12 before 01 and scrambles the feed.
  return [...reminderItems, ...receiptItems]
    .sort((a, b) => (a.atRaw < b.atRaw ? 1 : -1))
    .slice(0, limit);
}
