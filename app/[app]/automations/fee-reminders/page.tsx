import { createServiceClient } from "@/lib/supabase/service";
import { getAgentActivity, getFeeWorklist } from "@/lib/agent/queries";
import { getFeeReminderSettings } from "@/app/actions/fee-reminders";
import { FeeReminderView } from "@/components/automations/FeeReminderView";
import { UnderConstructionOverlay } from "@/components/automations/UnderConstructionOverlay";

// Page is built and wired up, just not ready to expose to gym owners yet —
// flip this off once it's ready to ship.
const FEE_REMINDERS_LIVE = false;

export default async function FeeRemindersPage({
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

  const [pending, activity, settings] = await Promise.all([
    getFeeWorklist(workspaceId),
    getAgentActivity(workspaceId),
    getFeeReminderSettings(workspaceId),
  ]);

  // Fee reminders share the "reminders" table + activity feed with
  // attendance nudges — only reason "fees" belongs on this page.
  const sentFeeReminders = activity.filter((a) => a.kind === "reminder" && a.reason === "fees");

  return (
    <div className="relative min-h-[70vh]">
      <div className={FEE_REMINDERS_LIVE ? "" : "pointer-events-none select-none blur-sm"}>
        <FeeReminderView
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
          workspaceName={workspaceName}
          pending={pending}
          sent={sentFeeReminders}
          initialSettings={settings}
        />
      </div>
      {!FEE_REMINDERS_LIVE && <UnderConstructionOverlay />}
    </div>
  );
}
