import { createServiceClient } from "@/lib/supabase/service";
import { AgentPendingView } from "@/components/agent/AgentPendingView";
import { getAgentDashboard } from "@/app/actions/agent";

export default async function AgentPage({
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

  const { activity, receiptsPending } = await getAgentDashboard(workspaceId);

  return (
    <AgentPendingView
      workspaceSlug={workspaceSlug}
      workspaceName={workspaceName}
      activity={activity}
      receiptsPending={receiptsPending}
    />
  );
}
