import { MemberRegistryView } from "@/components/members/MemberRegistryView";
import { getMembers, getAttendanceForToday } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ app: string }>;
}) {
  const { app: workspaceSlug } = await params;

  const supabase = await createClient();
  const { data: wsData } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", workspaceSlug)
    .single();
  const workspaceId = wsData?.id ?? "";

  const members = await getMembers(workspaceId);
  const todayRecords = await getAttendanceForToday(workspaceId);

  const attendanceMap: Record<
    string,
    { total: number; percentage: number }
  > = {};
  const grouped: Record<string, { total: number; present: number }> = {};
  for (const m of members) {
    grouped[m.id] = { total: 0, present: 0 };
  }
  for (const r of todayRecords) {
    if (grouped[r.member_id]) {
      grouped[r.member_id].total++;
      if (r.status === "present") grouped[r.member_id].present++;
    }
  }
  for (const m of members) {
    const g = grouped[m.id];
    attendanceMap[m.id] = {
      total: g.total,
      percentage: g.total > 0 ? Math.round((g.present / g.total) * 100) : 0,
    };
  }

  const { data: feeData } = await supabase
    .from("fees")
    .select("member_id, status, due_date")
    .eq("workspace_id", workspaceId)
    .in("member_id", members.map((m) => m.id));

  const fees = (feeData ?? []) as { member_id: string; status: string; due_date: string }[];

  const today = new Date().toISOString().slice(0, 10);
  const feeStatusMap: Record<string, string> = {};

  for (const m of members) {
    const memberFees = fees.filter((f) => f.member_id === m.id);
    const hasPlan = m.plan_id != null;

    if (!hasPlan) {
      feeStatusMap[m.id] = "no_plan";
      continue;
    }

    if (memberFees.length === 0) {
      feeStatusMap[m.id] = "due";
      continue;
    }

    const latest = memberFees.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())[0];

    if (latest.status === "paid") {
      feeStatusMap[m.id] = "paid";
    } else if (latest.due_date < today || latest.status === "overdue") {
      feeStatusMap[m.id] = "overdue";
    } else {
      feeStatusMap[m.id] = "due";
    }
  }

  return (
    <MemberRegistryView
      members={members}
      workspaceSlug={workspaceSlug}
      attendanceMap={attendanceMap}
      feeStatusMap={feeStatusMap}
    />
  );
}
