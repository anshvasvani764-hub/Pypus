"use client";

import { Check } from "lucide-react";
import type { Plan } from "@/lib/members/types";

interface PlanCardProps {
  plan: Plan;
  activeMemberCount: number;
  workspaceId: string;
  onEdit?: () => void;
  onViewMembers?: () => void;
  onToggleStatus?: () => void;
}

export function PlanCard({
  plan,
  activeMemberCount,
  onEdit,
  onViewMembers,
  onToggleStatus,
}: PlanCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 hover:border-gray-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{plan.name}</h3>
          <p className="mt-1 text-xs text-gray-400 capitalize">{plan.duration}</p>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
            plan.status === "active"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {plan.status === "active" ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">
          ₹{plan.price.toLocaleString("en-IN")}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">per {plan.duration}</p>
      </div>

      {plan.features.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-xs text-gray-500">
              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">{activeMemberCount} active member{activeMemberCount !== 1 ? "s" : ""}</span>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              Edit
            </button>
          )}
          {onViewMembers && (
            <button
              onClick={onViewMembers}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              View Members
            </button>
          )}
          {onToggleStatus && (
            <button
              onClick={onToggleStatus}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                plan.status === "active"
                  ? "text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100"
                  : "text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
              }`}
            >
              {plan.status === "active" ? "Disable" : "Enable"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}