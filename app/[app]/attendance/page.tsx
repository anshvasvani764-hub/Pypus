import { createClient } from "@/lib/supabase/server";
import {
  getMembers,
  getAttendanceForToday,
  getFeesForWorkspace,
} from "@/lib/supabase/queries";
import { AttendanceModuleView } from "@/components/dashboard/AttendanceModuleView";
import { AttendanceRegisterView as AttendanceRegisterViewMobile } from "@/components/mobile/AttendanceRegisterView.mobile";
import { getDevice } from "@/lib/device";
import { deriveFeeSummary } from "@/lib/members/fee-status";
import type { MemberFeeSummary } from "@/lib/members/fee-status";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ app: string }>;
}) {
  const { app: workspaceSlug } = await params;

  const supabase = await createClient();
  const { data: wsData } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("slug", workspaceSlug)
    .single();
  const workspaceId = wsData?.id ?? "";
  const workspaceName = wsData?.name ?? workspaceSlug;

  const [members, todayRecords, fees] = await Promise.all([
    getMembers(workspaceId),
    getAttendanceForToday(workspaceId),
    getFeesForWorkspace(workspaceId),
  ]);

  const feeSummaries: Record<string, MemberFeeSummary> = {};
  for (const member of members) {
    feeSummaries[member.id] = deriveFeeSummary(
      member,
      fees.filter((f) => f.member_id === member.id)
    );
  }

  if ((await getDevice()) === "mobile") {
    return (
      <AttendanceRegisterViewMobile
        workspaceSlug={workspaceSlug}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        members={members}
        todayRecords={todayRecords}
        feeSummaries={feeSummaries}
      />
    );
  }

  return (
    <AttendanceModuleView
      workspaceSlug={workspaceSlug}
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      members={members}
      todayRecords={todayRecords}
      feeSummaries={feeSummaries}
    />
  );
}


