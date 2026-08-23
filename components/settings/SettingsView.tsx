"use client";

import { useState } from "react";
import { User, CreditCard, Phone, MessageCircle, Plus, Pencil, Trash2, X, LogOut } from "lucide-react";
import type { Plan, PlanDuration } from "@/lib/members/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { updateProfileSettings, savePlan, deletePlan } from "@/app/actions/settings";
import { createClient } from "@/lib/supabase/client";
import { PLAN_DURATION_OPTIONS, durationLabel } from "@/lib/members/plan-duration";

const SUPPORT_PHONE = "+917827621580";
const WHATSAPP_NUMBER = "917827621580";

interface SettingsViewProps {
  workspaceSlug: string;
  workspaceId: string;
  initialFullName: string;
  initialBusinessName: string;
  initialPlans: Plan[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function feedbackMessage(name: string, business: string) {
  const who = name.trim() || "there";
  const gym = business.trim() || "my gym";
  return `Hi Ansh, this is ${who}. I'm using Pypus to run ${gym} and I'd like to share some feedback:`;
}

export function SettingsView({
  workspaceSlug,
  workspaceId,
  initialFullName,
  initialBusinessName,
  initialPlans,
}: SettingsViewProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [editing, setEditing] = useState<Plan | "new" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function flashToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSaveProfile() {
    if (saving) return;
    setSaving(true);
    const result = await updateProfileSettings({ workspaceId, fullName, businessName });
    setSaving(false);
    flashToast(result.success ? "Profile saved" : result.error || "Failed to save");
  }

  async function handleSavePlan(
    planId: string | null,
    name: string,
    duration: PlanDuration,
    price: number
  ) {
    const result = await savePlan({ workspaceId, planId, name, duration, price });

    if (result.success && result.plan) {
      setPlans((prev) => {
        const exists = prev.some((p) => p.id === result.plan!.id);
        return exists
          ? prev.map((p) => (p.id === result.plan!.id ? result.plan! : p))
          : [...prev, result.plan!];
      });
      setEditing(null);
      flashToast(planId ? "Plan updated" : "Plan created");
    } else {
      flashToast(result.error || "Failed to save plan");
    }
  }

  async function handleDeletePlan(plan: Plan) {
    const result = await deletePlan({ workspaceId, planId: plan.id });
    if (result.success) {
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
      flashToast("Plan removed");
    } else {
      flashToast(result.error || "Failed to remove plan");
    }
  }

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    feedbackMessage(fullName, businessName)
  )}`;

  return (
    <div className="w-full max-w-3xl px-8 py-6 space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl border border-gray-200 bg-white shadow-lg text-sm text-gray-900">
          {toast}
        </div>
      )}

      {editing && (
        <PlanFormModal
          plan={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={handleSavePlan}
        />
      )}

      <PageHeader
        title="Settings"
        subtitle="Manage your profile, plans and get help."
        backHref={`/${workspaceSlug}/workspace`}
      />

      {/* 1. Profile */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
            <User className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Profile</h2>
            <p className="text-xs text-gray-400">Your name and business name</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              placeholder="e.g. Flow Fitness Studio"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="px-5 py-2 rounded-full text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </section>

      {/* 2. Plan Details */}
      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Plan Details</h2>
              <p className="text-xs text-gray-400">Plans members can be subscribed to</p>
            </div>
          </div>
          <button
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Plan
          </button>
        </div>

        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border-t border-gray-100">
            <CreditCard className="h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No plans yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Add a plan so you can assign it to members.
            </p>
          </div>
        ) : (
          <div className="border-t border-gray-100">
            <div className="flex items-center gap-4 px-6 py-3 bg-gray-50/60 border-b border-gray-100">
              <p className="flex-1 text-xs font-bold text-gray-500 uppercase tracking-wide">
                Plan
              </p>
              <p className="w-24 text-xs font-bold text-gray-500 uppercase tracking-wide">
                Duration
              </p>
              <p className="w-24 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">
                Price
              </p>
              <div className="w-16 shrink-0" />
            </div>
            <div className="divide-y divide-gray-100">
              {plans.map((plan) => (
                <div key={plan.id} className="flex items-center gap-4 px-6 py-3.5">
                  <p className="flex-1 text-sm font-semibold text-gray-900 truncate">
                    {plan.name}
                  </p>
                  <p className="w-24 text-xs text-gray-500">
                    {durationLabel(plan.duration)}
                  </p>
                  <p className="w-24 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(plan.price)}
                  </p>
                  <div className="w-16 shrink-0 flex items-center justify-end gap-1">
                    <button
                      onClick={() => setEditing(plan)}
                      className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      aria-label={`Edit ${plan.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan)}
                      className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      aria-label={`Remove ${plan.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 3. Customer Support */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Phone className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Customer Support</h2>
              <p className="text-xs text-gray-400">Talk to us on {SUPPORT_PHONE}</p>
            </div>
          </div>
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            <Phone className="h-4 w-4" />
            Call Support
          </a>
        </div>
      </section>

      {/* 4. Feedback */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Feedback</h2>
              <p className="text-xs text-gray-400">
                Tell us what to build next — opens WhatsApp
              </p>
            </div>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Send Feedback
          </a>
        </div>
      </section>

      {/* 5. Sign Out */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? 'Signing out...' : 'Sign out'}
        </button>
      </section>
    </div>
  );
}

interface PlanFormModalProps {
  plan: Plan | null;
  onClose: () => void;
  onSave: (
    planId: string | null,
    name: string,
    duration: PlanDuration,
    price: number
  ) => Promise<void>;
}

function PlanFormModal({ plan, onClose, onSave }: PlanFormModalProps) {
  const [name, setName] = useState(plan?.name ?? "");
  const [duration, setDuration] = useState<PlanDuration>(plan?.duration ?? "1_month");
  const [price, setPrice] = useState(plan ? String(plan.price) : "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    await onSave(plan?.id ?? null, name, duration, Number(price));
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {plan ? "Edit Plan" : "Add Plan"}
          </h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="e.g. Monthly Basic"
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
                  placeholder="1500"
                />
              </div>
            </div>

            <p className="text-xs text-gray-400">
              Price is snapshotted when a member subscribes, so editing a plan never changes
              existing subscriptions.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-full text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Saving..." : plan ? "Save Changes" : "Add Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
