"use client";

import { useState, useEffect } from "react";
import { Wallet, AlertCircle, CheckCircle2, Clock, MessageCircle, CreditCard } from "lucide-react";
import MemberAvatar from "@/components/shared/MemberAvatar";
import { createClient } from "@/lib/supabase/client";
import type { FeeRecord, Member } from "@/lib/members/types";
import { deriveFeeSummary } from "@/lib/members/fee-status";
import { PlanSelectorModal } from "@/components/members/PlanSelectorModal";
import { MarkPaidModal, type PaymentMethod } from "@/components/fees/MarkPaidModal";
import { assignPlanToMember, markFeeAsPaid } from "@/app/actions/member-plan";
import { sendReminder } from "@/app/actions/member-reminders";

interface MemberFeesViewProps {
  memberId: string;
  workspaceId: string;
  member: Member;
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

function PaymentStatusBadge({ status }: { status: FeeRecord["status"] }) {
  const map = {
    paid: {
      label: "Paid",
      classes: "bg-emerald-100 text-emerald-700",
      icon: CheckCircle2,
    },
    due: {
      label: "Due",
      classes: "bg-amber-50 text-amber-600",
      icon: Clock,
    },
    overdue: {
      label: "Overdue",
      classes: "bg-red-100 text-red-600",
      icon: AlertCircle,
    },
  };
  const { label, classes, icon: Icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${classes}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export function MemberFeesView({ memberId, workspaceId, member }: MemberFeesViewProps) {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [planId, setPlanId] = useState<string | null>(member.plan_id ?? null);
  const [loading, setLoading] = useState(true);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [settling, setSettling] = useState(false);
  const [showReminderMenu, setShowReminderMenu] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        const { data: feeData, error } = await supabase
          .from("fees")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("member_id", memberId)
          .order("due_date", { ascending: false });

        if (!error && feeData) {
          setFees(feeData as FeeRecord[]);
        }

        const { data: wsData } = await supabase
          .from("workspaces")
          .select("name")
          .eq("id", workspaceId)
          .single();

        if (wsData) {
          setWorkspaceName(wsData.name);
        }
      } catch (err) {
        console.error("MemberFeesView fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [workspaceId, memberId]);

  const summary = deriveFeeSummary({ plan_id: planId }, fees);
  const owes = summary.payableFee != null;

  function flashToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  async function handlePlanSubmit(
    newPlanId: string | null,
    planName: string,
    amount: number,
    dueDate: string
  ) {
    const result = await assignPlanToMember({
      workspaceId,
      memberId,
      planId: newPlanId,
      planName,
      amount,
      dueDate,
    });

    if (result.success && result.fee) {
      setPlanId(newPlanId);
      setFees((prev) => [...prev, result.fee!]);
      flashToast("Plan assigned successfully");
    } else {
      flashToast(result.error || "Failed to assign plan");
    }
  }

  function handleMarkPaidClick() {
    setMarkPaidOpen(true);
  }

  async function handleMarkPaidConfirm(amount: number, method: PaymentMethod) {
    const target = summary.payableFee;
    if (!target || settling) return { success: false, error: "Invalid state" };

    setSettling(true);
    const result = await markFeeAsPaid({
      workspaceId,
      memberId,
      feeId: target.id,
      amount,
      paymentMethod: method,
    });

    setSettling(false);

    if (result.success && result.fee) {
      setFees((prev) => {
        const exists = prev.some((f) => f.id === result.fee!.id);
        return exists
          ? prev.map((f) => (f.id === result.fee!.id ? result.fee! : f))
          : [...prev, result.fee!];
      });
      flashToast(result.recorded ? "Payment recorded" : "Already paid up");
    } else {
      flashToast(result.error || "Failed to mark as paid");
    }

    return result;
  }

  async function handleSendReminder(type: "fees" | "attendance") {
    const result = await sendReminder({
      workspaceId,
      memberId,
      memberPhone: member.phone,
      memberName: member.name,
      workspaceName,
      feeId: summary.payableFee?.id ?? null,
      type,
    });

    if (result.success && result.url) {
      window.open(result.url, "_blank", "noopener,noreferrer");
      flashToast("Reminder sent");
    } else {
      flashToast(result.error || "Failed to send reminder");
    }
    setShowReminderMenu(false);
  }

  if (loading) {
    return (
      <div className="mt-5">
        <p className="text-sm text-gray-500">Loading fees data...</p>
      </div>
    );
  }

  const sorted = [...fees].sort(
    (a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
  );

  return (
    <div className="mt-5 space-y-5">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl border border-gray-200 bg-white shadow-lg text-sm text-gray-900">
          {toast}
        </div>
      )}

      <PlanSelectorModal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        onSubmit={handlePlanSubmit}
        workspaceId={workspaceId}
        memberName={member.name}
      />

      <MarkPaidModal
        isOpen={markPaidOpen}
        onClose={() => setMarkPaidOpen(false)}
        onConfirm={handleMarkPaidConfirm}
        memberName={member.name}
        memberPhone={member.phone}
        workspaceName={workspaceName}
        planName={summary.planName}
        defaultAmount={summary.payableFee?.amount_snapshot ?? 0}
        dueDate={summary.dueDate}
      />

      {/* Member header */}
      <div className="flex items-center gap-4">
        <MemberAvatar name={member.name} avatarUrl={member.avatar_url} size={48} />
        <div>
          <h2 className="text-lg font-bold text-gray-900">{member.name}</h2>
          <p className="text-xs text-gray-500">Member ID: #{member.id.slice(-6).toUpperCase()}</p>
        </div>
      </div>

      {/* Header actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          {owes && summary.dueDate && (
            <div
              className={`flex items-start gap-3 rounded-2xl border px-5 py-4 ${
                summary.status === "overdue"
                  ? "border-red-200 bg-red-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <AlertCircle
                className={`h-5 w-5 shrink-0 mt-0.5 ${
                  summary.status === "overdue" ? "text-red-500" : "text-amber-500"
                }`}
              />
              <div>
                <p
                  className={`text-sm font-semibold ${
                    summary.status === "overdue" ? "text-red-700" : "text-amber-700"
                  }`}
                >
                  {summary.status === "overdue" ? "Payment Overdue" : "Payment Due Soon"}
                </p>
                <p
                  className={`text-sm mt-0.5 ${
                    summary.status === "overdue" ? "text-red-600" : "text-amber-600"
                  }`}
                >
                  {formatCurrency(summary.amount ?? 0)} due on {formatDate(summary.dueDate)} ·{" "}
                  {summary.planName}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <button
              onClick={() => setShowReminderMenu(!showReminderMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              Send Reminder
            </button>
            {showReminderMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowReminderMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-gray-200 bg-white shadow-lg py-1">
                  <button
                    onClick={() => handleSendReminder("fees")}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Send fees reminder
                  </button>
                  <button
                    onClick={() => handleSendReminder("attendance")}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Send attendance reminder
                  </button>
                </div>
              </>
            )}
          </div>
          {owes && (
            <button
              onClick={handleMarkPaidClick}
              disabled={settling}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Mark Paid
            </button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Current Plan</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {summary.planName ?? (
                  <button
                    onClick={() => setPlanModalOpen(true)}
                    className="text-emerald-600 underline underline-offset-2"
                  >
                    Assign plan
                  </button>
                )}
              </p>
              {summary.planName && summary.amount != null && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatCurrency(summary.amount)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Total Paid</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">
                {formatCurrency(summary.totalPaid)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center ${
                summary.totalPending > 0 ? "bg-red-50" : "bg-gray-50"
              }`}
            >
              <AlertCircle
                className={`h-5 w-5 ${summary.totalPending > 0 ? "text-red-500" : "text-gray-300"}`}
              />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Pending Amount</p>
              <p
                className={`text-xl font-bold mt-0.5 ${
                  summary.totalPending > 0 ? "text-red-600" : "text-gray-900"
                }`}
              >
                {formatCurrency(summary.totalPending)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment history table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Payment History</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Data sourced from the Fees module
          </p>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Wallet className="h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No payment records yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sorted.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition-colors gap-4 flex-wrap"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{record.plan_name_snapshot}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Due: {formatDate(record.due_date)}
                    {record.paid_date && ` · Paid: ${formatDate(record.paid_date)}`}
                    {record.payment_method && ` · ${record.payment_method}`}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(record.amount_snapshot)}
                  </span>
                  <PaymentStatusBadge status={record.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
