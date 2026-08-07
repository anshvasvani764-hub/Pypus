import { createServiceClient } from "@/lib/supabase/service";
import type { Expense, ExpenseCategory, ExpenseTemplate } from "@/lib/expenses/types";

// ─── Categories ────────────────────────────────────────────────────────────

export async function getExpenseCategories(workspaceId: string): Promise<ExpenseCategory[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name", { ascending: true });
  if (error) {
    console.error("getExpenseCategories error:", error);
    return [];
  }
  return (data ?? []) as ExpenseCategory[];
}

export async function createExpenseCategory(
  workspaceId: string,
  name: string
): Promise<ExpenseCategory | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("expense_categories")
    .insert({ workspace_id: workspaceId, name })
    .select()
    .single();
  if (error) {
    console.error("createExpenseCategory error:", error);
    return null;
  }
  return data as ExpenseCategory;
}

// ─── Templates ─────────────────────────────────────────────────────────────

export async function getExpenseTemplates(workspaceId: string): Promise<ExpenseTemplate[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("expense_templates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("getExpenseTemplates error:", error);
    return [];
  }
  return (data ?? []) as ExpenseTemplate[];
}

// ─── Expenses ──────────────────────────────────────────────────────────────

export async function getExpenses(workspaceId: string): Promise<Expense[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("due_date", { ascending: false });
  if (error) {
    console.error("getExpenses error:", error);
    return [];
  }
  return (data ?? []) as Expense[];
}

/**
 * Sum of `amount` for `expenses` rows where `status = 'paid'` and
 * `paid_date` falls within the given month (cash basis).
 * Mirrors getMonthlyRevenue's date logic exactly.
 */
export async function getExpensesForMonth(
  workspaceId: string,
  month: number,
  year: number
): Promise<number> {
  const supabase = createServiceClient();
  const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0);
  const endDateStr = endDate.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("expenses")
    .select("amount")
    .eq("workspace_id", workspaceId)
    .eq("status", "paid")
    .gte("paid_date", startDate)
    .lte("paid_date", endDateStr);
  if (error) {
    console.error("getExpensesForMonth error:", error);
    return 0;
  }
  return (data ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0);
}