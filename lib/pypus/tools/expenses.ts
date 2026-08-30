import { type PypusTool, type ToolContext, monthRange, today, needsConfirmation } from "./shared";
import {
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  createExpense,
  updateExpense as updateExpenseAction,
  markExpensePaid as markExpensePaidAction,
  deleteExpense as deleteExpenseAction,
} from "@/app/actions/expense-admin";

// ── READ ────────────────────────────────────────────────────────────

const expenseCategoriesList: PypusTool = {
  name: "get_expense_categories",
  riskLevel: "low",
  description: "The workspace's expense category list (name and id-free display name).",
  parameters: { type: "object", properties: {} },
  async run(ctx) {
    const { data, error } = await ctx.supabase
      .from("expense_categories")
      .select("name")
      .eq("workspace_id", ctx.workspaceId)
      .order("name", { ascending: true });
    if (error) throw error;
    return { categories: (data ?? []).map((c) => c.name) };
  },
};

const expensesSummary: PypusTool = {
  name: "get_expenses_summary",
  riskLevel: "low",
  description:
    "Expense totals for a month: total paid, total pending/overdue, and a category-wise breakdown. Pass month_offset 0 for this month and -1 for last month; call twice to compare months.",
  parameters: {
    type: "object",
    properties: {
      month_offset: { type: "integer", description: "0 = current IST month (default), -1 = previous month" },
    },
  },
  async run(ctx, args) {
    const offset = Number(args.month_offset ?? 0);
    const month = monthRange(Number.isFinite(offset) ? offset : 0);

    const { data, error } = await ctx.supabase
      .from("expenses")
      .select("title, amount, status, due_date, category_id, expense_categories(name)")
      .eq("workspace_id", ctx.workspaceId)
      .gte("due_date", month.start)
      .lte("due_date", month.end);
    if (error) throw error;

    const rows = data ?? [];
    const paid = rows.filter((r) => r.status === "paid");
    const pending = rows.filter((r) => r.status !== "paid");

    const byCategory: Record<string, number> = {};
    for (const r of rows) {
      const catName = (r as unknown as { expense_categories?: { name?: string } }).expense_categories?.name ?? "Uncategorized";
      byCategory[catName] = (byCategory[catName] ?? 0) + (r.amount ?? 0);
    }

    return {
      month: month.label,
      currency: "INR",
      totalPaid: paid.reduce((s, r) => s + (r.amount ?? 0), 0),
      totalPending: pending.reduce((s, r) => s + (r.amount ?? 0), 0),
      pendingCount: pending.length,
      byCategory,
    };
  },
};

const pendingExpenses: PypusTool = {
  name: "get_pending_expenses",
  riskLevel: "low",
  description:
    "Unpaid expenses (pending or overdue) with amount and due date, highest first. Use for 'kya-kya due hai' / overdue expense questions.",
  parameters: { type: "object", properties: {} },
  async run(ctx) {
    const { data, error } = await ctx.supabase
      .from("expenses")
      .select("title, amount, status, due_date, expense_categories(name)")
      .eq("workspace_id", ctx.workspaceId)
      .in("status", ["pending", "overdue"])
      .order("amount", { ascending: false });
    if (error) throw error;

    return {
      currency: "INR",
      pendingCount: (data ?? []).length,
      totalOutstanding: (data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0),
      expenses: (data ?? []).map((r) => ({
        title: r.title,
        amount: r.amount,
        status: r.status,
        dueDate: r.due_date,
        category: (r as unknown as { expense_categories?: { name?: string } }).expense_categories?.name ?? "Uncategorized",
      })),
    };
  },
};

const expenseHistory: PypusTool = {
  name: "get_expense_history",
  riskLevel: "low",
  description:
    "Expense history, optionally filtered by category name and/or a date range (due_date based). Use for 'is category mein kitna spend hua' or a general expense list.",
  parameters: {
    type: "object",
    properties: {
      category_name: { type: "string", description: "Filter to one category, if given" },
      from_date: { type: "string", description: "YYYY-MM-DD, inclusive lower bound on due_date" },
      to_date: { type: "string", description: "YYYY-MM-DD, inclusive upper bound on due_date" },
    },
  },
  async run(ctx, args) {
    let query = ctx.supabase
      .from("expenses")
      .select("title, amount, status, due_date, paid_date, notes, expense_categories(name)")
      .eq("workspace_id", ctx.workspaceId);

    if (typeof args.from_date === "string" && args.from_date.trim()) query = query.gte("due_date", args.from_date.trim());
    if (typeof args.to_date === "string" && args.to_date.trim()) query = query.lte("due_date", args.to_date.trim());

    const { data, error } = await query.order("due_date", { ascending: false });
    if (error) throw error;

    const categoryFilter = typeof args.category_name === "string" ? args.category_name.trim().toLowerCase() : "";
    const rows = (data ?? []).filter((r) => {
      const catName = (r as unknown as { expense_categories?: { name?: string } }).expense_categories?.name ?? "Uncategorized";
      return !categoryFilter || catName.toLowerCase() === categoryFilter;
    });

    return {
      currency: "INR",
      count: rows.length,
      totalAmount: rows.reduce((s, r) => s + (r.amount ?? 0), 0),
      expenses: rows.map((r) => ({
        title: r.title,
        amount: r.amount,
        status: r.status,
        dueDate: r.due_date,
        paidDate: r.paid_date,
        category: (r as unknown as { expense_categories?: { name?: string } }).expense_categories?.name ?? "Uncategorized",
        notes: r.notes,
      })),
    };
  },
};

// ── WRITE — expense records ────────────────────────────────────────

async function resolveCategory(ctx: ToolContext, rawName: unknown) {
  const query = String(rawName ?? "").trim().toLowerCase();
  if (!query) return { error: "category_name is required" as const };
  const { data, error } = await ctx.supabase
    .from("expense_categories")
    .select("id, name")
    .eq("workspace_id", ctx.workspaceId);
  if (error) return { error: error.message };
  const rows = (data ?? []) as { id: string; name: string }[];
  const match = rows.find((c) => c.name.toLowerCase() === query);
  if (!match) return { error: "category_not_found" as const, availableCategories: rows.map((c) => c.name) };
  return { category: match };
}

const addExpense: PypusTool = {
  name: "add_expense",
  riskLevel: "low",
  description:
    "Adds a new expense record. Use for 'naya expense add karo' type requests. Defaults status to 'pending' unless already paid, and defaults due_date to today.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      amount: { type: "number" },
      category_name: { type: "string" },
      type: { type: "string", enum: ["one_time", "fixed", "monthly_variable"], description: "Defaults to one_time" },
      status: { type: "string", enum: ["paid", "pending", "overdue"], description: "Defaults to pending" },
      due_date: { type: "string", description: "YYYY-MM-DD, defaults to today" },
      notes: { type: "string" },
    },
    required: ["title", "amount", "category_name"],
  },
  async run(ctx, args) {
    const title = typeof args.title === "string" ? args.title.trim() : "";
    if (!title) return { error: "title is required" };
    const amount = Number(args.amount);
    if (!Number.isFinite(amount) || amount <= 0) return { error: "amount must be a positive number" };

    const found = await resolveCategory(ctx, args.category_name);
    if ("error" in found) return found;

    const type = typeof args.type === "string" && ["one_time", "fixed", "monthly_variable"].includes(args.type)
      ? (args.type as "one_time" | "fixed" | "monthly_variable")
      : "one_time";
    const status = typeof args.status === "string" && ["paid", "pending", "overdue"].includes(args.status)
      ? (args.status as "paid" | "pending" | "overdue")
      : "pending";
    const dueDate = typeof args.due_date === "string" && args.due_date.trim() ? args.due_date.trim() : today();
    const notes = typeof args.notes === "string" && args.notes.trim() ? args.notes.trim() : null;

    const result = await createExpense(ctx.workspaceId, {
      title,
      amount,
      categoryId: found.category.id,
      type,
      status,
      dueDate,
      notes,
    });
    if (!result.success) return { error: result.error ?? "Could not create expense" };

    return { success: true, expense: { title, amount, category: found.category.name, type, status, dueDate } };
  },
};

const updateExpense: PypusTool = {
  name: "update_expense",
  riskLevel: "high",
  description:
    "Edits an existing expense's title, amount, category, type, status or due date. Pass only the fields that should change. Touches money records, so always preview first: call without confirmed:true, show the preview, and only call again with confirmed:true after explicit confirmation.",
  parameters: {
    type: "object",
    properties: {
      expense_title: { type: "string", description: "The expense's current title, to find it" },
      title: { type: "string" },
      amount: { type: "number" },
      category_name: { type: "string" },
      type: { type: "string", enum: ["one_time", "fixed", "monthly_variable"] },
      status: { type: "string", enum: ["paid", "pending", "overdue"] },
      due_date: { type: "string" },
      confirmed: { type: "boolean", description: "Set true only after the owner has explicitly confirmed this exact edit." },
    },
    required: ["expense_title"],
  },
  async run(ctx, args) {
    const searchTitle = typeof args.expense_title === "string" ? args.expense_title.trim().toLowerCase() : "";
    if (!searchTitle) return { error: "expense_title is required" };

    const { data: matches, error: findErr } = await ctx.supabase
      .from("expenses")
      .select("id, title, amount, status, type, due_date, category_id, expense_categories(name)")
      .eq("workspace_id", ctx.workspaceId)
      .ilike("title", `%${searchTitle}%`);
    if (findErr) return { error: `Could not search expenses: ${findErr.message}` };
    if (!matches || matches.length === 0) return { error: "expense_not_found" as const, searched: args.expense_title };
    if (matches.length > 1) return { error: "ambiguous_expense" as const, matches: matches.map((m) => m.title) };

    const expense = matches[0] as {
      id: string;
      title: string;
      amount: number;
      status: "paid" | "pending" | "overdue";
      type: "one_time" | "fixed" | "monthly_variable";
      due_date: string;
      category_id: string;
      expense_categories?: { name?: string } | null;
    };
    let categoryId = expense.category_id;
    let categoryName = expense.expense_categories?.name ?? "Uncategorized";
    if (typeof args.category_name === "string" && args.category_name.trim()) {
      const found = await resolveCategory(ctx, args.category_name);
      if ("error" in found) return found;
      categoryId = found.category.id;
      categoryName = found.category.name;
    }

    const newTitle = typeof args.title === "string" && args.title.trim() ? args.title.trim() : expense.title;
    const newAmount = args.amount !== undefined && Number.isFinite(Number(args.amount)) ? Number(args.amount) : expense.amount;
    const newType: "one_time" | "fixed" | "monthly_variable" =
      typeof args.type === "string" && ["one_time", "fixed", "monthly_variable"].includes(args.type)
        ? (args.type as "one_time" | "fixed" | "monthly_variable")
        : expense.type;
    const newStatus: "paid" | "pending" | "overdue" =
      typeof args.status === "string" && ["paid", "pending", "overdue"].includes(args.status)
        ? (args.status as "paid" | "pending" | "overdue")
        : expense.status;
    const newDueDate = typeof args.due_date === "string" && args.due_date.trim() ? args.due_date.trim() : expense.due_date;

    const preview = {
      current: { title: expense.title, amount: expense.amount, category: categoryName, type: expense.type, status: expense.status, dueDate: expense.due_date },
      changingTo: { title: newTitle, amount: newAmount, category: categoryName, type: newType, status: newStatus, dueDate: newDueDate },
    };

    const gate = needsConfirmation(args, preview);
    if (gate) return gate;

    const result = await updateExpenseAction(ctx.workspaceId, expense.id, {
      title: newTitle,
      amount: newAmount,
      categoryId,
      type: newType,
      status: newStatus,
      dueDate: newDueDate,
      notes: null,
    });
    if (!result.success) return { error: result.error ?? "Could not update expense" };

    return { success: true, ...preview };
  },
};

const markExpensePaid: PypusTool = {
  name: "mark_expense_paid",
  riskLevel: "low",
  description:
    "Marks a pending/overdue expense as paid (sets paid_date to today). Use for 'ye expense paid maar do' type requests.",
  parameters: {
    type: "object",
    properties: { expense_title: { type: "string" } },
    required: ["expense_title"],
  },
  async run(ctx, args) {
    const searchTitle = typeof args.expense_title === "string" ? args.expense_title.trim().toLowerCase() : "";
    if (!searchTitle) return { error: "expense_title is required" };

    const { data: matches, error: findErr } = await ctx.supabase
      .from("expenses")
      .select("id, title, amount, status")
      .eq("workspace_id", ctx.workspaceId)
      .ilike("title", `%${searchTitle}%`);
    if (findErr) return { error: `Could not search expenses: ${findErr.message}` };
    if (!matches || matches.length === 0) return { error: "expense_not_found" as const, searched: args.expense_title };
    if (matches.length > 1) return { error: "ambiguous_expense" as const, matches: matches.map((m) => m.title) };

    const expense = matches[0];
    if (expense.status === "paid") return { error: "already_paid" as const, expense: expense.title };

    const result = await markExpensePaidAction(ctx.workspaceId, expense.id);
    if (!result.success) return { error: result.error ?? "Could not mark expense paid" };

    return { success: true, expense: expense.title, amount: expense.amount, paidOn: today() };
  },
};

const deleteExpense: PypusTool = {
  name: "delete_expense",
  riskLevel: "high",
  description:
    "Permanently deletes an expense record. This cannot be undone, so always preview first: call without confirmed:true, show the preview, and only call again with confirmed:true after explicit confirmation.",
  parameters: {
    type: "object",
    properties: {
      expense_title: { type: "string" },
      confirmed: { type: "boolean", description: "Set true only after the owner has explicitly confirmed this deletion." },
    },
    required: ["expense_title"],
  },
  async run(ctx, args) {
    const searchTitle = typeof args.expense_title === "string" ? args.expense_title.trim().toLowerCase() : "";
    if (!searchTitle) return { error: "expense_title is required" };

    const { data: matches, error: findErr } = await ctx.supabase
      .from("expenses")
      .select("id, title, amount, status, due_date")
      .eq("workspace_id", ctx.workspaceId)
      .ilike("title", `%${searchTitle}%`);
    if (findErr) return { error: `Could not search expenses: ${findErr.message}` };
    if (!matches || matches.length === 0) return { error: "expense_not_found" as const, searched: args.expense_title };
    if (matches.length > 1) return { error: "ambiguous_expense" as const, matches: matches.map((m) => m.title) };

    const expense = matches[0];
    const preview = {
      title: expense.title,
      amount: expense.amount,
      status: expense.status,
      dueDate: expense.due_date,
      warning: "This permanently deletes the expense record and cannot be undone.",
    };

    const gate = needsConfirmation(args, preview);
    if (gate) return gate;

    const result = await deleteExpenseAction(ctx.workspaceId, expense.id);
    if (!result.success) return { error: result.error ?? "Could not delete expense" };

    return { success: true, deleted: preview };
  },
};

// ── WRITE — categories ──────────────────────────────────────────────

const addExpenseCategory: PypusTool = {
  name: "add_expense_category",
  riskLevel: "low",
  description: "Creates a new expense category. Use for 'naya category banao' type requests.",
  parameters: {
    type: "object",
    properties: { name: { type: "string" } },
    required: ["name"],
  },
  async run(ctx, args) {
    const name = typeof args.name === "string" ? args.name.trim() : "";
    if (!name) return { error: "name is required" };

    const result = await createExpenseCategory(ctx.workspaceId, name);
    if (!result.success) return { error: result.error ?? "Could not create category" };

    return { success: true, category: name };
  },
};

const updateExpenseCategoryTool: PypusTool = {
  name: "update_expense_category",
  riskLevel: "low",
  description: "Renames an existing expense category.",
  parameters: {
    type: "object",
    properties: {
      category_name: { type: "string", description: "The category's current name, to find it" },
      new_name: { type: "string" },
    },
    required: ["category_name", "new_name"],
  },
  async run(ctx, args) {
    const found = await resolveCategory(ctx, args.category_name);
    if ("error" in found) return found;

    const newName = typeof args.new_name === "string" ? args.new_name.trim() : "";
    if (!newName) return { error: "new_name is required" };

    const result = await updateExpenseCategory(ctx.workspaceId, found.category.id, newName);
    if (!result.success) return { error: result.error ?? "Could not update category" };

    return { success: true, previousName: found.category.name, newName };
  },
};

const deleteExpenseCategoryTool: PypusTool = {
  name: "delete_expense_category",
  riskLevel: "high",
  description:
    "Permanently deletes an expense category. Expenses already in this category will lose their category link. This cannot be undone, so always preview first: call without confirmed:true, show the preview, and only call again with confirmed:true after explicit confirmation.",
  parameters: {
    type: "object",
    properties: {
      category_name: { type: "string" },
      confirmed: { type: "boolean", description: "Set true only after the owner has explicitly confirmed this deletion." },
    },
    required: ["category_name"],
  },
  async run(ctx, args) {
    const found = await resolveCategory(ctx, args.category_name);
    if ("error" in found) return found;

    const { count: expenseCount } = await ctx.supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", ctx.workspaceId)
      .eq("category_id", found.category.id);

    const preview = {
      category: found.category.name,
      expensesInThisCategory: expenseCount ?? 0,
      warning: "This permanently deletes the category and cannot be undone.",
    };

    const gate = needsConfirmation(args, preview);
    if (gate) return gate;

    const result = await deleteExpenseCategory(ctx.workspaceId, found.category.id);
    if (!result.success) return { error: result.error ?? "Could not delete category" };

    return { success: true, deleted: preview };
  },
};

export const EXPENSES_TOOLS: PypusTool[] = [
  expenseCategoriesList,
  expensesSummary,
  pendingExpenses,
  expenseHistory,
  addExpense,
  updateExpense,
  markExpensePaid,
  deleteExpense,
  addExpenseCategory,
  updateExpenseCategoryTool,
  deleteExpenseCategoryTool,
];
