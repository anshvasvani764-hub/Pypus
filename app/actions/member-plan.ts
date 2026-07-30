'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Plan, FeeRecord } from "@/lib/members/types";
import { getISTDateString } from "@/lib/utils/date";

const DURATION_DAYS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

export async function assignPlanToMember({
  workspaceId,
  memberId,
  planId,
  planName,
  amount,
  duration,
}: {
  workspaceId: string;
  memberId: string;
  planId: string | null;
  planName: string;
  amount: number;
  duration: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (DURATION_DAYS[duration] || 30));
  const dueDateStr = getISTDateString(dueDate);

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
      due_date: dueDateStr,
      status: "due",
    })
    .select()
    .single();

  if (feeError) {
    console.error("assignPlanToMember fee insert error:", feeError);
    return { success: false, error: feeError.message };
  }

  revalidatePath(`/[app]/members/${memberId}/fees`);
  revalidatePath(`/[app]/members/${memberId}`);

  return { success: true };
}

export async function markFeeAsPaid({
  workspaceId,
  memberId,
  feeId,
  amount,
  paidDate,
}: {
  workspaceId: string;
  memberId: string;
  feeId: string;
  amount: number;
  paidDate: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("fees")
    .update({
      status: "paid",
      paid_amount: amount,
      paid_date: paidDate,
    })
    .eq("id", feeId)
    .eq("workspace_id", workspaceId)
    .eq("member_id", memberId);

  if (error) {
    console.error("markFeeAsPaid error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[app]/members/${memberId}/fees`);
  revalidatePath(`/[app]/members/${memberId}`);

  return { success: true };
}
