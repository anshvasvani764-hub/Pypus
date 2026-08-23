import { createClient } from "@/lib/supabase/server";
import { ImportRulesGuideView } from "@/components/import/ImportRulesGuideView";

export default async function MembersImportPage({
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

  return (
    <ImportRulesGuideView workspaceSlug={workspaceSlug} workspaceId={workspaceId} />
  );
}
