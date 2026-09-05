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
  Settings as SettingsIcon,
  Pencil,
  Send,
  X as XIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { sendAgentReceipt } from "@/app/actions/agent";
import {
  saveReceiptAgentSettings,
  updateReceiptTemplateVars,
  dismissReceiptFromQueue,
  type ReceiptAgentSettings,
  type ReceiptSendMode,
} from "@/app/actions/receipt-agent";
import { AUTO_WHATSAPP_ENABLED } from "@/lib/config/messaging";
import { buildReceiptPreviewText, type ReceiptTemplateVars } from "@/lib/receipts/template-vars";
import type { ReceiptWorklistItem, AgentActivityItem } from "@/lib/agent/queries";

interface AgentPendingViewProps {
  workspaceId?: string;
  workspaceSlug: string;
  workspaceName: string;
  activity: AgentActivityItem[];
  receiptsPending: ReceiptWorklistItem[];
  initialSettings?: ReceiptAgentSettings;
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
  workspaceId = "",
  workspaceSlug,
  workspaceName,
  activity,
  receiptsPending,
  initialSettings = { sendMode: "manual" },
}: AgentPendingViewProps) {
  const router = useRouter();
  const [rows, setRows] = useState<LiveRow[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RowStatus>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sendMode, setSendMode] = useState<ReceiptSendMode>(initialSettings.sendMode);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scriptKey, setScriptKey] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const queuedKeysRef = useRef<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Receipts that land here are ones the automatic send (fired the instant
  // the receipt was created) didn't manage to deliver. In "auto" mode the
  // agent quietly retries each on its own, staggered 1-30s. In "manual"
  // mode (Configuration) it just sits here until the owner sends it —
  // individually or with "Send all".
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
      // Auto-send only schedules a retry when both this workspace is set to
      // Automatic AND WhatsApp auto-send is live workspace-wide. Otherwise
      // leave the row as "Queued" for the owner to send manually.
      if (sendMode === "auto" && AUTO_WHATSAPP_ENABLED) {
        const timer = setTimeout(() => void fireSend(key, item), delay * 1000);
        timersRef.current.set(key, timer);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptsPending, sendMode]);

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

  function flashToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  async function fireSend(key: string, item: ReceiptWorklistItem): Promise<boolean> {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, status: "sending" } : r)));

    const result = await sendAgentReceipt({
      receiptId: item.receiptId,
      memberPhone: item.memberPhone,
      templateVars: item.templateVars,
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

    // A sent receipt no longer belongs in the live Queue — it's moved to
    // "Sent" server-side (getReceiptWorklist now excludes it). Leaving it
    // sitting here forever showed a timestamp-less "Sent" row that looked
    // like a second, duplicate entry next to the real one. Show the brief
    // "Sent" confirmation, then drop it from the live list and refresh so
    // it reappears once, correctly, in History with a real timestamp.
    if (result.success) {
      setTimeout(() => {
        setRows((prev) => prev.filter((r) => r.key !== key));
        router.refresh();
      }, 1200);
    }

    return result.success;
  }

  function retryNow(key: string, item: ReceiptWorklistItem) {
    const existing = timersRef.current.get(key);
    if (existing) clearTimeout(existing);
    setMenuKey(null);
    void fireSend(key, item);
  }

  async function handleSendAll() {
    const sendable = filteredLive.filter(
      (r) => r.item.memberPhone && (r.status === "queued" || r.status === "failed")
    );
    if (sendable.length === 0) return;

    setBulkSending(true);
    let ok = 0;
    let fail = 0;
    for (const row of sendable) {
      const success = await fireSend(row.key, row.item);
      if (success) ok++;
      else fail++;
    }
    setBulkSending(false);
    flashToast(
      fail === 0
        ? `${ok} receipt${ok === 1 ? "" : "s"} sent`
        : `${ok} sent, ${fail} failed — check the failed rows for the error`
    );
  }

  async function handleRemove(key: string, receiptId: string) {
    setMenuKey(null);
    setRows((prev) => prev.filter((r) => r.key !== key));
    const result = await dismissReceiptFromQueue(receiptId);
    if (!result.success) flashToast(result.error || "Couldn't remove — try again");
  }

  function handleVarsSaved(receiptId: string, vars: ReceiptTemplateVars) {
    setRows((prev) =>
      prev.map((r) =>
        r.item.receiptId === receiptId
          ? {
              ...r,
              item: {
                ...r.item,
                templateVars: vars,
                waMessage: buildReceiptPreviewText(vars),
                isMessageEdited: true,
              },
            }
          : r
      )
    );
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
  const sendableCount = filteredLive.filter(
    (r) => r.item.memberPhone && (r.status === "queued" || r.status === "failed")
  ).length;

  const scriptRow = rows.find((r) => r.key === scriptKey) ?? null;

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader
        title="Receipt Agent"
        subtitle={
          sendMode === "auto"
            ? "Payment receipts send themselves on WhatsApp — this is the live log."
            : "Receipts wait here in Queue until you send them on WhatsApp."
        }
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
          
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Receipt Agent configuration"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
          </div>
        }
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

        {/* Only manual mode needs a bulk-send action — automatic mode fires on its own. */}
        {sendMode === "manual" && sendableCount > 0 && (
          <button
            type="button"
            onClick={handleSendAll}
            disabled={bulkSending}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {bulkSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send all ({sendableCount})
          </button>
        )}

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
            As soon as a payment is marked paid, its receipt lands here for WhatsApp.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {visibleLive.map((row) => {
            const s = STATUS_STYLES[row.status];
            const editable = row.status === "queued" || row.status === "failed";
            return (
              <div
                key={row.key}
                role="button"
                tabIndex={0}
                onClick={() => setScriptKey(row.key)}
                onKeyDown={(e) => e.key === "Enter" && setScriptKey(row.key)}
                className="group flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 hover:bg-gray-50"
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
                    {row.item.isMessageEdited ? " · edited" : ""}
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
                  {row.status === "queued" && sendMode === "auto" && AUTO_WHATSAPP_ENABLED
                    ? `Retrying in ${row.secondsLeft}s`
                    : s.label}
                </span>

                {/* Hover controls: pencil opens the script popup in edit mode, the
                    paper-plane sends immediately — both only make sense while the
                    receipt hasn't gone out yet. */}
                {editable && (
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setScriptKey(row.key);
                      }}
                      aria-label="Edit receipt script"
                      title="Edit script"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void fireSend(row.key, row.item);
                      }}
                      aria-label="Send now"
                      title="Send now"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

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
                        {editable && (
                          <button
                            type="button"
                            onClick={() => handleRemove(row.key, row.item.receiptId)}
                            className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
                          >
                            Remove from queue
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

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl border border-gray-200 bg-white shadow-lg text-sm text-gray-900">
          {toast}
        </div>
      )}

      {scriptRow && (
        <ReceiptScriptModal
          row={scriptRow}
          onClose={() => setScriptKey(null)}
          onSaved={(vars) => {
            handleVarsSaved(scriptRow.item.receiptId, vars);
          }}
          onSend={async () => {
            await fireSend(scriptRow.key, scriptRow.item);
            setScriptKey(null);
          }}
          onRemove={async () => {
            await handleRemove(scriptRow.key, scriptRow.item.receiptId);
            setScriptKey(null);
          }}
          onOpenMemberFees={() => {
            openMemberFees(scriptRow.item.memberId);
            setScriptKey(null);
          }}
        />
      )}

      {settingsOpen && (
        <ReceiptAgentSettingsPanel
          workspaceId={workspaceId}
          sendMode={sendMode}
          onClose={() => setSettingsOpen(false)}
          onSaved={(mode, message) => {
            setSendMode(mode);
            setSettingsOpen(false);
            flashToast(message);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ReceiptScriptModal({
  row,
  onClose,
  onSaved,
  onSend,
  onRemove,
  onOpenMemberFees,
}: {
  row: LiveRow;
  onClose: () => void;
  onSaved: (vars: ReceiptTemplateVars) => void;
  onSend: () => void | Promise<void>;
  onRemove: () => void | Promise<void>;
  onOpenMemberFees: () => void;
}) {
  const [vars, setVars] = useState<ReceiptTemplateVars>(row.item.templateVars);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [removing, setRemoving] = useState(false);
  const editable = row.status === "queued" || row.status === "failed";
  const dirty = JSON.stringify(vars) !== JSON.stringify(row.item.templateVars);
  const preview = buildReceiptPreviewText(vars);

  function setVar<K extends keyof ReceiptTemplateVars>(key: K, value: ReceiptTemplateVars[K]) {
    setVars((v) => ({ ...v, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const result = await updateReceiptTemplateVars(row.item.receiptId, vars);
    setSaving(false);
    if (result.success) onSaved(vars);
  }

  async function handleSendClick() {
    setSending(true);
    if (dirty) {
      await updateReceiptTemplateVars(row.item.receiptId, vars);
      onSaved(vars);
    }
    await onSend();
    setSending(false);
  }

  async function handleRemoveClick() {
    setRemoving(true);
    await onRemove();
    setRemoving(false);
  }

  const fieldClass =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-gray-50 disabled:text-gray-500";
  const labelClass = "mb-1 block text-xs font-medium text-gray-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{row.item.memberName}</h2>
            <p className="text-xs text-gray-500">
              Receipt #{row.item.receiptNumber} — ₹{row.item.amount.toLocaleString("en-IN")} ·{" "}
              {row.item.paymentMethod}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <label className={labelClass}>Preview — exactly what goes out on WhatsApp</label>
            <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              {preview}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Member name ({"{{1}}"})</label>
              <input
                type="text"
                value={vars.name}
                disabled={!editable}
                onChange={(e) => setVar("name", e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Gym / workspace name ({"{{2}}"})</label>
              <input
                type="text"
                value={vars.workspaceName}
                disabled={!editable}
                onChange={(e) => setVar("workspaceName", e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Plan amount ({"{{3}}"})</label>
              <input
                type="number"
                value={vars.planAmount}
                disabled={!editable}
                onChange={(e) => setVar("planAmount", Number(e.target.value))}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Amount paid ({"{{4}}"})</label>
              <input
                type="number"
                value={vars.amountPaid}
                disabled={!editable}
                onChange={(e) => setVar("amountPaid", Number(e.target.value))}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Payment method ({"{{5}}"})</label>
              <input
                type="text"
                value={vars.paymentMethod}
                disabled={!editable}
                onChange={(e) => setVar("paymentMethod", e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Remaining amount ({"{{6}}"})</label>
              <input
                type="number"
                value={vars.remainingAmount}
                disabled={!editable}
                onChange={(e) => setVar("remainingAmount", Number(e.target.value))}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Payment date ({"{{7}}"})</label>
              <input
                type="date"
                value={vars.paymentDate ? vars.paymentDate.slice(0, 10) : ""}
                disabled={!editable}
                onChange={(e) => setVar("paymentDate", e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Valid till ({"{{8}}"})</label>
              <input
                type="date"
                value={vars.validTillDate ?? ""}
                disabled={!editable}
                onChange={(e) => setVar("validTillDate", e.target.value || null)}
                className={fieldClass}
              />
            </div>
          </div>

          {!editable && (
            <p className="text-xs text-gray-400">
              This receipt has already {row.status === "sent" ? "been sent" : "been queued to send"} — these fields can&apos;t be edited anymore.
            </p>
          )}
          {editable && !row.item.memberPhone && (
            <p className="text-xs text-amber-600">No phone number on file — add one before sending.</p>
          )}
          <button
            type="button"
            onClick={onOpenMemberFees}
            className="text-xs font-medium text-emerald-700 hover:underline"
          >
            View member&apos;s fee page →
          </button>
        </div>

        <div className="-mx-0 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/60 px-6 py-4">
          {editable ? (
            <button
              type="button"
              onClick={handleRemoveClick}
              disabled={removing}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 transition-colors"
            >
              {removing ? "Removing…" : "Remove from queue"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {editable && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !dirty}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            )}
            {editable && (
              <button
                type="button"
                onClick={handleSendClick}
                disabled={sending || !row.item.memberPhone}
                className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Send now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptAgentSettingsPanel({
  workspaceId,
  sendMode,
  onClose,
  onSaved,
}: {
  workspaceId: string;
  sendMode: ReceiptSendMode;
  onClose: () => void;
  onSaved: (mode: ReceiptSendMode, message: string) => void;
}) {
  const [mode, setMode] = useState<ReceiptSendMode>(sendMode);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await saveReceiptAgentSettings(workspaceId, { sendMode: mode });
    setSaving(false);
    onSaved(mode, result.success ? "Settings saved" : result.error || "Failed to save settings");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Receipt Agent configuration</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Send mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ReceiptSendMode)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="manual">Manual — receipts wait in Queue, send with one tap or Send all</option>
              <option value="auto">Automatic — receipts send themselves the moment they&apos;re generated</option>
            </select>
          </div>

          <div className="-mx-6 -mb-5 mt-5 flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/60 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
