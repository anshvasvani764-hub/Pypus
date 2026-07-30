import { notFound } from "next/navigation";
import { getMemberById, getAttendanceForMember } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { MemberBreadcrumbs } from "@/components/members/MemberBreadcrumbs";
import { MemberProfileHeader } from "@/components/members/MemberProfileHeader";
import { MemberTabs } from "@/components/members/MemberTabs";
import { MemberAttendanceView } from "@/components/members/MemberAttendanceView";

export default async function MemberAttendancePage({
  params,
}: {
  params: Promise<{ app: string; memberId: string }>;
}) {
  const { app: workspaceSlug, memberId } = await params;

  const supabase = await createClient();
  const { data: wsData } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("slug", workspaceSlug)
    .single();
  const workspaceId = wsData?.id ?? "";
  const workspaceName = wsData?.name ?? "Your Gym";

  const member = await getMemberById(workspaceId, memberId);
  if (!member) notFound();

  const basePath = `/${workspaceSlug}/members/${memberId}`;

  const memberAttendance = await getAttendanceForMember(workspaceId, memberId);

  return (
    <div className="w-full max-w-6xl px-8 py-10">
      <MemberBreadcrumbs
        items={[
          { label: "Workspace", href: `/${workspaceSlug}/workspace` },
          { label: "Members", href: `/${workspaceSlug}/members` },
          { label: member.name, href: basePath },
          { label: "Attendance" },
        ]}
      />

      <div className="mt-4">
        <MemberProfileHeader member={member} workspaceName={workspaceName} />
      </div>

      <div className="mt-6">
        <MemberTabs basePath={basePath} />
      </div>

      <MemberAttendanceView memberId={memberId} records={memberAttendance} />
    </div>
  );
}
