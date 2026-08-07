"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { updateExpenseCategory, deleteExpenseCategory } from "@/app/actions/expense-admin";

interface EditCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  category: { id: string; name: string } | null;
  onUpdated: () => void;
}

export function EditCategoryModal({ isOpen, onClose, workspaceId, category, onUpdated }: EditCategoryModalProps) {
  if (!isOpen || !category) return null;

  return (
    <CategoryDialog
      onClose={onClose}
      workspaceId={workspaceId}
      category={category}
      onUpdated={onUpdated}
    />
  );
}

function CategoryDialog({
  onClose,
  workspaceId,
  category,
  onUpdated,
}: Pick<EditCategoryModalProps, "onClose" | "workspaceId" | "onUpdated"> & {
  category: { id: string; name: string };
}) {
  const [name, setName] = useState(category.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await updateExpenseCategory(workspaceId, category.id, name);
    setBusy(false);
    if (result.success) {
      onUpdated();
      onClose();
    } else {
      setError(result.error ?? "Could not update category. Please try again.");
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await deleteExpenseCategory(workspaceId, category.id);
    setBusy(false);
    if (result.success) {
      onUpdated();
      onClose();
    } else {
      setError(result.error ?? "Could not delete category. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Edit Category</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="e.g. Rent, Utilities"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="-mx-6 -mb-5 mt-5 flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="px-4 py-2 rounded-full text-sm font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {confirmDelete ? "Confirm Delete" : "Delete"}
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-full text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
