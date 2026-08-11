import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getPlans } from "@/lib/supabase/queries";
import { SettingsView as SettingsViewDesktop } from "@/components/settings/SettingsView";
import { SettingsView as SettingsViewMobile } from "@/components/mobile/SettingsView.mobile";
import { getDevice } from "@/lib/device";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ app: string }>;
}) {
  const { app: workspaceSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const service = createServiceClient();

  const { data: workspace } = await service
    .from("workspaces")
    .select("id, name")
    .eq("slug", workspaceSlug)
    .single();

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const workspaceId = workspace?.id ?? "";
  const plans = workspaceId ? await getPlans(workspaceId) : [];

  if ((await getDevice()) === "mobile") {
    return (
      <SettingsViewMobile
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        initialFullName={profile?.full_name ?? ""}
        initialBusinessName={workspace?.name ?? ""}
        plans={plans}
      />
    );
  }

  return (
    <SettingsViewDesktop
      workspaceSlug={workspaceSlug}
      workspaceId={workspaceId}
      initialFullName={profile?.full_name ?? ""}
      initialBusinessName={workspace?.name ?? ""}
      initialPlans={plans}
    />
  );
}

