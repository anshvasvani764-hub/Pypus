import { createClient } from "@/lib/supabase/server";
import { FeesDashboard } from "@/components/fees/FeesDashboard";
import { getMembers, getUpcomingFees, getMonthlyRevenue } from "@/lib/supabase/queries";

export default async function FeesPage({
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
  const upcomingFees = await getUpcomingFees(workspaceId);
  const monthlyRevenue = await getMonthlyRevenue(workspaceId, new Date().getMonth() + 1, new Date().getFullYear());

  return (
    <FeesDashboard
      workspaceSlug={workspaceSlug}
      members={members}
      upcomingFees={upcomingFees}
      monthlyRevenue={monthlyRevenue}
    />
  );
}