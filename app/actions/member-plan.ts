'use server';

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import type { FeeRecord } from "@/lib/members/types";
import { getISTDateString } from "@/lib/utils/date";
import { daysForDuration } from "@/lib/members/plan-duration";

/**
 * A payment always has to buy coverage that ends in the future. Settling a row
 * that is already past its due date rolls the date forward whole cycles until
 * it lands ahead of today — otherwise the member reads as "due" the instant
 * they pay and the owner can bill them again and again.
 */
function nextDueDate(from: string, cycleDays: number, today: string): string {
  const next = new Date(from);
  do {
    next.setDate(next.getDate() + cycleDays);
  } while (getISTDateString(next) <= today);
  return getISTDateString(next);
}

/**
 * Cycle length lives on the plan, not the fee row — fees only snapshot name and
 * price. Falls back to a month when the plan was deleted or never linked.
 */
async function cycleDaysForPlan(
  supabase: ReturnType<typeof createServiceClient>,
  workspaceId: string,
  planId: string | null
): Promise<number> {
  if (!planId) return 30;
  const { data } = await supabase
    .from("plans")
    .select("duration")
    .eq("id", planId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return daysForDuration(data?.duration);
}

function revalidateMember(memberId: string) {
  revalidatePath(`/[app]/members/${memberId}/fees`, "page");
  revalidatePath(`/[app]/members/${memberId}`, "page");
  revalidatePath(`/[app]/members`, "page");
  revalidatePath(`/[app]/fees`, "page");
  revalidatePath(`/[app]/attendance`, "page");
}

export async function assignPlanToMember({
  workspaceId,
  memberId,
  planId,
  planName,
  amount,
  dueDate,
}: {
  workspaceId: string;
  memberId: string;
  planId: string | null;
  planName: string;
  amount: number;
  dueDate: string;
}): Promise<{ success: boolean; error?: string; fee?: FeeRecord }> {
  const supabase = createServiceClient();

  const { error: memberError } = await supabase
    .from("members")
    .update({ plan_id: planId })
    .eq("id", memberId)
    .eq("workspace_id", workspaceId);

  if (memberError) {
    console.error("assignPlanToMember update error:", memberError);
    return { success: false, error: memberError.message };
  }

  const { data: feeData, error: feeError } = await supabase
    .from("fees")
    .insert({
      workspace_id: workspaceId,
      member_id: memberId,
      plan_id: planId,
      plan_name_snapshot: planName,
      amount_snapshot: amount,
      paid_amount: 0,
      due_date: dueDate,
      status: "due",
    })
    .select()
    .single();

  if (feeError) {
    console.error("assignPlanToMember fee insert error:", feeError);
    return { success: false, error: feeError.message };
  }

  revalidateMember(memberId);

  return { success: true, fee: feeData as FeeRecord };
}

export async function markFeeAsPaid({
  workspaceId,
  memberId,
  feeId,
  amount,
  paymentMethod,
}: {
  workspaceId: string;
  memberId: string;
  feeId: string;
  amount: number;
  paymentMethod: string;
}): Promise<{
  success: boolean;
  error?: string;
  fee?: FeeRecord;
  /** False when the row was already settled, so callers don't double-count revenue. */
  recorded?: boolean;
  /** Amount still owed on the returned row — 0 once it's fully paid. */
  remaining?: number;
}> {
  const supabase = createServiceClient();
  const paidDate = getISTDateString();

  const { data: target, error: fetchError } = await supabase
    .from("fees")
    .select("*")
    .eq("id", feeId)
    .eq("workspace_id", workspaceId)
    .eq("member_id", memberId)
    .single();

  if (fetchError || !target) {
    console.error("markFeeAsPaid fetch error:", fetchError);
    return { success: false, error: fetchError?.message ?? "Fee record not found" };
  }

  const cycleDays = await cycleDaysForPlan(supabase, workspaceId, target.plan_id);
  const amountDue = target.amount_snapshot ?? 0;

  // An already-paid row whose due_date has passed means the member is renewing:
  // settle the new cycle as its own row so payment history/partial tracking
  // per cycle stays intact.
  if (target.status === "paid") {
    // Guard against double-billing: if this row still covers the member, the
    // renewal was already recorded (double click, stale UI) — return it as-is.
    if (target.due_date > paidDate) {
      return { success: true, fee: target as FeeRecord, recorded: false, remaining: 0 };
    }

    // The new cycle's own row starts its own paid/pending tracking from 0 —
    // a partial payment here keeps the row "due" at the same cycle's due
    // date instead of pretending the member already renewed.
    const fullyPaid = amount >= amountDue;

    const { data: renewal, error: renewalError } = await supabase
      .from("fees")
      .insert({
        workspace_id: workspaceId,
        member_id: memberId,
        plan_id: target.plan_id,
        plan_name_snapshot: target.plan_name_snapshot,
        amount_snapshot: amountDue,
        paid_amount: amount,
        due_date: fullyPaid ? nextDueDate(target.due_date, cycleDays, paidDate) : target.due_date,
        paid_date: paidDate,
        payment_method: paymentMethod,
        status: fullyPaid ? "paid" : "overdue",
      })
      .select()
      .single();

    if (renewalError) {
      console.error("markFeeAsPaid renewal insert error:", renewalError);
      return { success: false, error: renewalError.message };
    }

    revalidateMember(memberId);
    return {
      success: true,
      fee: renewal as FeeRecord,
      recorded: true,
      remaining: Math.max(amountDue - amount, 0),
    };
  }

  // Partial payments accumulate on the row instead of overwriting it — a
  // member who paid ₹8,000 of a ₹12,000 plan and comes back later to pay the
  // rest should end up at paid_amount = 12,000, not have their first ₹8,000
  // wiped out.
  const previouslyPaid = target.paid_amount ?? 0;
  const totalPaid = previouslyPaid + amount;
  const fullyPaid = totalPaid >= amountDue;

  // The due date only rolls forward once the plan is fully paid — a partial
  // payment shouldn't extend the membership or hide that money is still owed.
  const settledDueDate = fullyPaid
    ? target.due_date <= paidDate
      ? nextDueDate(target.due_date, cycleDays, paidDate)
      : target.due_date
    : target.due_date;

  const newStatus: FeeRecord["status"] = fullyPaid
    ? "paid"
    : target.due_date <= paidDate
      ? "overdue"
      : "due";

  const { data: paidFee, error } = await supabase
    .from("fees")
    .update({
      status: newStatus,
      paid_amount: totalPaid,
      paid_date: paidDate,
      payment_method: paymentMethod,
      due_date: settledDueDate,
    })
    .eq("id", feeId)
    .eq("workspace_id", workspaceId)
    .eq("member_id", memberId)
    .eq("status", target.status)
    .select()
    .maybeSingle();

  if (error) {
    console.error("markFeeAsPaid error:", error);
    return { success: false, error: error.message };
  }

  // No row came back: a concurrent click already settled it. Return the
  // current state rather than recording a second payment.
  if (!paidFee) {
    const { data: current } = await supabase
      .from("fees")
      .select("*")
      .eq("id", feeId)
      .eq("workspace_id", workspaceId)
      .single();
    revalidateMember(memberId);
    const currentFee = (current ?? target) as FeeRecord;
    return {
      success: true,
      fee: currentFee,
      recorded: false,
      remaining: Math.max((currentFee.amount_snapshot ?? 0) - (currentFee.paid_amount ?? 0), 0),
    };
  }

  revalidateMember(memberId);

  return {
    success: true,
    fee: paidFee as FeeRecord,
    recorded: true,
    remaining: Math.max(amountDue - totalPaid, 0),
  };
}
