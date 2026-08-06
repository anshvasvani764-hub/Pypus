"use client";

import { useState } from "react";
import { X, CalendarDays, Wallet, Save } from "lucide-react";
import type { FeeRecord, SubscriptionStatus } from "@/lib/members/types";
import { updateFeeRecord } from "@/app/actions/edit-records";

interface EditFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: FeeRecord | null;
  workspaceId: string;
  memberId: string;
  onSaved?: (updated: FeeRecord) => void;
}

const PAYMENT_METHODS = ["UPI", "Cash"] as const;

function toISODate(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function EditFeeModal({
  isOpen,
  onClose,
  record,
  workspaceId,
  memberId,
  onSaved,
}: EditFeeModalProps) {
  const [planName, setPlanName] = useState("");
  const [amount, setAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paidDate, setPaidDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [status, setStatus] = useState<SubscriptionStatus>("due");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lastRecordId, setLastRecordId] = useState<string | null>(null);
  if (record && record.id !== lastRecordId) {
    setLastRecordId(record.id);
    setPlanName(record.plan_name_snapshot);
    setAmount(String(record.amount_snapshot ?? ""));
    setPaidAmount(String(record.paid_amount ?? "0"));
    setDueDate(toISODate(record.due_date));
    setPaidDate(toISODate(record.paid_date));
    setPaymentMethod(record.payment_method ?? "");
    setStatus(record.status);
    setError(null);
  }

  if (!isOpen || !record) return null;

  async function handleSave() {
    if (!record) return;
    if (!planName.trim()) {
      setError("Plan name is required");
      return;
    }
    if (!dueDate) {
      setError("Due date is required");
      return;
    }
    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    setSaving(true);
    setError(null);

    const result = await updateFeeRecord({
      workspaceId,
      memberId,
      recordId: record.id,
      planId: record.plan_id,
      planName: planName.trim(),
      amount: parsedAmount,
      paidAmount: parseFloat(paidAmount) || 0,
      dueDate,
      paidDate: paidDate || null,
      paymentMethod: paymentMethod || null,
      status,
    });

    setSaving(false);

    if (result.success && result.record) {
      onSaved?.(result.record);
      onClose();
    } else {
      setError(result.error || "Failed to update record");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-gray-900">Edit Fee Record</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
              <Wallet className="h-3.5 w-3.5" />
              Plan Name
            </label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g. Monthly Membership"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Amount (Rs)</label>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Paid Amount (Rs)</label>
              <input
                type="number"
                min="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Paid Date</label>
              <input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const label = method;
                const isActive = paymentMethod === method;
                return (
                  <button
                    key={label}
                    onClick={() => setPaymentMethod(method)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all border ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(["paid", "due", "overdue"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all border capitalize ${
                    status === s
                      ? s === "paid"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : s === "due"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-red-50 text-red-700 border-red-200"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}