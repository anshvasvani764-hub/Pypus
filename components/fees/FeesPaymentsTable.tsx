"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Plus,
  Check,
} from "lucide-react";
import type { Member, FeeRecord } from "@/lib/members/types";
import type { MemberFeeSummary, DerivedFeeStatus } from "@/lib/members/fee-status";
import { useSearch } from "@/context/SearchContext";
import { PlanSelectorModal } from "@/components/members/PlanSelectorModal";
import { MarkPaidModal, type PaymentMethod } from "@/components/fees/MarkPaidModal";
import { assignPlanToMember, markFeeAsPaid } from "@/app/actions/member-plan";
import MemberAvatar from "@/components/shared/MemberAvatar";

type PaymentFilter = "all" | "paid" | "due" | "overdue" | "no_plan";

const FILTER_OPTIONS: { label: string; value: PaymentFilter }[] = [
  { label: "All", value: "all" },
  { label: "Paid", value: "paid" },
  { label: "Due", value: "due" },
  { label: "Overdue", value: "overdue" },
  { label: "No Plan", value: "no_plan" },
];

interface FeesPaymentsTableProps {
  members: Member[];
  summaries: Map<string, MemberFeeSummary>;
  workspaceSlug: string;
  workspaceId: string;
  workspaceName: string;
  onPlanAssigned: (memberId: string, planId: string | null, fee: FeeRecord) => void;
  onPaid: (fee: FeeRecord, amount: number) => void;
}

function PaymentStatusBadge({ status }: { status: Exclude<DerivedFeeStatus, "no_plan"> }) {
  const configs = {
    paid: {
      label: "Paid",
      className:
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700",
      icon: CheckCircle2,
    },
    due: {
      label: "Due",
      className:
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600",
      icon: Clock,
    },
    overdue: {
      label: "Overdue",
      className:
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600",
      icon: AlertCircle,
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span className={config.className}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
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

export function FeesPaymentsTable({
  members,
  summaries,
  workspaceSlug,
  workspaceId,
  workspaceName,
  onPlanAssigned,
  onPaid,
}: FeesPaymentsTableProps) {
  const { searchQuery } = useSearch();
  const [activeFilter, setActiveFilter] = useState<PaymentFilter>("all");
  const [assignTarget, setAssignTarget] = useState<Member | null>(null);
  const [paidTarget, setPaidTarget] = useState<Member | null>(null);
  const [settling, setSettling] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = members;

    if (activeFilter !== "all") {
      result = result.filter((m) => summaries.get(m.id)?.status === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }

    return result;
  }, [members, summaries, activeFilter, searchQuery]);

  function flashToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAssignSubmit(
    planId: string | null,
    planName: string,
    amount: number,
    dueDate: string
  ) {
    const member = assignTarget;
    if (!member) return;

    const result = await assignPlanToMember({
      workspaceId,
      memberId: member.id,
      planId,
      planName,
      amount,
      dueDate,
    });

    if (result.success && result.fee) {
      onPlanAssigned(member.id, planId, result.fee);
      flashToast(`Plan assigned to ${member.name}`);
    } else {
      flashToast(result.error || "Failed to assign plan");
    }
    setAssignTarget(null);
  }

  async function handlePaidConfirm(amount: number, method: PaymentMethod) {
    const member = paidTarget;
    const target = member ? summaries.get(member.id)?.payableFee : null;
    if (!member || !target || settling) return { success: false, error: "Invalid state" };

    setSettling(true);
    const result = await markFeeAsPaid({
      workspaceId,
      memberId: member.id,
      feeId: target.id,
      amount,
      paymentMethod: method,
    });

    if (result.success && result.fee) {
      onPaid(result.fee, result.recorded ? amount : 0);
      flashToast(
        result.recorded
          ? `Payment recorded for ${member.name}`
          : `${member.name} is already paid up`
      );
    } else {
      flashToast(result.error || "Failed to record payment");
    }
    setSettling(false);

    return result;
  }

  const paidSummary = paidTarget ? summaries.get(paidTarget.id) : null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl border border-gray-200 bg-white shadow-lg text-sm text-gray-900">
          {toast}
        </div>
      )}

      <PlanSelectorModal
        isOpen={assignTarget != null}
        onClose={() => setAssignTarget(null)}
        onSubmit={handleAssignSubmit}
        workspaceId={workspaceId}
        memberName={assignTarget?.name}
      />

      <MarkPaidModal
        isOpen={paidTarget != null}
        onClose={() => setPaidTarget(null)}
        onConfirm={handlePaidConfirm}
        memberName={paidTarget?.name ?? ""}
        memberPhone={paidTarget?.phone ?? ""}
        workspaceName={workspaceName}
        planName={paidSummary?.planName ?? null}
        defaultAmount={paidSummary?.payableFee?.amount_snapshot ?? 0}
        dueDate={paidSummary?.dueDate ?? null}
      />

      <div className="px-5 pt-5 pb-3 space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveFilter(opt.value)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                activeFilter === opt.value
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
          <div className="w-9 shrink-0" />
          <p className="flex-1 text-xs font-bold text-gray-500 uppercase tracking-wide">Member</p>
          <p className="w-28 text-center text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:block">Plan</p>
          <p className="w-24 text-center text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:block">Amount</p>
          <p className="w-28 text-center text-xs font-bold text-gray-500 uppercase tracking-wide hidden lg:block">Due Date</p>
          <p className="w-24 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Status</p>
          <div className="w-28 shrink-0" />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-900">No members found</p>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery ? `No results for "${searchQuery}"` : "Try a different filter"}
            </p>
          </div>
        ) : (
          filtered.map((member) => {
            const summary = summaries.get(member.id);
            const href = `/${workspaceSlug}/members/${member.id}/fees`;
            const noPlan = !summary || summary.status === "no_plan";
            const owes = summary?.payableFee != null;

            return (
              <div
                key={member.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors group"
              >
                <Link href={href} className="flex items-center gap-4 flex-1 min-w-0">
                  <MemberAvatar name={member.name} avatarUrl={member.avatar_url} size={36} />
                  <p className="flex-1 text-sm font-semibold text-gray-900 truncate">
                    {member.name}
                  </p>
                </Link>

                {noPlan ? (
                  <div className="flex-1 flex items-center justify-end sm:justify-center">
                    <button
                      onClick={() => setAssignTarget(member)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Assign Plan
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="w-28 text-center text-xs text-gray-500 truncate hidden sm:block">
                      {summary.planName ?? "—"}
                    </p>

                    <p className="w-24 text-center text-sm font-medium text-gray-900 hidden md:block">
                      {summary.amount != null ? formatCurrency(summary.amount) : "—"}
                    </p>

                    <p className="w-28 text-center text-xs text-gray-500 hidden lg:block">
                      {summary.dueDate ? formatDate(summary.dueDate) : "—"}
                    </p>

                    <div className="w-24 shrink-0 flex justify-center">
                      <PaymentStatusBadge
                        status={summary.status as Exclude<DerivedFeeStatus, "no_plan">}
                      />
                    </div>
                  </>
                )}

                <div className="w-28 shrink-0 flex items-center justify-end gap-1">
                  {owes && (
                    <button
                      onClick={() => setPaidTarget(member)}
                      disabled={settling}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Mark payment received"
                    >
                      <Check className="h-3 w-3" />
                      Mark Paid
                    </button>
                  )}
                  <Link href={href}>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {filtered.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/40">
          <p className="text-xs text-gray-400">
            Showing {filtered.length} of {members.length} members
          </p>
        </div>
      )}
    </div>
  );
}
