import { createClient } from "@/lib/supabase/server";
import { getISTDateString } from "@/lib/utils/date";

export interface SnapshotStats {
  revenueToday: { value: string; delta?: string };
  checkIns: { value: string; delta?: string };
  newMembers: { value: string; context: string };
  duesToCollect: { value: string; context: string };
}

export async function getSnapshotStats(workspaceId: string): Promise<SnapshotStats> {
  const supabase = await createClient();
  const todayStr = getISTDateString();

  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);

  const monthStart = new Date(istNow.getFullYear(), istNow.getMonth(), 1);
  const monthEnd = new Date(istNow.getFullYear(), istNow.getMonth() + 1, 0, 23, 59, 59, 999);

  const [{ count: checkInCount }, { count: newMembersCount }, { data: allMembers }, { data: pendingFees }] =
    await Promise.all([
      supabase
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("date", todayStr)
        .eq("status", "present"),
      supabase
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("joined_at", monthStart.toISOString())
        .lte("joined_at", monthEnd.toISOString()),
      supabase
        .from("members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .not("plan_id", "is", null),
      supabase
        .from("fees")
        .select("member_id, amount_snapshot, paid_amount")
        .eq("workspace_id", workspaceId)
        .in("status", ["due", "overdue"]),
    ]);

  const totalMemberCount = (allMembers ?? []).length;
  const pendingFeeRows = (pendingFees ?? []).filter((f) => (allMembers ?? []).some((m) => m.id === f.member_id));
  const pendingFeeMemberIds = new Set(pendingFeeRows.map((f) => f.member_id));
  const pendingFeesCount = pendingFeeMemberIds.size;
  const totalDuesAmount = pendingFeeRows.reduce(
    (sum, f) => sum + ((f.amount_snapshot ?? 0) - (f.paid_amount ?? 0)),
    0
  );

  return {
    revenueToday: { value: "—", delta: undefined },
    checkIns: { value: String(checkInCount ?? 0) },
    newMembers: { value: String(newMembersCount ?? 0), context: "this month" },
    duesToCollect: {
      value: `₹${totalDuesAmount.toLocaleString("en-IN")}`,
      context: `${pendingFeesCount} people`,
    },
  };
}
