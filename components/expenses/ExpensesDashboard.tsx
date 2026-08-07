"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Wallet, TrendingUp, Clock, Trash2, Edit3, FolderOpen } from "lucide-react";
import type { Expense, ExpenseCategory, ExpenseTemplate } from "@/lib/expenses/types";
import { AddExpenseModal } from "./AddExpenseModal";
import { AddCategoryModal } from "./AddCategoryModal";
import { EditExpenseModal } from "./EditExpenseModal";
import { EditCategoryModal } from "./EditCategoryModal";
import { createExpense, updateExpense, deleteExpense, markExpensePaid } from "@/app/actions/expense-admin";

interface ExpensesDashboardProps {
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  expenses: Expense[];
  categories: ExpenseCategory[];
  templates: ExpenseTemplate[];
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function ExpensesDashboard({
  workspaceId,
  expenses: initialExpenses,
  categories,
}: ExpensesDashboardProps) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const filteredExpenses = useMemo(() => {
    if (!filterCategory) return expenses;
    return expenses.filter((e) => e.category_id === filterCategory);
  }, [expenses, filterCategory]);

  const totalPaid = expenses
    .filter((e) => e.status === "paid")
    .reduce((s, e) => s + (e.amount ?? 0), 0);
  const totalPending = expenses
    .filter((e) => e.status === "pending")
    .reduce((s, e) => s + (e.amount ?? 0), 0);
  const totalOverdue = expenses
    .filter((e) => e.status === "overdue")
    .reduce((s, e) => s + (e.amount ?? 0), 0);

  const handleAddExpense = useCallback(
    async (data: {
      title: string;
      amount: number;
      categoryId: string;
      type: "one_time" | "fixed" | "monthly_variable";
      status: "paid" | "pending" | "overdue";
      dueDate: string;
      notes: string | null;
    }) => {
      const result = await createExpense(workspaceId, data);
      if (result.success && result.expense) {
        setExpenses((prev) => [result.expense!, ...prev]);
        setShowAddModal(false);
      }
      return result;
    },
    [workspaceId]
  );

  const handleUpdateExpense = useCallback(
    async (data: {
      title: string;
      amount: number;
      categoryId: string;
      type: "one_time" | "fixed" | "monthly_variable";
      status: "paid" | "pending" | "overdue";
      dueDate: string;
      notes: string | null;
    }) => {
      if (!editingExpense) return { success: false, error: "No expense selected" };
      const result = await updateExpense(workspaceId, editingExpense.id, data);
      if (result.success && result.expense) {
        setExpenses((prev) =>
          prev.map((e) => (e.id === editingExpense.id ? result.expense! : e))
        );
        setEditingExpense(null);
      }
      return result;
    },
    [workspaceId, editingExpense]
  );

  const handleMarkPaid = useCallback(
    async (expenseId: string) => {
      if (busy) return;
      setBusy(true);
      const result = await markExpensePaid(workspaceId, expenseId);
      setBusy(false);
      if (result.success && result.expense) {
        setExpenses((prev) =>
          prev.map((e) => (e.id === expenseId ? result.expense! : e))
        );
      }
    },
    [workspaceId, busy]
  );

  const handleDelete = useCallback(
    async (expenseId: string) => {
      if (busy) return;
      if (!confirm("Are you sure you want to delete this expense?")) return;
      setBusy(true);
      const result = await deleteExpense(workspaceId, expenseId);
      setBusy(false);
      if (result.success) {
        setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      }
    },
    [workspaceId, busy]
  );

  const handleCategoryUpdated = useCallback(() => {
    router.refresh();
  }, [router]);

  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? "Uncategorized";

  const categoryTotals = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const e of expenses) {
      const key = e.category_id ?? "uncategorized";
      const entry = map.get(key) ?? { count: 0, total: 0 };
      entry.count++;
      entry.total += e.amount ?? 0;
      map.set(key, entry);
    }
    return map;
  }, [expenses]);

  return (
    <div className="w-full max-w-6xl px-8 py-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Expenses</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track fixed, one-time and monthly expenses.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FolderOpen className="h-4 w-4" />
            Categories
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Category Management */}
      {categories.length > 0 && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-3">Categories</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCategory("")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !filterCategory
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  filterCategory === cat.id
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                <button
                  onClick={() => setFilterCategory(filterCategory === cat.id ? "" : cat.id)}
                  className="flex items-center gap-1"
                >
                  <span>{cat.name}</span>
                  <span className="opacity-60">
                    ({categoryTotals.get(cat.id)?.count ?? 0})
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCategory({ id: cat.id, name: cat.name });
                  }}
                  className="ml-1 p-0.5 rounded-full hover:bg-gray-200 transition-colors"
                  aria-label={`Edit ${cat.name}`}
                >
                  <Edit3 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snapshot cards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-emerald-50">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Paid</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {formatCurrency(totalPaid)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Pending</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {formatCurrency(totalPending)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-red-50">
              <TrendingUp className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Overdue</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {formatCurrency(totalOverdue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter info */}
      {filterCategory && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing <span className="font-medium">{filteredExpenses.length}</span> expenses in{" "}
            <span className="font-medium">{categoryName(filterCategory)}</span>
          </p>
          <button
            onClick={() => setFilterCategory("")}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Expenses table */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">
            {filterCategory ? `${categoryName(filterCategory)} Expenses` : "All Expenses"}
          </h2>
          <span className="text-xs text-gray-400">{filteredExpenses.length} records</span>
        </div>

        {filteredExpenses.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500">
            {filterCategory ? "No expenses in this category." : "No expenses yet. Click \"Add Expense\" to get started."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-6 py-3 font-medium">Title</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Due Date</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">{expense.title}</td>
                    <td className="px-6 py-3 text-gray-500">{categoryName(expense.category_id)}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-6 py-3 text-gray-500 capitalize">
                      {expense.type?.replace("_", " ") ?? "—"}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          expense.status === "paid"
                            ? "bg-emerald-50 text-emerald-600"
                            : expense.status === "overdue"
                            ? "bg-red-50 text-red-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {expense.status === "paid" ? "Paid" : expense.status === "overdue" ? "Overdue" : "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{expense.due_date ?? "—"}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {expense.status !== "paid" && (
                          <button
                            onClick={() => handleMarkPaid(expense.id)}
                            disabled={busy}
                            className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                          >
                            Mark Paid
                          </button>
                        )}
                        <button
                          onClick={() => setEditingExpense(expense)}
                          disabled={busy}
                          className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-50"
                          aria-label="Edit expense"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          disabled={busy}
                          className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                          aria-label="Delete expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddExpenseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddExpense}
        categories={categories}
      />

      <AddCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        workspaceId={workspaceId}
        onCategoryAdded={handleCategoryUpdated}
      />

      <EditExpenseModal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        onSave={handleUpdateExpense}
        expense={editingExpense}
        categories={categories}
      />

      <EditCategoryModal
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        workspaceId={workspaceId}
        category={editingCategory}
        onUpdated={handleCategoryUpdated}
      />
    </div>
  );
}
