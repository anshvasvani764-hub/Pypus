import { notFound } from "next/navigation";
import { getMemberById, getFeesForMember } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { deriveFeeSummary } from "@/lib/members/fee-status";
import { MemberBreadcrumbs } from "@/components/members/MemberBreadcrumbs";
import { MemberProfileHeader } from "@/components/members/MemberProfileHeader";
import { MemberTabs } from "@/components/members/MemberTabs";
import { MemberOverviewTab } from "@/components/members/MemberOverviewTab";
import { MemberProfileOverviewView } from "@/components/mobile/MemberProfileOverviewView.mobile";
import { getDevice } from "@/lib/device";
import { PypusPageContext } from "@/components/pypus/PypusPageContext";

export default async function MemberProfilePage({
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

  const fees = await getFeesForMember(workspaceId, memberId);
  const summary = deriveFeeSummary(member, fees);

  const basePath = `/${workspaceSlug}/members/${memberId}`;

  const pageContext = {
    selectedEntity: { type: "member", id: member.id, name: member.name },
    visibleEntities: [{ type: "member", id: member.id, name: member.name }],
    visibleData: {
      member_name: member.name,
      plan_name: summary.planName,
      fee_status: summary.status,
      due_date: summary.dueDate,
    },
    availableActions: [
      { action: "edit_member", label: "Edit member", entity: { type: "member", id: member.id, name: member.name } },
      { action: "send_fee_reminder", label: "Send fees reminder", entity: { type: "member", id: member.id, name: member.name } },
    ],
  };

  if ((await getDevice()) === "mobile") {
    return (
      <PypusPageContext context={pageContext}>
      <MemberProfileOverviewView
        member={member}
        workspaceSlug={workspaceSlug}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        feeStatus={summary.status}
        planName={summary.planName}
        amount={summary.amount}
        dueDate={summary.dueDate}
        payableFeeId={summary.payableFee?.id ?? null}
        fees={fees}
      />
      </PypusPageContext>
    );
  }

  return (
    <PypusPageContext context={pageContext}>
    <div className="w-full max-w-6xl px-8 py-10">
      <MemberBreadcrumbs
        items={[
          { label: "Workspace", href: `/${workspaceSlug}/workspace` },
          { label: "Members", href: `/${workspaceSlug}/members` },
          { label: member.name },
        ]}
      />

      <div className="mt-4">
        <MemberProfileHeader
          member={member}
          workspaceName={workspaceName}
          workspaceSlug={workspaceSlug}
          feeStatus={summary.status}
          planName={summary.planName}
          payableFeeId={summary.payableFee?.id ?? null}
        />
      </div>

      <div className="mt-6">
        <MemberTabs basePath={basePath} />
      </div>

      <MemberOverviewTab member={member} />
    </div>
    </PypusPageContext>
  );
}
