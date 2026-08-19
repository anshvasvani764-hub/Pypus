import { createServiceClient } from "@/lib/supabase/service";
import { getISTDateString, formatISTDateTime } from "@/lib/utils/date";

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
}

export interface AgentActivityItem {
  id: string;
  kind: "reminder" | "receipt";
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

/** Fees that are due or overdue right now, each with a ready WhatsApp message. */
export async function getFeeWorklist(workspaceId: string): Promise<FeeWorklistItem[]> {
  const supabase = createServiceClient();
  const today = getISTDateString();

  const [feesRes, membersRes, remindersRes] = await Promise.all([
    supabase
      .from("fees")
      .select("id, member_id, plan_name_snapshot, amount_snapshot, paid_amount, due_date, status")
      .eq("workspace_id", workspaceId)
      .in("status", ["due", "overdue"]),
    supabase.from("members").select("id, name, phone").eq("workspace_id", workspaceId),
    supabase
      .from("reminders")
      .select("fee_id, sent_at, reason")
      .eq("workspace_id", workspaceId)
      .eq("reason", "fees"),
  ]);

  if (feesRes.error) throw feesRes.error;
  if (membersRes.error) throw membersRes.error;

  const nameById = new Map((membersRes.data ?? []).map((m) => [m.id, m]));
  // Once a reminder has EVER been sent for a fee, stay hidden until it's paid —
  // a paid fee drops out of the query above entirely, and the next due cycle
  // gets a fresh fee id, so this never blocks a genuinely new bill.
  const feeIdsEverReminded = new Set((remindersRes.data ?? []).map((r) => r.fee_id));

  const out: FeeWorklistItem[] = [];
  for (const f of feesRes.data ?? []) {
    const member = nameById.get(f.member_id);
    if (!member) continue;
    const outstanding = (f.amount_snapshot ?? 0) - (f.paid_amount ?? 0);
    if (outstanding <= 0) continue;
    if (feeIdsEverReminded.has(f.id)) continue;

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
      waMessage:
        daysOverdue > 0
          ? `Hi ${member.name}, your gym fee of ₹${outstanding.toLocaleString("en-IN")} is overdue by ${daysOverdue} days. Kindly clear it at the earliest.`
          : `Hi ${member.name}, your gym fee of ₹${outstanding.toLocaleString("en-IN")} is due on ${f.due_date}. Kindly pay on time to avoid interruption.`,
    });
  }

  return out.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/** Receipts that were generated but not yet sent to the member on WhatsApp. */
export async function getReceiptWorklist(workspaceId: string): Promise<ReceiptWorklistItem[]> {
  const supabase = createServiceClient();

  const [receiptsRes, membersRes] = await Promise.all([
    supabase
      .from("receipts")
      .select("id, member_id, fee_id, receipt_number, amount, paid_date, payment_method, receipt_image_url")
      .eq("workspace_id", workspaceId)
      .is("whatsapp_sent_at", null),
    supabase.from("members").select("id, name, phone").eq("workspace_id", workspaceId),
  ]);

  if (receiptsRes.error) throw receiptsRes.error;

  const nameById = new Map((membersRes.data ?? []).map((m) => [m.id, m]));

  // "Valid till" = the due_date on the fee this receipt was paid against,
  // i.e. the next renewal date the payment covers up to.
  const feeIds = (receiptsRes.data ?? []).map((r) => r.fee_id).filter(Boolean) as string[];
  const dueDateByFeeId = new Map<string, string>();
  if (feeIds.length > 0) {
    const feesRes = await supabase.from("fees").select("id, due_date").in("id", feeIds);
    for (const f of feesRes.data ?? []) dueDateByFeeId.set(f.id, f.due_date);
  }

  return (receiptsRes.data ?? []).map((r) => {
    const member = nameById.get(r.member_id);
    const amount = Number(r.amount);
    return {
      receiptId: r.id,
      memberId: r.member_id,
      memberName: member?.name ?? "Unknown member",
      memberPhone: member?.phone ?? null,
      receiptNumber: r.receipt_number,
      amount,
      paidDate: r.paid_date,
      paymentMethod: r.payment_method ?? "Cash",
      validTillDate: r.fee_id ? (dueDateByFeeId.get(r.fee_id) ?? null) : null,
      receiptImageUrl: r.receipt_image_url ?? null,
      waMessage: `Hi ${member?.name ?? ""}, thanks for your payment of ₹${amount.toLocaleString("en-IN")}. Receipt #${r.receipt_number} — please save it for your records.`,
    };
  });
}

/** Recent agent actions (reminders sent + receipts generated) for the "proof it's working" feed. */
export async function getAgentActivity(workspaceId: string, limit = 100): Promise<AgentActivityItem[]> {
  const supabase = createServiceClient();

  const [remindersRes, receiptsRes, membersRes] = await Promise.all([
    supabase
      .from("reminders")
      .select("id, member_id, reason, message, sent_at")
      .eq("workspace_id", workspaceId)
      .order("sent_at", { ascending: false })
      .limit(limit),
    supabase
      .from("receipts")
      .select("id, member_id, receipt_number, amount, generated_at")
      .eq("workspace_id", workspaceId)
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
    memberName: nameById.get(r.member_id) ?? "Unknown member",
    detail: r.reason === "fees" ? "Fee reminder sent on WhatsApp" : "Attendance nudge sent on WhatsApp",
    at: formatISTDateTime(r.sent_at),
    atRaw: r.sent_at,
  }));

  const receiptItems: AgentActivityItem[] = (receiptsRes.data ?? []).map((r) => ({
    id: `receipt-${r.id}`,
    kind: "receipt",
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
