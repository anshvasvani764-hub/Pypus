"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import type { Plan } from "@/lib/members/types";

interface PlanSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (planId: string | null, planName: string, amount: number, duration: string) => void;
  workspaceId: string;
}

export function PlanSelectorModal({ isOpen, onClose, onSubmit, workspaceId }: PlanSelectorModalProps) {
  const [mode, setMode] = useState<"existing" | "custom">("existing");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [customDuration, setCustomDuration] = useState("monthly");
  const [customAmount, setCustomAmount] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode("existing");
      setSelectedPlanId(null);
      setSelectedPlan(null);
      setCustomDuration("monthly");
      setCustomAmount("");
      setLoading(true);
      fetchPlans();
    }
  }, [isOpen]);

  async function fetchPlans() {
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .order("created_at", { ascending: true });

      if (!error && data) {
        setPlans(data as Plan[]);
      }
    } catch (err) {
      console.error("fetchPlans error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (mode === "existing" && !selectedPlan) return;
    if (mode === "custom" && (!customAmount || Number(customAmount) <= 0)) return;

    setSubmitting(true);
    try {
      if (mode === "existing" && selectedPlan) {
        onSubmit(selectedPlan.id, selectedPlan.name, selectedPlan.price, selectedPlan.duration);
      } else if (mode === "custom") {
        onSubmit(null, "Custom plan", Number(customAmount), customDuration);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Select Plan</h2>
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

        <div className="px-6 py-5 max-h-[300px] overflow-y-auto">
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
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setSelectedPlan(plan);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors text-left ${
                      selectedPlanId === plan.id
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{plan.duration} · ₹{plan.price.toLocaleString("en-IN")}</p>
                    </div>
                    {selectedPlanId === plan.id && <Check className="h-4 w-4 text-emerald-600" />}
                  </button>
                ))
              )}
            </div>
          )}

          {mode === "custom" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Duration</label>
                <select
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="monthly">Monthly (30 days)</option>
                  <option value="quarterly">Quarterly (90 days)</option>
                  <option value="yearly">Yearly (365 days)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fees Amount (₹)</label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          )}
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
            disabled={
              submitting ||
              (mode === "existing" && !selectedPlan) ||
              (mode === "custom" && (!customAmount || Number(customAmount) <= 0))
            }
            className="px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {submitting ? "Saving..." : "Assign Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}
