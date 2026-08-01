"use client";

import { X, AlertCircle } from "lucide-react";

interface PendingFeesAlertProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  planName: string | null;
  amount: number | null;
  dueDate: string | null;
  isOverdue: boolean;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PendingFeesAlert({
  isOpen,
  onClose,
  memberName,
  planName,
  amount,
  dueDate,
  isOverdue,
}: PendingFeesAlertProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            isOverdue ? "bg-red-100 text-red-600" : "bg-amber-50 text-amber-600"
          }`}
        >
          <AlertCircle className="h-5 w-5" />
        </div>

        <h2 className="mt-4 text-base font-semibold text-gray-900">
          {isOverdue ? "Fees overdue" : "Fees pending"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {memberName} is checked in, but their payment is still pending.
        </p>

        <div className="mt-4 space-y-2 rounded-xl bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Plan</span>
            <span className="text-sm font-medium text-gray-900">
              {planName ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Amount</span>
            <span className="text-sm font-semibold text-gray-900">
              {amount != null ? formatCurrency(amount) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Due date</span>
            <span
              className={`text-sm font-medium ${
                isOverdue ? "text-red-600" : "text-amber-600"
              }`}
            >
              {dueDate ? formatDate(dueDate) : "—"}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-full bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
