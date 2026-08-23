"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import type { Plan } from "@/lib/members/types";
import { getISTDateString } from "@/lib/utils/date";
import { PLAN_DURATION_OPTIONS, daysForDuration } from "@/lib/members/plan-duration";

interface PlanSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    planId: string | null,
    planName: string,
    amount: number,
    dueDate: string
  ) => void;
  workspaceId: string;
  memberName?: string;
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return getISTDateString(d);
}

export function PlanSelectorModal({ isOpen, ...rest }: PlanSelectorModalProps) {
  if (!isOpen) return null;
  // Remounts per open so plan selection and the seeded due date start fresh.
  return <PlanSelectorDialog {...rest} />;
}

function PlanSelectorDialog({
  onClose,
  onSubmit,
  workspaceId,
  memberName,
}: Omit<PlanSelectorModalProps, "isOpen">) {
  const [mode, setMode] = useState<"existing" | "custom">("existing");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [customName, setCustomName] = useState("");
  const [customDuration, setCustomDuration] = useState("1");
  const [customAmount, setCustomAmount] = useState("");
  const [dueDate, setDueDate] = useState(() => addDays(30));
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchPlans() {
      try {
        const supabase = (await import("@/lib/supabase/client")).createClient();
        const { data, error } = await supabase
          .from("plans")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("status", "active")
          .order("created_at", { ascending: true });

        if (active && !error && data) {
          setPlans(data as Plan[]);
        }
      } catch (err) {
        console.error("fetchPlans error:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchPlans();
    return () => {
      active = false;
    };
  }, [workspaceId]);

  function handleSelectPlan(plan: Plan) {
    setSelectedPlan(plan);
    setDueDate(addDays(daysForDuration(plan.duration)));
  }

  function handleCustomDurationChange(value: string) {
    setCustomDuration(value);
    setDueDate(addDays(daysForDuration(value)));
  }

  const canSubmit = Boolean(
    dueDate &&
      (mode === "existing"
        ? selectedPlan
        : customAmount && Number(customAmount) > 0)
  );

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      if (mode === "existing" && selectedPlan) {
        onSubmit(selectedPlan.id, selectedPlan.name, selectedPlan.price, dueDate);
      } else {
        onSubmit(
          null,
          customName.trim() || "Custom plan",
          Number(customAmount),
          dueDate
        );
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Assign Plan</h2>
            {memberName && (
              <p className="text-xs text-gray-400 mt-0.5">{memberName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <button
            onClick={() => setMode("existing")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              mode === "existing"
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
            }`}
          >
            Existing Plan
          </button>
          <button
            onClick={() => setMode("custom")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              mode === "custom"
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
            }`}
          >
            Custom Plan
          </button>
        </div>

        <div className="px-6 py-5 max-h-[340px] overflow-y-auto space-y-4">
          {mode === "existing" && (
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-gray-500 text-center py-4">Loading plans...</p>
              ) : plans.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No active plans found</p>
              ) : (
                plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors text-left ${
                      selectedPlan?.id === plan.id
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                      <p className="text-xs text-gray-400 capitalize">
                        {plan.duration} · ₹{plan.price.toLocaleString("en-IN")}
                      </p>
                    </div>
                    {selectedPlan?.id === plan.id && (
                      <Check className="h-4 w-4 text-emerald-600" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {mode === "custom" && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Plan Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Summer Special"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Duration
                </label>
                <select
                  value={customDuration}
                  onChange={(e) => handleCustomDurationChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {PLAN_DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.months * 30} days)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Fees Amount (₹)
                </label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </>
          )}

          <div className="pt-1 border-t border-gray-100">
            <label className="block text-xs font-medium text-gray-700 mb-1 mt-3">
              Next Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Fees stay paid until this date, then flip back to due.
            </p>
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
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            className="px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {submitting ? "Saving..." : "Assign Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
