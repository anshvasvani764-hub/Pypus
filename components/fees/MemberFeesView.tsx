"use client";

import { useState, useEffect } from "react";
import { Wallet, AlertCircle, CheckCircle2, Clock, MessageCircle, CreditCard, FileText, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { FeeRecord, Member, Plan } from "@/lib/members/types";

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
    paid: { label: "Paid", classes: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
    due: { label: "Due", classes: "bg-amber-50 text-amber-600", icon: Clock },
    overdue: { label: "Overdue", classes: "bg-red-100 text-red-600", icon: AlertCircle },
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
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        const { data: feeData, error: feeError } = await supabase
          .from("fees")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("member_id", memberId)
          .order("due_date", { ascending: false });
        if (feeError) throw feeError;
        setFees((feeData ?? []) as FeeRecord[]);

        const planIds = new Set(
          (feeData ?? []).map((f: any) => f.plan_id).filter(Boolean)
        );
        if (planIds.size > 0) {
          const { data: planData, error: planError } = await supabase
            .from("plans")
            .select("*")
            .in("id", [...planIds]);
          if (!planError && planData) {
            const plansMap: Record<string, Plan> = {};
            for (const p of planData as Plan[]) {
              plansMap[p.id] = p;
            }
            setPlans(plansMap);
          }
        }
      } catch (err) {
        console.error("Failed to fetch fees:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [workspaceId, memberId]);

  const latestFee = fees.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())[0];
  const plan = latestFee ? plans[latestFee.plan_id] ?? null : null;
  const totalPaid = fees.filter((f) => f.status === "paid").reduce((sum, f) => sum + f.paid_amount, 0);
  const totalPending = fees.filter((f) => f.status === "due" || f.status === "overdue").reduce((sum, f) => sum + f.amount_snapshot, 0);
  const sorted = [...fees].sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState<FeeRecord | null>(null);

  function handleMarkPaid(fee: FeeRecord) {
    setSelectedFee(fee);
    setShowPaymentModal(true);
  }

  function confirmPayment() {
    setShowPaymentModal(false);
    setSelectedFee(null);
  }

  function sendReminder() {
    setShowPaymentModal(false);
    setSelectedFee(null);
  }

  return (
    <div className="mt-5 space-y-5">
      {/* Current Subscription Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Current Subscription</h3>
        {latestFee ? (
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{latestFee.plan_name_snapshot}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(latestFee.amount_snapshot)} / {plan?.duration ?? "monthly"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PaymentStatusBadge status={latestFee.status} />
              <span className="text-xs text-gray-400">Due: {formatDate(latestFee.due_date)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No active subscription found</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={sendReminder}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <MessageCircle className="h-4 w-4 text-emerald-600" />
          Send Reminder
        </button>
        <button
          onClick={() => setShowPaymentModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
        >
          <CreditCard className="h-4 w-4" />
          Mark Payment Received
        </button>
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-400 cursor-not-allowed"
        >
          <FileText className="h-4 w-4" />
          Generate Receipt
        </button>
      </div>

      {/* Mark Payment Modal */}
      {showPaymentModal && selectedFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-sm font-semibold text-gray-900">Mark Payment Received</h3>
            <p className="mt-2 text-sm text-gray-500">
              Confirm payment of {formatCurrency(selectedFee.amount_snapshot)} for{" "}
              {selectedFee.plan_name_snapshot}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPayment}
                className="px-4 py-2 rounded-full text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Payment History</h2>
          <p className="text-xs text-gray-400 mt-0.5">Most recent first</p>
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
                  <p className="text-sm font-medium text-gray-900">{record.description ?? record.plan_name_snapshot}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Due: {formatDate(record.due_date)}
                    {record.paid_date && ` · Paid: ${formatDate(record.paid_date)}`}
                    {record.payment_method && ` · ${record.payment_method}`}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(record.paid_amount)}
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