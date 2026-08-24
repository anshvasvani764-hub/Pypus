"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { createExpenseCategory } from "@/app/actions/expense-admin";

interface AddCategoryModalMobileProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onCategoryAdded: () => void;
}

export function AddCategoryModalMobile({ isOpen, onClose, workspaceId, onCategoryAdded }: AddCategoryModalMobileProps) {
  if (!isOpen) return null;
  return <CategoryDialogMobile onClose={onClose} workspaceId={workspaceId} onCategoryAdded={onCategoryAdded} />;
}

function CategoryDialogMobile({
  onClose,
  workspaceId,
  onCategoryAdded,
}: Pick<AddCategoryModalMobileProps, "onClose" | "workspaceId" | "onCategoryAdded">) {
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-5">
      <div className="w-full max-w-[320px] rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-[15px] font-semibold text-gray-900">Add Category</h2>
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
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Category Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="e.g. Rent, Utilities"
            />
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
              {busy ? "Adding…" : "Add Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}