'use server';

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { getISTDateString } from "@/lib/utils/date";
import type { Expense, ExpenseCategory } from "@/lib/expenses/types";

export async function createExpenseCategory(
  workspaceId: string,
  name: string
): Promise<{ success: boolean; error?: string; category?: ExpenseCategory }> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("expense_categories")
    .insert({ workspace_id: workspaceId, name })
    .select()
    .single();

  if (error) {
    console.error("createExpenseCategory error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[app]/expenses`, "page");
  revalidatePath(`/[app]`, "page");
  revalidatePath(`/api/dashboard/revenue-expenses`);
  return { success: true, category: data as ExpenseCategory };
}

export async function updateExpenseCategory(
  workspaceId: string,
  categoryId: string,
  name: string
): Promise<{ success: boolean; error?: string; category?: ExpenseCategory }> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("expense_categories")
    .update({ name })
    .eq("id", categoryId)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error) {
    console.error("updateExpenseCategory error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[app]/expenses`, "page");
  revalidatePath(`/[app]`, "page");
  revalidatePath(`/api/dashboard/revenue-expenses`);
  return { success: true, category: data as ExpenseCategory };
}

export async function deleteExpenseCategory(
  workspaceId: string,
  categoryId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("expense_categories")
    .delete()
    .eq("id", categoryId)
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("deleteExpenseCategory error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[app]/expenses`, "page");
  revalidatePath(`/[app]`, "page");
  revalidatePath(`/api/dashboard/revenue-expenses`);
  return { success: true };
}

export async function createExpense(
  workspaceId: string,
  data: {
    title: string;
    amount: number;
    categoryId: string;
    type: "one_time" | "fixed" | "monthly_variable";
    status: "paid" | "pending" | "overdue";
    dueDate: string;
    notes: string | null;
  }
): Promise<{ success: boolean; error?: string; expense?: Expense }> {
  const supabase = createServiceClient();

  const insert: Record<string, unknown> = {
    workspace_id: workspaceId,
    category_id: data.categoryId,
    title: data.title,
    amount: data.amount,
    type: data.type,
    status: data.status,
    due_date: data.dueDate,
    notes: data.notes,
  };

  if (data.status === "paid") {
    insert.paid_date = getISTDateString();
  }

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert(insert)
    .select()
    .single();

  if (error) {
    console.error("createExpense error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[app]/expenses`, "page");
  revalidatePath(`/[app]`, "page");
  revalidatePath(`/api/dashboard/revenue-expenses`);
  return { success: true, expense: expense as Expense };
}

export async function updateExpense(
  workspaceId: string,
  expenseId: string,
  data: {
    title: string;
    amount: number;
    categoryId: string;
    type: "one_time" | "fixed" | "monthly_variable";
    status: "paid" | "pending" | "overdue";
    dueDate: string;
    notes: string | null;
  }
): Promise<{ success: boolean; error?: string; expense?: Expense }> {
  const supabase = createServiceClient();

  const update: Record<string, unknown> = {
    category_id: data.categoryId,
    title: data.title,
    amount: data.amount,
    type: data.type,
    status: data.status,
    due_date: data.dueDate,
    notes: data.notes,
  };

  if (data.status === "paid") {
    update.paid_date = getISTDateString();
  }

  const { data: expense, error } = await supabase
    .from("expenses")
    .update(update)
    .eq("id", expenseId)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error) {
    console.error("updateExpense error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[app]/expenses`, "page");
  revalidatePath(`/[app]`, "page");
  revalidatePath(`/api/dashboard/revenue-expenses`);
  return { success: true, expense: expense as Expense };
}

export async function markExpensePaid(
  workspaceId: string,
  expenseId: string
): Promise<{ success: boolean; error?: string; expense?: Expense }> {
  const supabase = createServiceClient();

  const { data: expense, error } = await supabase
    .from("expenses")
    .update({
      status: "paid",
      paid_date: getISTDateString(),
    })
    .eq("id", expenseId)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error) {
    console.error("markExpensePaid error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[app]/expenses`, "page");
  revalidatePath(`/[app]`, "page");
  revalidatePath(`/api/dashboard/revenue-expenses`);
  return { success: true, expense: expense as Expense };
}

export async function deleteExpense(
  workspaceId: string,
  expenseId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("deleteExpense error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/[app]/expenses`, "page");
  revalidatePath(`/[app]`, "page");
  revalidatePath(`/api/dashboard/revenue-expenses`);
  return { success: true };
}