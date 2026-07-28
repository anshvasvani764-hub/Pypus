import { supabase } from "@/lib/supabase";

export interface SnapshotStats {
  revenueToday: { value: string; delta?: string };
  checkIns: { value: string; delta?: string };
  newMembers: { value: string; context: string };
  duesToCollect: { value: string; context: string };
}

export async function getSnapshotStats(workspaceId: string): Promise<SnapshotStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // ⚠️ ASSUMPTION: table/column names below (fees, attendance_logs, members)
  // — confirm against your actual schema, naming might differ (e.g. payments vs fees)
  const [{ count: checkInCount }, { data: newMembers }, { data: duesRows }] = await Promise.all([
    supabase
      .from("attendance_logs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("checked_in_at", todayStart.toISOString()),
    supabase
      .from("members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .gte("created_at", todayStart.toISOString()),
    supabase
      .from("fees")
      .select("amount_due")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending"),
  ]);

  const duesTotal = (duesRows ?? []).reduce((sum, r) => sum + (r.amount_due ?? 0), 0);

  return {
    revenueToday: { value: "—", delta: undefined }, // TODO: wire once payments table confirmed
    checkIns: { value: String(checkInCount ?? 0) },
    newMembers: { value: String(newMembers?.length ?? 0), context: "today" },
    duesToCollect: {
      value: `₹${duesTotal.toLocaleString("en-IN")}`,
      context: `${duesRows?.length ?? 0} people`,
    },
  };
}