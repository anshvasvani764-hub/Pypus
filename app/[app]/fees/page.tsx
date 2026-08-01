import { createServiceClient } from "@/lib/supabase/service";
import { FeesDashboard } from "@/components/fees/FeesDashboard";
import { FeesDashboardView } from "@/components/mobile/FeesDashboardView.mobile";
import { getMembers, getFeesForWorkspace, getMonthlyRevenue } from "@/lib/supabase/queries";
import { getDevice } from "@/lib/device";
import { deriveFeeSummary } from "@/lib/members/fee-status";
import type { FeeRecord } from "@/lib/members/types";

export default async function FeesPage({
  params,
}: {
  params: Promise<{ app: string }>;
}) {
  const { app: workspaceSlug } = await params;

  const supabase = createServiceClient();
  const { data: wsData } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", workspaceSlug)
    .single();
  const workspaceId = wsData?.id ?? "";

  const members = await getMembers(workspaceId);
  const fees = await getFeesForWorkspace(workspaceId);
  const monthlyRevenue = await getMonthlyRevenue(
    workspaceId,
    new Date().getMonth() + 1,
    new Date().getFullYear()
  );

  if ((await getDevice()) === "mobile") {
    const rows = members.map((m) => {
      const mFees = fees.filter((f) => f.member_id === m.id);
      const summary = deriveFeeSummary(m, mFees);
      return {
        member: m,
        feeStatus: summary.status,
        planName: summary.planName,
        amount: summary.amount,
        dueDate: summary.dueDate,
        payableFeeId: summary.payableFee?.id ?? null,
      };
    });

    const pendingDues = fees
      .filter((f) => f.status !== "paid")
      .reduce((s, f) => s + ((f.amount_snapshot ?? 0) - (f.paid_amount ?? 0)), 0);

    const expectedTotal = fees.reduce((s, f) => s + (f.amount_snapshot ?? 0), 0);
    const overdueCount = fees.filter((f) => f.status === "overdue").length;

    return (
      <FeesDashboardView
        workspaceSlug={workspaceSlug}
        workspaceId={workspaceId}
        rows={rows}
        monthlyCollection={monthlyRevenue}
        pendingDues={pendingDues}
        expectedTotal={expectedTotal}
        overdueCount={overdueCount}
      />
    );
  }

  return (
    <FeesDashboard
      workspaceSlug={workspaceSlug}
      workspaceId={workspaceId}
      members={members}
      fees={fees}
      monthlyRevenue={monthlyRevenue}
    />
  );
}
