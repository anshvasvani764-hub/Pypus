import { notFound } from "next/navigation";
import { getMemberById, getFeesForMember } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { deriveFeeSummary } from "@/lib/members/fee-status";
import { MemberBreadcrumbs } from "@/components/members/MemberBreadcrumbs";
import { MemberProfileHeader } from "@/components/members/MemberProfileHeader";
import { MemberTabs } from "@/components/members/MemberTabs";
import { MemberFeesView } from "@/components/members/MemberFeesView";
import { MemberProfileFeesView } from "@/components/mobile/MemberProfileFeesView.mobile";
import { getDevice } from "@/lib/device";

export default async function MemberFeesPage({
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

  if ((await getDevice()) === "mobile") {
    return (
      <MemberProfileFeesView
        member={member}
        workspaceSlug={workspaceSlug}
        workspaceId={workspaceId}
        feeStatus={summary.status}
        planName={summary.planName}
        amount={summary.amount}
        dueDate={summary.dueDate}
        totalPaid={summary.totalPaid}
        totalPending={summary.totalPending}
        fees={fees}
        payableFeeId={summary.payableFee?.id ?? null}
      />
    );
  }

  return (
    <div className="w-full max-w-6xl px-8 py-10">
      <MemberBreadcrumbs
        items={[
          { label: "Workspace", href: `/${workspaceSlug}/workspace` },
          { label: "Members", href: `/${workspaceSlug}/members` },
          { label: member.name, href: basePath },
          { label: "Fees" },
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

      <MemberFeesView memberId={memberId} workspaceId={workspaceId} member={member} />
    </div>
  );
}

