"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Check, Loader2, MessageCircle, Clock, RotateCcw, X as XIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { sendAgentReceipt } from "@/app/actions/agent";
import type { ReceiptWorklistItem, AgentActivityItem } from "@/lib/agent/queries";

interface AgentPendingViewProps {
  workspaceSlug: string;
  workspaceName: string;
  activity: AgentActivityItem[];
  receiptsPending: ReceiptWorklistItem[];
}

type LogStatus = "queued" | "sending" | "sent" | "failed";

interface ReceiptLog {
  key: string;
  item: ReceiptWorklistItem;
  status: LogStatus;
  secondsLeft: number;
  error?: string;
}

// Receipts that reach this page are ones the automatic send (fired the
// moment the receipt was created — see saveReceipt) didn't manage to
// deliver. Rather than dumping them in front of the owner as one more
// thing to click, the agent just quietly retries each one on its own,
// staggered over the next 1-30s, and this box is a live log of that.
const MIN_DELAY_S = 1;
const MAX_DELAY_S = 30;
const randomDelaySeconds = () => Math.floor(Math.random() * (MAX_DELAY_S - MIN_DELAY_S + 1)) + MIN_DELAY_S;

export function AgentPendingView({
  workspaceSlug,
  workspaceName,
  activity,
  receiptsPending,
}: AgentPendingViewProps) {
  const router = useRouter();
  const [logs, setLogs] = useState<ReceiptLog[]>([]);
  const queuedKeysRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Seed the log with whatever's pending and schedule each one's retry —
  // nothing here waits on a click.
  useEffect(() => {
    const fresh = receiptsPending.filter(
      (r) => !queuedKeysRef.current.has(`rcpt-${r.receiptId}`)
    );
    if (fresh.length === 0) return;

    const withDelays = fresh.map((item) => ({ item, delay: randomDelaySeconds() }));

    setLogs((prev) => [
      ...withDelays.map(
        ({ item, delay }): ReceiptLog => ({
          key: `rcpt-${item.receiptId}`,
          item,
          status: "queued",
          secondsLeft: delay,
        })
      ),
      ...prev,
    ]);

    withDelays.forEach(({ item, delay }) => {
      const key = `rcpt-${item.receiptId}`;
      queuedKeysRef.current.add(key);
      const timer = setTimeout(() => void fireSend(key, item), delay * 1000);
      timersRef.current.set(key, timer);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptsPending]);

  // Ticks the "sending in Xs" countdown once a second.
  useEffect(() => {
    const tick = setInterval(() => {
      setLogs((prev) =>
        prev.map((l) =>
          l.status === "queued" && l.secondsLeft > 0 ? { ...l, secondsLeft: l.secondsLeft - 1 } : l
        )
      );
    }, 1000);
    return () => {
      clearInterval(tick);
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  async function fireSend(key: string, item: ReceiptWorklistItem) {
    setLogs((prev) => prev.map((l) => (l.key === key ? { ...l, status: "sending" } : l)));

    const result = await sendAgentReceipt({
      receiptId: item.receiptId,
      memberPhone: item.memberPhone,
      memberName: item.memberName,
      amount: item.amount,
      workspaceName,
      paymentMethod: item.paymentMethod,
      validTillDate: item.validTillDate,
      receiptImageUrl: item.receiptImageUrl,
    });

    setLogs((prev) =>
      prev.map((l) =>
        l.key === key
          ? result.success
            ? { ...l, status: "sent" }
            : { ...l, status: "failed", error: result.error }
          : l
      )
    );
  }

  function retryNow(key: string, item: ReceiptWorklistItem) {
    const existing = timersRef.current.get(key);
    if (existing) clearTimeout(existing);
    void fireSend(key, item);
  }

  function openMemberFees(memberId: string) {
    router.push(`/${workspaceSlug}/members/${memberId}/fees`);
  }

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader
        title="Agent"
        subtitle="Payment receipts send themselves on WhatsApp the moment they're created."
      />

      {/* WhatsApp banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]">
          <MessageCircle className="h-5 w-5 text-white" fill="white" strokeWidth={0} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">WhatsApp</p>
          <p className="text-xs text-gray-500">
            No button to press — receipts go out automatically. This log only shows the rare one that needs a retry.
          </p>
        </div>
      </div>

      {/* Receipt log */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Receipt log {logs.length > 0 && `(${logs.length})`}
        </h2>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">Nothing waiting on the agent</p>
            <p className="max-w-xs text-xs text-gray-500">
              Every receipt has gone out on WhatsApp already. This only fills up if a send fails and needs a retry.
            </p>
          </div>
        ) : (
          <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-2">
            {logs.map((log) => (
              <div
                key={log.key}
                role="button"
                tabIndex={0}
                onClick={() => openMemberFees(log.item.memberId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") openMemberFees(log.item.memberId);
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-gray-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50">
                  <Receipt className="h-4 w-4 text-violet-600" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{log.item.memberName}</p>
                  <p className="truncate text-xs text-gray-500">
                    Receipt #{log.item.receiptNumber} — ₹{log.item.amount.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {log.status === "queued" && (
                    <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                      <Clock className="h-3 w-3" />
                      Retrying in {log.secondsLeft}s
                    </span>
                  )}
                  {log.status === "sending" && (
                    <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Sending
                    </span>
                  )}
                  {log.status === "sent" && (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      <Check className="h-3 w-3" />
                      Sent
                    </span>
                  )}
                  {log.status === "failed" && (
                    <>
                      <span
                        className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600"
                        title={log.error}
                      >
                        <XIcon className="h-3 w-3" />
                        Failed
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          retryNow(log.key, log.item);
                        }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100"
                        title="Retry now"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity feed — proof the agent is working */}
      {activity.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Recent activity</h2>
          <div className="space-y-2">
            {activity.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-gray-200">
                  {a.kind === "reminder" ? (
                    <Clock className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-900">
                    <span className="font-medium">{a.memberName}</span> — {a.detail}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">{a.at}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
