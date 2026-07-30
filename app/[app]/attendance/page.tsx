import { createClient } from "@/lib/supabase/server";
import { getMembers, getAttendanceForToday } from "@/lib/supabase/queries";
import { AttendanceModuleView } from "@/components/dashboard/AttendanceModuleView";

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

  const [members, todayRecords] = await Promise.all([
    getMembers(workspaceId),
    getAttendanceForToday(workspaceId),
  ]);

  return (
    <AttendanceModuleView
      workspaceSlug={workspaceSlug}
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      members={members}
      todayRecords={todayRecords}
    />
  );
}

