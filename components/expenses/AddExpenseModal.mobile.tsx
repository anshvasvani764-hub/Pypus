"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { ExpenseCategory, ExpenseStatus } from "@/lib/expenses/types";

interface AddExpenseModalMobileProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    amount: number;
    categoryId: string;
    type: "one_time" | "fixed" | "monthly_variable";
    status: "paid" | "pending" | "overdue";
    dueDate: string;
    notes: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
  categories: ExpenseCategory[];
  onRequestNewCategory?: () => void;
  defaultCategoryId?: string;
}

export function AddExpenseModalMobile({
  isOpen,
  onClose,
  onSave,
  categories,
  onRequestNewCategory,
  defaultCategoryId,
}: AddExpenseModalMobileProps) {
  if (!isOpen) return null;
  return (
    <ExpenseDialogMobile
      onClose={onClose}
      onSave={onSave}
      categories={categories}
      onRequestNewCategory={onRequestNewCategory}
      defaultCategoryId={defaultCategoryId}
    />
  );
}

function ExpenseDialogMobile({
  onClose,
  onSave,
  categories,
  onRequestNewCategory,
  defaultCategoryId,
}: Pick<AddExpenseModalMobileProps, "onClose" | "onSave" | "categories" | "onRequestNewCategory" | "defaultCategoryId">) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? "");
  const [status, setStatus] = useState<ExpenseStatus>("paid");
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await onSave({
      title,
      amount: Number(amount),
      categoryId,
      type: "one_time",
      status,
      dueDate,
      notes: null,
    });
    setBusy(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.error ?? "Could not add expense. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
      <div className="w-full max-w-[340px] max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-[15px] font-semibold text-gray-900">Add Expense</h2>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 active:bg-gray-100"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3.5">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="e.g. Electricity bill"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="5000"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[13px] font-medium text-gray-700">Category</label>
              {onRequestNewCategory && (
                <button
                  type="button"
                  onClick={onRequestNewCategory}
                  className="text-[11.5px] font-medium text-emerald-600 active:text-emerald-700"
                >
                  + New
                </button>
              )}
            </div>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-[13.5px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ExpenseStatus)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {error && <p className="text-[12.5px] text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-3.5 py-2 rounded-full text-[13px] font-medium text-gray-600 border border-gray-200 bg-white active:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-3.5 py-2 rounded-full text-[13px] font-medium bg-emerald-600 text-white active:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}