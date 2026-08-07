"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createExpenseCategory } from "@/app/actions/expense-admin";

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onCategoryAdded: () => void;
}

export function AddCategoryModal({ isOpen, onClose, workspaceId, onCategoryAdded }: AddCategoryModalProps) {
  if (!isOpen) return null;
  return <CategoryDialog onClose={onClose} workspaceId={workspaceId} onCategoryAdded={onCategoryAdded} />;
}

function CategoryDialog({
  onClose,
  workspaceId,
  onCategoryAdded,
}: Pick<AddCategoryModalProps, "onClose" | "workspaceId" | "onCategoryAdded">) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await createExpenseCategory(workspaceId, name);
    setBusy(false);
    if (result.success) {
      onCategoryAdded();
      onClose();
    } else {
      setError(result.error ?? "Could not add category. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Add Category</h2>
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
              placeholder="e.g. Rent, Utilities, Equipment"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="-mx-6 -mb-5 mt-5 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
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
              {busy ? "Adding…" : "Add Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}