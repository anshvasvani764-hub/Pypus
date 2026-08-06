'use server';

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import type { AttendanceRecord, FeeRecord, AttendanceStatus, SubscriptionStatus } from "@/lib/members/types";

/**
 * Update an existing fee record.
 * Guards by workspace_id + member_id so records can't be tampered with cross-workspace.
 */
export async function updateFeeRecord({
  workspaceId,
  memberId,
  recordId,
  planId,
  planName,
  amount,
  paidAmount,
  dueDate,
  paidDate,
  paymentMethod,
  status,
}: {
  workspaceId: string;
  memberId: string;
  recordId: string;
  planId: string | null;
  planName: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  paidDate: string | null;
  paymentMethod: string | null;
  status: SubscriptionStatus;
}): Promise<{ success: boolean; error?: string; record?: FeeRecord }> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("fees")
    .update({
      plan_id: planId,
      plan_name_snapshot: planName,
      amount_snapshot: amount,
      paid_amount: paidAmount,
      due_date: dueDate,
      paid_date: paidDate,
      payment_method: paymentMethod,
      status,
    })
    .eq("id", recordId)
    .eq("workspace_id", workspaceId)
    .eq("member_id", memberId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("updateFeeRecord error:", error);
    return { success: false, error: error.message };
  }

  if (!data) {
    return { success: false, error: "Fee record not found" };
  }

  revalidatePath(`/[app]/members/${memberId}/fees`, "page");
  revalidatePath(`/[app]/members/${memberId}`, "page");
  revalidatePath(`/[app]/fees`, "page");
  revalidatePath(`/[app]/members`, "page");

  return { success: true, record: data as FeeRecord };
}

/**
 * Update an existing attendance record.
 * Guards by workspace_id + member_id so records can't be tampered with cross-workspace.
 */
export async function updateAttendanceRecord({
  workspaceId,
  memberId,
  recordId,
  date,
  checkIn,
  checkOut,
  status,
}: {
  workspaceId: string;
  memberId: string;
  recordId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
}): Promise<{ success: boolean; error?: string; record?: AttendanceRecord }> {
  const supabase = createServiceClient();

  // When status is "absent", clear check-in/check-out times
  const finalCheckIn = status === "present" ? checkIn : null;
  const finalCheckOut = status === "present" ? checkOut : null;

  const { data, error } = await supabase
    .from("attendance")
    .update({
      date,
      check_in: finalCheckIn,
      check_out: finalCheckOut,
      status,
    })
    .eq("id", recordId)
    .eq("workspace_id", workspaceId)
    .eq("member_id", memberId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("updateAttendanceRecord error:", error);
    return { success: false, error: error.message };
  }

  if (!data) {
    return { success: false, error: "Attendance record not found" };
  }

  revalidatePath(`/[app]/members/${memberId}/attendance`, "page");
  revalidatePath(`/[app]/members/${memberId}`, "page");
  revalidatePath(`/[app]/attendance`, "page");
  revalidatePath(`/[app]/members`, "page");

  return { success: true, record: data as AttendanceRecord };
}
