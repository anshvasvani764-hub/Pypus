import { getCurrentWorkspaceContext } from "@/lib/auth/get-current-workspace-context";
import { BusinessBrainTestPage } from "@/components/business-brain/BusinessBrainTestPage";

/**
 * TEST/LAB route only — not the final onboarding UX.
 * /<workspace-slug>/business-brain-test
 *
 * Reuses the same workspace-slug -> workspace_id resolution every other
 * workspace-scoped page in app/[app]/* uses, so this inherits the same
 * (documented, pre-existing) auth posture as the rest of the app rather
 * than introducing a second way of deriving a workspace.
 */
export default async function Page({ params }: { params: Promise<{ app: string }> }) {
  const { app: workspaceSlug } = await params;
  const { workspaceId } = await getCurrentWorkspaceContext(workspaceSlug);

  return <BusinessBrainTestPage workspaceId={workspaceId} workspaceSlug={workspaceSlug} />;
}
