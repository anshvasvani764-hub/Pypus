"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/lib/members/types";
import { PlanCard } from "@/components/fees/PlanCard";
import { CreatePlanModal } from "@/components/fees/CreatePlanModal";

interface PlansPageProps {
  params: Promise<{ app: string }>;
}

export default function PlansPage({ params }: PlansPageProps) {
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");

  useEffect(() => {
    async function init() {
      const { app } = await params;
      const supabase = createClient();
      const { data: wsData } = await supabase
        .from("workspaces")
        .select("id, slug")
        .eq("slug", app)
        .single();
      const wid = wsData?.id ?? "";
      const wslug = wsData?.slug ?? "";
      setWorkspaceId(wid);
      setWorkspaceSlug(wslug);

      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("workspace_id", wid)
        .order("created_at", { ascending: true });
      if (!error && data) {
        setPlans(data as Plan[]);
      }
      setLoading(false);
    }
    init();
  }, [params]);

  function handleSavePlan(planData: Omit<Plan, "id" | "workspace_id">) {
    const newPlan: Plan = {
      id: `plan-${Date.now()}`,
      workspace_id: workspaceId,
      ...planData,
    };
    setPlans((prev) => [...prev, newPlan]);
    setPlanModalOpen(false);
    setEditPlan(null);
  }

  function handleEdit(plan: Plan) {
    setEditPlan(plan);
    setPlanModalOpen(true);
  }

  function handleViewMembers(plan: Plan) {
    console.log("View members for plan:", plan.id);
  }

  function handleToggleStatus(plan: Plan) {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === plan.id
          ? { ...p, status: p.status === "active" ? "inactive" : "active" }
          : p
      )
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-6xl px-8 py-10">
        <p className="text-sm text-gray-500">Loading plans...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl px-8 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Membership Plans</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage gym membership packages.
          </p>
        </div>
        <button
          onClick={() => {
            setEditPlan(null);
            setPlanModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create Plan
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            activeMemberCount={0}
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
    </div>
  );
}