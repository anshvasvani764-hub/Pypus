"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Clock,
  RotateCcw,
  MessageCircle,
  Receipt,
  Search,
  ChevronDown,
  MoreHorizontal,
  X as XIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { sendAgentReceipt } from "@/app/actions/agent";
import { AUTO_WHATSAPP_ENABLED } from "@/lib/config/messaging";
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

const PAGE_SIZE = 10;

const MIN_DELAY_S = 1;
const MAX_DELAY_S = 30;
const randomDelaySeconds = () =>
  Math.floor(Math.random() * (MAX_DELAY_S - MIN_DELAY_S + 1)) + MIN_DELAY_S;

const STATUS_STYLES: Record<RowStatus, { badge: string; dot: string; label: string }> = {
  queued: {
    badge: "bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
    label: "Queued",
  },
  sending: { badge: "bg-sky-50 text-sky-700", dot: "bg-sky-500", label: "Sending" },
  sent: { badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", label: "Sent" },
  failed: { badge: "bg-red-50 text-red-600", dot: "bg-red-500", label: "Failed" },
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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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
      // Auto-send is off — leave the row as "Pending" for the owner to send
      // manually instead of scheduling an automatic (and doomed) retry.
      if (AUTO_WHATSAPP_ENABLED) {
        const timer = setTimeout(() => void fireSend(key, item), delay * 1000);
        timersRef.current.set(key, timer);
      }
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

  // Reset pagination whenever the filtered set changes shape (new search/filter).
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, statusFilter]);

  const visibleLive = filteredLive.slice(0, visibleCount);
  const visibleHistory = filteredHistory.slice(0, Math.max(0, visibleCount - filteredLive.length));
  const totalFiltered = filteredLive.length + filteredHistory.length;
  const hasMore = visibleCount < totalFiltered;

  const sentCount = rows.filter((r) => r.status === "sent").length + historyRows.length;
  const totalCount = rows.length + historyRows.length;

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader
        title="Receipt Agent"
        subtitle="Payment receipts send themselves on WhatsApp — this is the live log."
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by member"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {statusFilter === "all" ? "All statuses" : STATUS_STYLES[statusFilter].label}
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>
          {filterOpen && (
            <div className="absolute left-0 z-10 mt-1 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
              {(["all", "sent", "sending", "queued", "failed"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatusFilter(s);
                    setFilterOpen(false);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {s === "all" ? "All statuses" : STATUS_STYLES[s].label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Sent {sentCount}/{totalCount || 0}
        </div>
      </div>

      {/* Row list */}
      {filteredLive.length === 0 && filteredHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <Check className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">No receipts yet</p>
          <p className="max-w-xs text-xs text-gray-500">
            As soon as a payment is marked paid, its receipt goes out on WhatsApp and shows up here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {visibleLive.map((row) => {
            const s = STATUS_STYLES[row.status];
            return (
              <div
                key={row.key}
                role="button"
                tabIndex={0}
                onClick={() => openMemberFees(row.item.memberId)}
                onKeyDown={(e) => e.key === "Enter" && openMemberFees(row.item.memberId)}
                className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 hover:bg-gray-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50">
                  <Receipt className="h-4 w-4 text-violet-600" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {row.item.memberName}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    Receipt #{row.item.receiptNumber} — ₹{row.item.amount.toLocaleString("en-IN")}
                  </p>
                </div>

                <span
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.badge}`}
                >
                  {row.status === "sending" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : row.status === "queued" ? (
                    <Clock className="h-3 w-3" />
                  ) : row.status === "sent" ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <XIcon className="h-3 w-3" />
                  )}
                  {row.status === "queued" && AUTO_WHATSAPP_ENABLED
                    ? `Retrying in ${row.secondsLeft}s`
                    : s.label}
                </span>

                <div className="flex shrink-0 items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  <span className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuKey((k) => (k === row.key ? null : row.key));
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {menuKey === row.key && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setMenuKey(null);
                            openMemberFees(row.item.memberId);
                          }}
                          className="block w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
                        >
                          Open member fee page
                        </button>
                        {row.status === "failed" && (
                          <button
                            type="button"
                            onClick={() => retryNow(row.key, row.item)}
                            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Retry now
                          </button>
                        )}
                      </div>
                    )}
                  </span>
                </div>
              </div>
            );
          })}

          {visibleHistory.map((row) => (
            <div key={row.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 border border-gray-100">
                <Receipt className="h-4 w-4 text-gray-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{row.memberName}</p>
                <p className="truncate text-xs text-gray-500">{row.detail}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <Check className="h-3 w-3" />
                Sent
              </span>
              <span className="shrink-0 text-xs text-gray-400">{row.at}</span>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
