"use client";

import { useState, useEffect } from "react";
import { Wallet, AlertCircle, CheckCircle2, Clock, MessageCircle, CreditCard, Pencil, Receipt as ReceiptIcon, Check, Loader2 } from "lucide-react";
import MemberAvatar from "@/components/shared/MemberAvatar";
import { createClient } from "@/lib/supabase/client";
import type { FeeRecord, Member } from "@/lib/members/types";
import { deriveFeeSummary } from "@/lib/members/fee-status";
import { PlanSelectorModal } from "@/components/members/PlanSelectorModal";
import { MarkPaidModal, type PaymentMethod } from "@/components/fees/MarkPaidModal";
import { assignPlanToMember, markFeeAsPaid } from "@/app/actions/member-plan";
import { sendReminder } from "@/app/actions/member-reminders";
import { EditFeeModal } from "@/components/records/EditFeeModal";
import { generateReceiptImage } from "@/lib/utils/receipt-generator";

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

// The Clipboard API's ClipboardItem only reliably accepts "image/png" across
// browsers — generateReceiptImage() produces a JPEG blob, so re-draw it onto
// a canvas and re-export as PNG before copying.
async function jpegBlobToPng(jpegBlob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(jpegBlob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");
  ctx.drawImage(bitmap, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to convert receipt to PNG"));
    }, "image/png");
  });
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
  const [editingFee, setEditingFee] = useState<FeeRecord | null>(null);
  const [copyingFeeId, setCopyingFeeId] = useState<string | null>(null);
  const [copiedFeeId, setCopiedFeeId] = useState<string | null>(null);

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
      flashToast(
        !result.recorded
          ? "Already paid up"
          : result.fee.status === "paid"
            ? "Payment recorded — fully paid"
            : "Partial payment recorded"
      );
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

  // Renders this fee record as a receipt image and copies it to the
  // clipboard so it can be pasted straight into WhatsApp/Telegram/etc.
  // Works for any fee record — paid, due, or overdue.
  async function handleCopyReceipt(record: FeeRecord) {
    if (copyingFeeId) return;
    setCopyingFeeId(record.id);
    try {
      const { blob } = await generateReceiptImage({
        receiptNumber: `#${record.id.slice(-6).toUpperCase()}`,
        workspaceName: workspaceName || "Pypus",
        memberName: member.name,
        memberPhone: member.phone ?? "—",
        planName: record.plan_name_snapshot,
        amount: record.paid_amount || record.amount_snapshot,
        planAmount: record.amount_snapshot,
        remainingAmount:
          record.status === "paid"
            ? 0
            : Math.max(record.amount_snapshot - (record.paid_amount ?? 0), 0),
        paymentMethod: (record.payment_method as "Cash" | "UPI") ?? "Cash",
        paidDate: record.paid_date ?? record.due_date,
        dueDate: record.due_date,
      });

      if (navigator.clipboard && "write" in navigator.clipboard && typeof ClipboardItem !== "undefined") {
        // Clipboard image support is PNG-only in most browsers — re-encode
        // the JPEG blob to PNG via canvas before writing it.
        const pngBlob = await jpegBlobToPng(blob);
        await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
        setCopiedFeeId(record.id);
        flashToast("Receipt copied — paste it anywhere");
        setTimeout(() => setCopiedFeeId(null), 2000);
      } else {
        // Clipboard image API not available (older browser / non-HTTPS) —
        // fall back to downloading the receipt instead.
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `receipt-${record.id.slice(-6)}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
        flashToast("Clipboard not available — receipt downloaded instead");
      }
    } catch (err) {
      console.error("Receipt copy failed:", err);
      flashToast("Couldn't generate the receipt");
    } finally {
      setCopyingFeeId(null);
    }
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
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        planName={summary.planName}
        amountSnapshot={summary.payableFee?.amount_snapshot ?? 0}
        alreadyPaid={summary.payableFee?.paid_amount ?? 0}
        dueDate={summary.dueDate}
      />

      <EditFeeModal
        isOpen={editingFee !== null}
        onClose={() => setEditingFee(null)}
        record={editingFee}
        workspaceId={workspaceId}
        memberId={memberId}
        onSaved={(updated) => {
          setFees((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
          flashToast("Fee record updated");
        }}
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
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900 block">
                      {formatCurrency(record.amount_snapshot)}
                    </span>
                    {record.status !== "paid" && (record.paid_amount ?? 0) > 0 && (
                      <span className="text-[11px] text-amber-600">
                        Paid {formatCurrency(record.paid_amount ?? 0)} · Pending{" "}
                        {formatCurrency((record.amount_snapshot ?? 0) - (record.paid_amount ?? 0))}
                      </span>
                    )}
                  </div>
                  <PaymentStatusBadge status={record.status} />
                  <button
                    onClick={() => handleCopyReceipt(record)}
                    disabled={copyingFeeId === record.id}
                    className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                    title="Copy receipt image to clipboard"
                  >
                    {copyingFeeId === record.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : copiedFeeId === record.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <ReceiptIcon className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => setEditingFee(record)}
                    className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    title="Edit record"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}