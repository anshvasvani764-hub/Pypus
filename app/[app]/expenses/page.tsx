import { ExpensesModuleView } from "@/components/dashboard/ExpensesModuleView";

export default async function ExpensesPage({
  params,
}: {
  params: Promise<{ app: string }>;
}) {
  const { app: workspaceSlug } = await params;

  return <ExpensesModuleView workspaceSlug={workspaceSlug} />;
}
