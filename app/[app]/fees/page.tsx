import { createServiceClient } from "@/lib/supabase/service";
import { FeesDashboard } from "@/components/fees/FeesDashboard";
import { FeesDashboardView } from "@/components/mobile/FeesDashboardView.mobile";
import { getMembers, getFeesForWorkspace, getFeesForWorkspaceByMonth, getMonthlyRevenue } from "@/lib/supabase/queries";
import { getDevice } from "@/lib/device";
import { deriveFeeSummary } from "@/lib/members/fee-status";
import { getISTDateString } from "@/lib/utils/date";

export default async function FeesPage({
  params,
}: {
  params: Promise<{ app: string }>;
}) {
  const { app: workspaceSlug } = await params;

  const supabase = createServiceClient();
  const { data: wsData } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("slug", workspaceSlug)
    .single();
  const workspaceId = wsData?.id ?? "";
  const workspaceName = wsData?.name ?? "Your Gym";

  const members = await getMembers(workspaceId);
  const fees = await getFeesForWorkspace(workspaceId);
  const monthlyRevenue = await getMonthlyRevenue(
    workspaceId,
    new Date().getMonth() + 1,
    new Date().getFullYear()
  );

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthFees = await getFeesForWorkspaceByMonth(workspaceId, currentMonth, currentYear);
  const expectedRevenue = monthFees.reduce((s, f) => s + (f.amount_snapshot ?? 0), 0);
  const todayStr = getISTDateString();
  const pendingCollection = monthFees
    .filter((f) => f.status !== "paid" && f.due_date <= todayStr)
    .reduce((s, f) => s + ((f.amount_snapshot ?? 0) - (f.paid_amount ?? 0)), 0);

  if ((await getDevice()) === "mobile") {
    const rows = members.map((m) => {
      const mFees = fees.filter((f) => f.member_id === m.id);
      const summary = deriveFeeSummary(m, mFees);
      return {
        member: m,
        feeStatus: summary.status,
        planName: summary.planName,
        amount: summary.amount,
        paidAmount: summary.payableFee?.paid_amount ?? 0,
        dueDate: summary.dueDate,
        payableFeeId: summary.payableFee?.id ?? null,
      };
    });

    const pendingDues = monthFees
      .filter((f) => f.status !== "paid" && f.due_date <= todayStr)
      .reduce((s, f) => s + ((f.amount_snapshot ?? 0) - (f.paid_amount ?? 0)), 0);

    const overdueCount = monthFees.filter((f) => f.status === "overdue").length;

    return (
      <FeesDashboardView
        workspaceSlug={workspaceSlug}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        rows={rows}
        monthlyCollection={monthlyRevenue}
        pendingDues={pendingDues}
        expectedTotal={expectedRevenue}
        overdueCount={overdueCount}
      />
    );
  }

  return (
    <FeesDashboard
      workspaceSlug={workspaceSlug}
      workspaceId={workspaceId}
      workspaceName={workspaceName}
      members={members}
      fees={fees}
      monthlyRevenue={monthlyRevenue}
      expectedRevenue={expectedRevenue}
      pendingCollection={pendingCollection}
    />
  );
}
