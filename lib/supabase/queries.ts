import { createClient } from "@/lib/supabase/server";
import type { Member, AttendanceRecord, FeeRecord, Plan } from "@/lib/members/types";

export async function getMembers(workspaceId: string): Promise<Member[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("*, plan:plans!members_plan_id_fkey(name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("getMembers error:", error);
    return [];
  }
  return (data ?? []) as Member[];
}

export async function getMemberById(
  workspaceId: string,
  memberId: string
): Promise<Member | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", memberId)
    .single();
  if (error) {
    console.error("getMemberById error:", error);
    return null;
  }
  return data as Member | null;
}

import { getISTDateString } from "@/lib/utils/date";

export async function getAttendanceForToday(
  workspaceId: string
): Promise<AttendanceRecord[]> {
  const supabase = await createClient();
  const today = getISTDateString();
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("date", today)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("getAttendanceForToday error:", error);
    return [];
  }
  return (data ?? []) as AttendanceRecord[];
}

export async function getAttendanceForMember(
  workspaceId: string,
  memberId: string
): Promise<AttendanceRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("member_id", memberId)
    .order("date", { ascending: false });
  if (error) {
    console.error("getAttendanceForMember error:", error);
    return [];
  }
  return (data ?? []) as AttendanceRecord[];
}

export async function getAttendanceForDateRange(
  workspaceId: string,
  memberId: string,
  startDate: string,
  endDate: string
): Promise<AttendanceRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("member_id", memberId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });
  if (error) {
    console.error("getAttendanceForDateRange error:", error);
    return [];
  }
  return (data ?? []) as AttendanceRecord[];
}

export async function upsertAttendance(
  workspaceId: string,
  record: Omit<AttendanceRecord, "id">
): Promise<AttendanceRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendance")
    .upsert({
      workspace_id: workspaceId,
      member_id: record.member_id,
      date: record.date,
      check_in: record.check_in,
      check_out: record.check_out,
      status: record.status,
    })
    .select()
    .single();
  if (error) {
    console.error("upsertAttendance error:", error);
    return null;
  }
  return data as AttendanceRecord;
}

export async function getPlans(workspaceId: string): Promise<Plan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("getPlans error:", error);
    return [];
  }
  return (data ?? []) as Plan[];
}

export async function getPlanById(
  workspaceId: string,
  planId: string
): Promise<Plan | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", planId)
    .single();
  if (error) {
    console.error("getPlanById error:", error);
    return null;
  }
  return data as Plan | null;
}

export async function getFeesForMember(
  workspaceId: string,
  memberId: string
): Promise<FeeRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fees")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("member_id", memberId)
    .order("due_date", { ascending: false });
  if (error) {
    console.error("getFeesForMember error:", error);
    return [];
  }
  return (data ?? []) as FeeRecord[];
}

export async function getFeeById(
  workspaceId: string,
  feeId: string
): Promise<FeeRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fees")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", feeId)
    .single();
  if (error) {
    console.error("getFeeById error:", error);
    return null;
  }
  return data as FeeRecord | null;
}

export async function upsertFee(
  workspaceId: string,
  record: Omit<FeeRecord, "id">
): Promise<FeeRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fees")
    .upsert({
      workspace_id: workspaceId,
      member_id: record.member_id,
      plan_id: record.plan_id,
      plan_name_snapshot: record.plan_name_snapshot,
      amount_snapshot: record.amount_snapshot,
      paid_amount: record.paid_amount,
      due_date: record.due_date,
      paid_date: record.paid_date,
      payment_method: record.payment_method,
      status: record.status,
      description: record.description,
    })
    .select()
    .single();
  if (error) {
    console.error("upsertFee error:", error);
    return null;
  }
  return data as FeeRecord;
}

export async function getUpcomingFees(
  workspaceId: string,
  daysAhead: number = 14
): Promise<FeeRecord[]> {
  const supabase = await createClient();
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysAhead);
  const { data, error } = await supabase
    .from("fees")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("status", ["due", "overdue"])
    .lte("due_date", endDate.toISOString().slice(0, 10))
    .gte("due_date", today.toISOString().slice(0, 10))
    .order("due_date", { ascending: true });
  if (error) {
    console.error("getUpcomingFees error:", error);
    return [];
  }
  return (data ?? []) as FeeRecord[];
}

export async function getMonthlyRevenue(
  workspaceId: string,
  month: number,
  year: number
): Promise<number> {
  const supabase = await createClient();
  const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0);
  const endDateStr = endDate.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("fees")
    .select("paid_amount")
    .eq("workspace_id", workspaceId)
    .eq("status", "paid")
    .gte("paid_date", startDate)
    .lte("paid_date", endDateStr);
  if (error) {
    console.error("getMonthlyRevenue error:", error);
    return 0;
  }
  return (data ?? []).reduce((sum, f) => sum + (f.paid_amount ?? 0), 0);
}