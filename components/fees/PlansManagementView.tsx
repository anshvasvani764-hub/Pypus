"use client";

import { useState, useMemo } from "react";
import { Plus, X } from "lucide-react";
import type { Plan, Member } from "@/lib/members/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlanCard } from "@/components/fees/PlanCard";
import { CreatePlanModal } from "@/components/fees/CreatePlanModal";
import { savePlan } from "@/app/actions/settings";

interface PlansManagementViewProps {
  workspaceId: string;
  workspaceSlug: string;
  initialPlans: Plan[];
  initialMembers: Member[];
}

export function PlansManagementView({
  workspaceId,
  workspaceSlug,
  initialPlans,
  initialMembers,
}: PlansManagementViewProps) {
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [members] = useState<Member[]>(initialMembers);
  const [membersPlan, setMembersPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const membersByPlan = useMemo(() => {
    const map = new Map<string, Member[]>();
    for (const m of members) {
      if (!m.plan_id) continue;
      const list = map.get(m.plan_id) ?? [];
      list.push(m);
      map.set(m.plan_id, list);
    }
    return map;
  }, [members]);

  async function handleSavePlan(planData: Omit<Plan, "id" | "workspace_id">) {
    setError(null);
    const result = await savePlan({
      workspaceId,
      planId: editPlan?.id ?? null,
      ...planData,
    });

    if (result.success && result.plan) {
      setPlans((prev) => {
        const exists = prev.some((p) => p.id === result.plan!.id);
        return exists
          ? prev.map((p) => (p.id === result.plan!.id ? result.plan! : p))
          : [...prev, result.plan!];
      });
      setPlanModalOpen(false);
      setEditPlan(null);
    } else {
      setError(result.error ?? "Failed to save plan");
    }
  }

  function handleEdit(plan: Plan) {
    setError(null);
    setEditPlan(plan);
    setPlanModalOpen(true);
  }

  function handleViewMembers(plan: Plan) {
    setMembersPlan(plan);
  }

  async function handleToggleStatus(plan: Plan) {
    setError(null);
    const result = await savePlan({
      workspaceId,
      planId: plan.id,
      name: plan.name,
      duration: plan.duration,
      price: plan.price,
      status: plan.status === "active" ? "inactive" : "active",
    });

    if (result.success && result.plan) {
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? result.plan! : p)));
    } else {
      setError(result.error ?? "Failed to update plan");
    }
  }

  return (
    <div className="w-full max-w-6xl px-8 py-6">
      <PageHeader
        title="Membership Plans"
        subtitle="Create and manage gym membership packages."
        backHref={`/${workspaceSlug}/workspace`}
        actions={
          <button
            onClick={() => {
              setError(null);
              setEditPlan(null);
              setPlanModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create Plan
          </button>
        }
      />

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            activeMemberCount={membersByPlan.get(plan.id)?.length ?? 0}
            workspaceId={workspaceId}
            onEdit={() => handleEdit(plan)}
            onViewMembers={() => handleViewMembers(plan)}
            onToggleStatus={() => handleToggleStatus(plan)}
          />
        ))}
      </div>

      <CreatePlanModal
        isOpen={planModalOpen}
        onClose={() => {
          setPlanModalOpen(false);
          setEditPlan(null);
        }}
        onSave={handleSavePlan}
        editPlan={editPlan}
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
      />

      {membersPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {membersPlan.name} members
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {membersByPlan.get(membersPlan.id)?.length ?? 0} on this plan
                </p>
              </div>
              <button
                onClick={() => setMembersPlan(null)}
                className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-4 max-h-[360px] overflow-y-auto">
              {(membersByPlan.get(membersPlan.id) ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  No members on this plan yet.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {(membersByPlan.get(membersPlan.id) ?? []).map((m) => (
                    <li key={m.id}>
                      <a
                        href={`/${workspaceSlug}/members/${m.id}`}
                        className="block px-1 py-3 text-sm text-gray-800 hover:text-emerald-700 font-medium transition-colors"
                      >
                        {m.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
