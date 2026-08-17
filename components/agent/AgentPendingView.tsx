"use client";

import { Clock, CreditCard, Receipt, Check, Hourglass, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import type {
  AbsenteeWorklistItem,
  FeeWorklistItem,
  ReceiptWorklistItem,
  AgentActivityItem,
} from "@/lib/agent/queries";

interface AgentPendingViewProps {
  workspaceId: string;
  workspaceName: string;
  absentees: AbsenteeWorklistItem[];
  feesDue: FeeWorklistItem[];
  activity: AgentActivityItem[];
  receiptsPending: ReceiptWorklistItem[];
}

type PendingTask =
  | { kind: "attendance"; key: string; item: AbsenteeWorklistItem }
  | { kind: "fees"; key: string; item: FeeWorklistItem }
  | { kind: "receipt"; key: string; item: ReceiptWorklistItem };

export function AgentPendingView({
  absentees,
  feesDue,
  activity,
  receiptsPending,
}: AgentPendingViewProps) {
  // TEMP: attendance nudges hidden from the pending list for now.
  // To bring them back, just remove this line and restore the spread below.
  const SHOW_ATTENDANCE = false;

  const tasks: PendingTask[] = [
    ...(SHOW_ATTENDANCE
      ? absentees
          .filter((a) => !a.alreadyMessagedToday)
          .map((item): PendingTask => ({ kind: "attendance", key: `att-${item.memberId}`, item }))
      : []),
    ...feesDue
      .filter((f) => !f.alreadyMessagedToday)
      .map((item): PendingTask => ({ kind: "fees", key: `fee-${item.feeId}`, item })),
    ...receiptsPending.map(
      (item): PendingTask => ({ kind: "receipt", key: `rcpt-${item.receiptId}`, item })
    ),
  ];

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader
        title="Agent"
        subtitle="Automated attendance nudges, fee reminders and receipts."
      />

      {/* WhatsApp banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]">
          <MessageCircle className="h-5 w-5 text-white" fill="white" strokeWidth={0} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">WhatsApp</p>
          <p className="text-xs text-gray-500">
            Agent prepares the message — our team sends it on your behalf.
          </p>
        </div>
      </div>

      {/* Pending tasks */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Pending tasks {tasks.length > 0 && `(${tasks.length})`}
        </h2>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-gray-900">No pending task for agent yet</p>
            <p className="max-w-xs text-xs text-gray-500">
              When a member misses 3+ days or a fee falls due, it'll show up here ready to send.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              return (
                <div
                  key={task.key}
                  className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      task.kind === "attendance"
                        ? "bg-orange-50"
                        : task.kind === "fees"
                          ? "bg-red-50"
                          : "bg-violet-50"
                    }`}
                  >
                    {task.kind === "attendance" ? (
                      <Clock className="h-4 w-4 text-orange-600" />
                    ) : task.kind === "fees" ? (
                      <CreditCard className="h-4 w-4 text-red-600" />
                    ) : (
                      <Receipt className="h-4 w-4 text-violet-600" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {task.item.memberName}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {task.kind === "attendance"
                        ? `Absent ${task.item.daysAbsent} days — last seen ${task.item.lastSeenDate}`
                        : task.kind === "fees"
                          ? task.item.status === "overdue"
                            ? `₹${task.item.amount.toLocaleString("en-IN")} overdue by ${task.item.daysOverdue} days`
                            : `₹${task.item.amount.toLocaleString("en-IN")} due ${task.item.dueDate}`
                          : `Receipt #${task.item.receiptNumber} — ₹${task.item.amount.toLocaleString("en-IN")} not sent yet`}
                    </p>
                  </div>

                  <span
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700"
                    title="Agent will send this — no action needed from you"
                  >
                    <Hourglass className="h-3.5 w-3.5" />
                    Pending
                  </span>
                </div>
              );
            })}
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
                    <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
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
