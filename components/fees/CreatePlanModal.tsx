"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Plan, PlanDuration } from "@/lib/members/types";
import { PLAN_DURATION_OPTIONS } from "@/lib/members/plan-duration";

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: Omit<Plan, "id" | "workspace_id">) => void;
  editPlan?: Plan | null;
  workspaceId: string;
  workspaceSlug: string;
}

export function CreatePlanModal({ isOpen, onClose, onSave, editPlan }: CreatePlanModalProps) {
  if (!isOpen) return null;
  // Remounts per open so the form always starts from the plan being edited.
  return <PlanDialog onClose={onClose} onSave={onSave} editPlan={editPlan} />;
}

function PlanDialog({
  onClose,
  onSave,
  editPlan,
}: Pick<CreatePlanModalProps, "onClose" | "onSave" | "editPlan">) {
  const [name, setName] = useState(editPlan?.name ?? "");
  const [duration, setDuration] = useState<PlanDuration>(editPlan?.duration ?? "1_month");
  const [price, setPrice] = useState(editPlan ? String(editPlan.price) : "");
  const [features, setFeatures] = useState(editPlan?.features.join("\n") ?? "");
  const [status, setStatus] = useState(editPlan?.status ?? "active");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name,
      duration,
      price: Number(price),
      features: features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      status: status as "active" | "inactive",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {editPlan ? "Edit Plan" : "Create Plan"}
          </h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="e.g. Gold Plan"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value as PlanDuration)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                {PLAN_DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                min="0"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="4999"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Features (one per line)</label>
            <textarea
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
              placeholder="Unlimited gym access&#10;Personal training&#10;Nutrition consultation"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <button
              type="button"
              onClick={() => setStatus(status === "active" ? "inactive" : "active")}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                status === "active" ? "bg-emerald-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  status === "active" ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-xs text-gray-500">{status === "active" ? "Active" : "Inactive"}</span>
          </div>

          <p className="text-xs text-gray-400">
            Changing a plan price does not retroactively affect existing member subscriptions. Price is snapshotted at subscription time.
          </p>

          <div className="-mx-6 -mb-5 mt-5 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-full text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              {editPlan ? "Save Changes" : "Save Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}