"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface AddMemberModalMobileProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; phone: string; email?: string }) => Promise<{ success: boolean; error?: string }>;
}

export function AddMemberModalMobile({ isOpen, onClose, onSave }: AddMemberModalMobileProps) {
  if (!isOpen) return null;
  return <MemberDialogMobile onClose={onClose} onSave={onSave} />;
}

function MemberDialogMobile({
  onClose,
  onSave,
}: Pick<AddMemberModalMobileProps, "onClose" | "onSave">) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await onSave({ name, phone, email: email || undefined });
    setBusy(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.error ?? "Could not add member. Please try again.");
    }
  }

  return (
    // Small centered card, sized purely to its content — no vh/dvh tricks.
    // A generous max-height + inner scroll is only a safety net for tiny
    // screens or when the keyboard is open, it never forces full height.
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
      <div className="w-full max-w-[340px] max-h-[80vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-[15px] font-semibold text-gray-900">Add Member</h2>
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
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="e.g. Rahul Sharma"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="+91 98765 43210"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">
              Email <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-[13.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="rahul@example.com"
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
              {busy ? "Adding…" : "Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}