"use client";

import { useState } from "react";
import { X } from "lucide-react";

export type PaymentMethod = "Cash" | "UPI";

const METHODS: PaymentMethod[] = ["Cash", "UPI"];

interface MarkPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, method: PaymentMethod) => void;
  memberName: string;
  planName: string | null;
  defaultAmount: number;
  dueDate: string | null;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MarkPaidModal({ isOpen, ...rest }: MarkPaidModalProps) {
  if (!isOpen) return null;
  // Remounts per open so the amount field re-seeds from the row being settled.
  return <MarkPaidDialog {...rest} />;
}

function MarkPaidDialog({
  onClose,
  onConfirm,
  memberName,
  planName,
  defaultAmount,
  dueDate,
}: Omit<MarkPaidModalProps, "isOpen">) {
  const [amount, setAmount] = useState(String(defaultAmount));
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [submitting, setSubmitting] = useState(false);

  const valid = Number(amount) > 0;

  function handleConfirm() {
    if (!valid) return;
    setSubmitting(true);
    onConfirm(Number(amount), method);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Mark Paid</h2>
            <p className="text-xs text-gray-400 mt-0.5">{memberName}</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {(planName || dueDate) && (
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
              {planName && <p className="font-medium text-gray-900">{planName}</p>}
              {dueDate && <p className="mt-0.5">Due {formatDate(dueDate)}</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Amount Received (₹)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Payment Mode
            </label>
            <div className="flex items-center gap-2">
              {METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    method === m
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || !valid}
            className="px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {submitting ? "Saving..." : "Confirm Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
