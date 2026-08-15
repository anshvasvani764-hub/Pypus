'use server';

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import {
  getAbsenteeWorklist,
  getFeeWorklist,
  getAgentActivity,
} from "@/lib/agent/queries";

export async function getAgentDashboard(workspaceId: string) {
  const [absentees, feesDue, activity] = await Promise.all([
    getAbsenteeWorklist(workspaceId),
    getFeeWorklist(workspaceId),
    getAgentActivity(workspaceId),
  ]);
  return { absentees, feesDue, activity };
}

/** Called right after a payment is marked paid, so the receipt shows up in the Agent activity feed. */
export async function saveReceipt({
  workspaceId,
  memberId,
  feeId,
  receiptNumber,
  amount,
  paymentMethod,
  paidDate,
}: {
  workspaceId: string;
  memberId: string;
  feeId: string | null;
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  paidDate: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("receipts").insert({
    workspace_id: workspaceId,
    member_id: memberId,
    fee_id: feeId,
    receipt_number: receiptNumber,
    amount,
    payment_method: paymentMethod,
    paid_date: paidDate,
  });

  if (error) {
    console.error("saveReceipt insert error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[app]/agent`, "page");
  return { success: true };
}
