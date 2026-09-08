import { createServiceClient } from "@/lib/supabase/service";
import { getPlans, getMembers } from "@/lib/supabase/queries";
import { PlansManagementView as PlansManagementViewDesktop } from "@/components/fees/PlansManagementView";
import { PlansManagementView as PlansManagementViewMobile } from "@/components/mobile/PlansManagementView.mobile";
import { getDevice } from "@/lib/device";
import { PypusPageContext } from "@/components/pypus/PypusPageContext";

interface PlansPageProps {
  params: Promise<{ app: string }>;
}

export default async function PlansPage({ params }: PlansPageProps) {
  const { app: workspaceSlug } = await params;
  const supabase = createServiceClient();

  const { data: wsData } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", workspaceSlug)
    .single();

  const workspaceId = wsData?.id ?? "";

  const [plans, members] = await Promise.all([
    getPlans(workspaceId),
    getMembers(workspaceId),
  ]);

  const pageContext = {
    visibleEntities: plans.map((plan) => ({ type: "plan", id: plan.id, name: plan.name })),
    availableActions: [
      { action: "create_plan", label: "Create plan" },
      { action: "edit_plan", label: "Edit plan" },
      { action: "toggle_plan_status", label: "Enable or disable plan" },
      { action: "view_plan_members", label: "View plan members" },
    ],
    visibleData: {
      plan_count: plans.length,
      active_plan_count: plans.filter((plan) => plan.status === "active").length,
    },
  };

  if ((await getDevice()) === "mobile") {
    return (
      <PypusPageContext context={pageContext}>
      <PlansManagementViewMobile
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        plans={plans}
        members={members}
      />
      </PypusPageContext>
    );
  }

  return (
    <PypusPageContext context={pageContext}>
    <PlansManagementViewDesktop
      workspaceId={workspaceId}
      workspaceSlug={workspaceSlug}
      initialPlans={plans}
      initialMembers={members}
    />
    </PypusPageContext>
  );
}