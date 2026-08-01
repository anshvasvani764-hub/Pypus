import { getHomeOverview } from "@/lib/dashboard/get-home-overview";
import { HomeOverviewView } from "@/components/dashboard/HomeOverviewView";
import { HomeOverviewViewMobile } from "@/components/dashboard/HomeOverviewView.mobile";
import { createServiceClient } from "@/lib/supabase/service";
import { getDevice } from "@/lib/device";

export default async function HomePage({
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
  const overview = await getHomeOverview(workspaceId);
  const workspaceName = wsData?.name ?? workspaceSlug;

  const { data: userData } = await supabase
    .from("users")
    .select("avatar_url")
    .limit(1)
    .maybeSingle();
  const ownerAvatarUrl = userData?.avatar_url ?? null;

  if ((await getDevice()) === "mobile") {
    return (
      <HomeOverviewViewMobile
        overview={overview}
        workspaceSlug={workspaceSlug}
        workspaceName={workspaceName}
        ownerAvatarUrl={ownerAvatarUrl}
      />
    );
  }

  return (
    <HomeOverviewView
      overview={overview}
      workspaceSlug={workspaceSlug}
      workspaceName={workspaceName}
      ownerAvatarUrl={ownerAvatarUrl}
    />
  );
}