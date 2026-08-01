import { createServiceClient } from "@/lib/supabase/service";
import { getPlans, getMembers } from "@/lib/supabase/queries";
import { PlansManagementView as PlansManagementViewDesktop } from "@/components/fees/PlansManagementView";
import { PlansManagementView as PlansManagementViewMobile } from "@/components/mobile/PlansManagementView.mobile";
import { getDevice } from "@/lib/device";

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

  if ((await getDevice()) === "mobile") {
    return (
      <PlansManagementViewMobile
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        plans={plans}
        members={members}
      />
    );
  }

  return (
    <PlansManagementViewDesktop
      workspaceId={workspaceId}
      workspaceSlug={workspaceSlug}
      initialPlans={plans}
      initialMembers={members}
    />
  );
}