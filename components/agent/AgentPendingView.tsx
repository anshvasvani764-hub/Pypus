"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  X as XIcon,
  Loader2,
  Clock,
  RotateCcw,
  MessageCircle,
  Receipt,
  Search,
  ChevronDown,
  MoreHorizontal,
  GitBranch,
} from "lucide-react";
import { sendAgentReceipt } from "@/app/actions/agent";
import type { ReceiptWorklistItem, AgentActivityItem } from "@/lib/agent/queries";

interface AgentPendingViewProps {
  workspaceSlug: string;
  workspaceName: string;
  activity: AgentActivityItem[];
  receiptsPending: ReceiptWorklistItem[];
}

type RowStatus = "queued" | "sending" | "sent" | "failed";

interface LiveRow {
  source: "live";
  key: string;
  item: ReceiptWorklistItem;
  status: RowStatus;
  secondsLeft: number;
  error?: string;
}

interface HistoryRow {
  source: "history";
  key: string;
  memberName: string;
  detail: string;
  at: string;
}

const MIN_DELAY_S = 1;
const MAX_DELAY_S = 30;
const randomDelaySeconds = () =>
  Math.floor(Math.random() * (MAX_DELAY_S - MIN_DELAY_S + 1)) + MIN_DELAY_S;

const STATUS_STYLES: Record<RowStatus, { dot: string; text: string; label: string }> = {
  queued: { dot: "bg-gray-500", text: "text-gray-400", label: "Retrying" },
  sending: { dot: "bg-sky-400 animate-pulse", text: "text-sky-400", label: "Sending" },
  sent: { dot: "bg-emerald-400", text: "text-emerald-400", label: "Sent" },
  failed: { dot: "bg-red-400", text: "text-red-400", label: "Failed" },
};

export function AgentPendingView({
  workspaceSlug,
  workspaceName,
  activity,
  receiptsPending,
}: AgentPendingViewProps) {
  const router = useRouter();
  const [rows, setRows] = useState<LiveRow[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RowStatus>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuKey, setMenuKey] = useState<string | null>(null);

  const queuedKeysRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Receipts that land here are ones the automatic send (fired the instant
  // the receipt was created) didn't manage to deliver. The agent quietly
  // retries each on its own, staggered 1-30s — this list is a live log of
  // that, not a queue someone has to work through.
  useEffect(() => {
    const fresh = receiptsPending.filter(
      (r) => !queuedKeysRef.current.has(`rcpt-${r.receiptId}`)
    );
    if (fresh.length === 0) return;

    const withDelays = fresh.map((item) => ({ item, delay: randomDelaySeconds() }));

    setRows((prev) => [
      ...withDelays.map(
        ({ item, delay }): LiveRow => ({
          source: "live",
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

  useEffect(() => {
    const tick = setInterval(() => {
      setRows((prev) =>
        prev.map((r) =>
          r.status === "queued" && r.secondsLeft > 0 ? { ...r, secondsLeft: r.secondsLeft - 1 } : r
        )
      );
    }, 1000);
    return () => {
      clearInterval(tick);
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  async function fireSend(key: string, item: ReceiptWorklistItem) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, status: "sending" } : r)));

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

    setRows((prev) =>
      prev.map((r) =>
        r.key === key
          ? result.success
            ? { ...r, status: "sent" }
            : { ...r, status: "failed", error: result.error }
          : r
      )
    );
  }

  function retryNow(key: string, item: ReceiptWorklistItem) {
    const existing = timersRef.current.get(key);
    if (existing) clearTimeout(existing);
    setMenuKey(null);
    void fireSend(key, item);
  }

  function openMemberFees(memberId: string) {
    router.push(`/${workspaceSlug}/members/${memberId}/fees`);
  }

  const historyRows: HistoryRow[] = useMemo(
    () =>
      activity
        .filter((a) => a.kind === "receipt")
        .map((a) => ({ source: "history", key: a.id, memberName: a.memberName, detail: a.detail, at: a.at })),
    [activity]
  );

  const filteredLive = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (query && !r.item.memberName.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });
  const filteredHistory = historyRows.filter((h) => {
    if (statusFilter !== "all" && statusFilter !== "sent") return false;
    if (query && !h.memberName.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const sentCount = rows.filter((r) => r.status === "sent").length + historyRows.length;
  const totalCount = rows.length + historyRows.length;

  return (
    <div className="px-6 py-6 md:px-8">
    <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-5 md:p-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-100">Agent</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Payment receipts send themselves on WhatsApp — this is the live log.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#25D366]/10 px-3 py-1.5 text-xs font-medium text-[#25D366]">
          <MessageCircle className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
          WhatsApp connected
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by member"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-gray-200 placeholder:text-gray-500 outline-none focus:border-white/20"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.06]"
          >
            {statusFilter === "all" ? "All statuses" : STATUS_STYLES[statusFilter].label}
            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
          </button>
          {filterOpen && (
            <div className="absolute left-0 z-10 mt-1 w-40 overflow-hidden rounded-lg border border-white/10 bg-[#141414] py-1 shadow-xl">
              {(["all", "sent", "sending", "queued", "failed"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatusFilter(s);
                    setFilterOpen(false);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-white/[0.06]"
                >
                  {s === "all" ? "All statuses" : STATUS_STYLES[s].label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400">
          <span className="flex -space-x-0.5">
            {Array.from({ length: Math.min(totalCount, 5) }).map((_, i) => (
              <span key={i} className="h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#0a0a0a]" />
            ))}
          </span>
          Sent {sentCount}/{totalCount || 0}
        </div>
      </div>

      {/* Row list */}
      {filteredLive.length === 0 && filteredHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <Check className="h-6 w-6 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-gray-200">No receipts yet</p>
          <p className="max-w-xs text-xs text-gray-500">
            As soon as a payment is marked paid, its receipt goes out on WhatsApp and shows up here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10">
          {filteredLive.map((row) => {
            const s = STATUS_STYLES[row.status];
            return (
              <div
                key={row.key}
                role="button"
                tabIndex={0}
                onClick={() => openMemberFees(row.item.memberId)}
                onKeyDown={(e) => e.key === "Enter" && openMemberFees(row.item.memberId)}
                className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 hover:bg-white/[0.03]"
              >
                <p className="min-w-[160px] flex-1 truncate text-sm font-medium text-gray-100">
                  Fee receipt of {row.item.memberName}
                </p>

                <span className={`flex shrink-0 items-center gap-1.5 text-xs font-medium ${s.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {row.status === "queued" ? `Retrying in ${row.secondsLeft}s` : s.label}
                </span>

                <span className="shrink-0 text-xs text-gray-500">
                  ₹{row.item.amount.toLocaleString("en-IN")}
                </span>

                <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-[#25D366]/10 px-2.5 py-1 text-xs font-medium text-[#25D366] sm:flex">
                  <MessageCircle className="h-3 w-3" fill="currentColor" strokeWidth={0} />
                  WhatsApp
                </span>

                <span className="hidden shrink-0 items-center gap-1.5 font-mono text-xs text-gray-500 sm:flex">
                  <Receipt className="h-3 w-3" />
                  #{row.item.receiptNumber}
                </span>

                <span className="hidden shrink-0 items-center gap-1.5 text-xs text-gray-500 md:flex">
                  <GitBranch className="h-3 w-3" />
                  auto-send
                </span>

                <span className="ml-auto flex shrink-0 items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      row.status === "sent"
                        ? "bg-emerald-400"
                        : row.status === "failed"
                          ? "bg-red-400"
                          : "bg-gray-600"
                    }`}
                  />
                  <span className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuKey((k) => (k === row.key ? null : row.key));
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-white/[0.06] hover:text-gray-300"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuKey === row.key && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-white/10 bg-[#141414] py-1 shadow-xl"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setMenuKey(null);
                            openMemberFees(row.item.memberId);
                          }}
                          className="block w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-white/[0.06]"
                        >
                          Open member fee page
                        </button>
                        {row.status === "failed" && (
                          <button
                            type="button"
                            onClick={() => retryNow(row.key, row.item)}
                            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-white/[0.06]"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Retry now
                          </button>
                        )}
                      </div>
                    )}
                  </span>
                </span>
              </div>
            );
          })}

          {filteredHistory.map((row) => (
            <div
              key={row.key}
              role="button"
              tabIndex={0}
              className="flex cursor-default flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 opacity-80"
            >
              <p className="min-w-[160px] flex-1 truncate text-sm font-medium text-gray-300">
                Fee receipt of {row.memberName}
              </p>
              <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Sent
              </span>
              <span className="hidden shrink-0 truncate text-xs text-gray-500 sm:block">{row.detail}</span>
              <span className="ml-auto shrink-0 text-xs text-gray-500">{row.at}</span>
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}