import { createServiceClient } from "@/lib/supabase/service";
import { ExpensesDashboard } from "@/components/expenses/ExpensesDashboard";
import { ExpensesDashboardMobile } from "@/components/expenses/ExpensesDashboard.mobile";
import { getExpenses, getExpenseCategories, getExpenseTemplates } from "@/lib/expenses/queries";
import { getDevice } from "@/lib/device";

export default async function ExpensesPage({
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

  const [expenses, categories, templates] = await Promise.all([
    getExpenses(workspaceId),
    getExpenseCategories(workspaceId),
    getExpenseTemplates(workspaceId),
  ]);

  if ((await getDevice()) === "mobile") {
    return (
      <ExpensesDashboardMobile
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        expenses={expenses}
        categories={categories}
      />
    );
  }

  return (
    <ExpensesDashboard
      workspaceId={workspaceId}
      workspaceSlug={workspaceSlug}
      workspaceName={workspaceName}
      expenses={expenses}
      categories={categories}
      templates={templates}
    />
  );
}