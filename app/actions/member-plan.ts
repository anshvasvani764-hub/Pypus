'use server';

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import type { FeeRecord } from "@/lib/members/types";
import { getISTDateString } from "@/lib/utils/date";

const DURATION_DAYS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

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
  return DURATION_DAYS[data?.duration ?? ""] ?? 30;
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

  // An already-paid row whose due_date has passed means the member is renewing:
  // settle the new cycle as its own row so payment history stays intact.
  if (target.status === "paid") {
    // Guard against double-billing: if this row still covers the member, the
    // renewal was already recorded (double click, stale UI) — return it as-is.
    if (target.due_date > paidDate) {
      return { success: true, fee: target as FeeRecord, recorded: false };
    }

    const { data: renewal, error: renewalError } = await supabase
      .from("fees")
      .insert({
        workspace_id: workspaceId,
        member_id: memberId,
        plan_id: target.plan_id,
        plan_name_snapshot: target.plan_name_snapshot,
        amount_snapshot: target.amount_snapshot,
        paid_amount: amount,
        due_date: nextDueDate(target.due_date, cycleDays, paidDate),
        paid_date: paidDate,
        payment_method: paymentMethod,
        status: "paid",
      })
      .select()
      .single();

    if (renewalError) {
      console.error("markFeeAsPaid renewal insert error:", renewalError);
      return { success: false, error: renewalError.message };
    }

    revalidateMember(memberId);
    return { success: true, fee: renewal as FeeRecord, recorded: true };
  }

  // Paying an overdue row also has to move its due date into the future,
  // otherwise it derives straight back to "due" the moment it is settled.
  const settledDueDate =
    target.due_date <= paidDate
      ? nextDueDate(target.due_date, cycleDays, paidDate)
      : target.due_date;

  const { data: paidFee, error } = await supabase
    .from("fees")
    .update({
      status: "paid",
      paid_amount: amount,
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
    return { success: true, fee: (current ?? target) as FeeRecord, recorded: false };
  }

  revalidateMember(memberId);

  return { success: true, fee: paidFee as FeeRecord, recorded: true };
}
