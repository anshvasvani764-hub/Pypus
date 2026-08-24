import { MemberRegistryView } from "@/components/members/MemberRegistryView";
import { MemberRegistryViewMobile } from "@/components/members/MemberRegistryView.mobile";
import { getDevice } from "@/lib/device";
import { getMembers, getAttendanceForToday } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { deriveFeeSummary, type DerivedFeeStatus } from "@/lib/members/fee-status";
import type { FeeRecord } from "@/lib/members/types";

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
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("member_id", members.map((m) => m.id));

  const fees = (feeData ?? []) as FeeRecord[];

  const feeStatusMap: Record<string, DerivedFeeStatus> = {};
  const planNameMap: Record<string, string | null> = {};

  for (const m of members) {
    const summary = deriveFeeSummary(
      m,
      fees.filter((f) => f.member_id === m.id)
    );
    feeStatusMap[m.id] = summary.status;
    planNameMap[m.id] = summary.planName ?? m.plan?.name ?? null;
  }

  if ((await getDevice()) === "mobile") {
    return (
      <MemberRegistryViewMobile
        members={members}
        workspaceSlug={workspaceSlug}
        workspaceId={workspaceId}
        attendanceMap={attendanceMap}
        feeStatusMap={feeStatusMap}
        planNameMap={planNameMap}
      />
    );
  }

  return (
    <MemberRegistryView
      members={members}
      workspaceSlug={workspaceSlug}
      workspaceId={workspaceId}
      attendanceMap={attendanceMap}
      feeStatusMap={feeStatusMap}
      planNameMap={planNameMap}
    />
  );
}