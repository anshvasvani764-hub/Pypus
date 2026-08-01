import { Sparkles } from "lucide-react";
import { getSnapshotStats } from "@/lib/dashboard/get-snapshot-stats";
import { SnapshotBar } from "@/components/dashboard/SnapshotBar";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { COMING_SOON_CARD, MODULE_REGISTRY } from "@/lib/modules/module-registry";
import { getCurrentWorkspaceContext } from "@/lib/auth/get-current-workspace-context";
import { ModulesView } from "@/components/mobile/ModulesView.mobile";
import { getDevice } from "@/lib/device";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ app: string }>;
}) {
  const { app: workspaceSlug } = await params;
  const { workspaceId } = await getCurrentWorkspaceContext(workspaceSlug);

  const stats = await getSnapshotStats(workspaceId);
  const visibleModules = MODULE_REGISTRY;

  if ((await getDevice()) === "mobile") {
    return <ModulesView workspaceSlug={workspaceSlug} stats={stats} />;
  }

  return (
    <div className="w-full max-w-6xl px-8 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Your workspace</h1>
          <p className="mt-1 text-sm text-gray-500">
            Open a module to manage that part of your business.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          Ask Pypus AI
        </button>
      </div>

      <div className="mt-6">
        <SnapshotBar stats={stats} workspaceId={workspaceId} />
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleModules.map((m) => (
          <ModuleCard
            key={m.slug}
            title={m.title}
            description={m.description}
            icon={m.icon}
            iconBg={m.iconBg}
            iconColor={m.iconColor}
            href={`/${workspaceSlug}/${m.slug}`}
          />
        ))}
        <ModuleCard
          title={COMING_SOON_CARD.title}
          description={COMING_SOON_CARD.description}
          icon={COMING_SOON_CARD.icon}
          comingSoon
          badge="Coming soon"
        />
      </div>
    </div>
  );
}

