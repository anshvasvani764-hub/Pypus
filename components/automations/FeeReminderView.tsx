"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  Loader2,
  Clock,
  AlertCircle,
  MessageCircle,
  Search,
  ChevronDown,
  Settings as SettingsIcon,
  X as XIcon,
  Send,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  saveFeeReminderSettings,
  sendFeeReminderNow,
  type FeeReminderSettings,
  type SendMode,
} from "@/app/actions/fee-reminders";
import { hoursWithDayHint } from "@/lib/agent/fee-reminder-eligibility";
import { AUTO_WHATSAPP_ENABLED } from "@/lib/config/messaging";
import type { FeeWorklistItem, AgentActivityItem } from "@/lib/agent/queries";

interface FeeReminderViewProps {
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  pending: FeeWorklistItem[];
  sentBeforeDue: AgentActivityItem[];
  sentOverdue: AgentActivityItem[];
  initialSettings: FeeReminderSettings;
}

type PageTab = "queue" | "before_due_log" | "overdue_log";
type RowFilter = "all" | "before_due" | "overdue";
type RowStatus = "before_due" | "overdue" | "sending" | "sent" | "failed";

interface PendingRow {
  key: string;
  item: FeeWorklistItem;
  status: RowStatus;
}

const PAGE_SIZE = 10;

export function FeeReminderView({
  workspaceId,
  workspaceSlug,
  workspaceName,
  pending,
  sentBeforeDue,
  sentOverdue,
  initialSettings,
}: FeeReminderViewProps) {
  const router = useRouter();

  const [tab, setTab] = useState<PageTab>("queue");

  const [rows, setRows] = useState<PendingRow[]>(() =>
    pending.map((item) => ({
      key: `fee-${item.feeId}`,
      item,
      status: item.reminderStage,
    }))
  );

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RowFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [bulkSending, setBulkSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRows(
      pending.map((item) => ({
        key: `fee-${item.feeId}`,
        item,
        status: item.reminderStage,
      }))
    );
  }, [pending]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function flashToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  async function sendOne(row: PendingRow): Promise<boolean> {
    const { item } = row;
    if (!item.memberPhone) return false;

    setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, status: "sending" } : r)));

    const result = await sendFeeReminderNow({
      workspaceId,
      workspaceName,
      memberId: item.memberId,
      memberPhone: item.memberPhone,
      memberName: item.memberName,
      feeId: item.feeId,
      stage: item.reminderStage,
      amount: item.amount,
      dueDate: item.dueDate,
      daysOverdue: item.daysOverdue,
    });

    if (result.success) {
      setRows((prev) => prev.filter((r) => r.key !== row.key));
      return true;
    }

    setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, status: "failed" } : r)));
    flashToast(result.error || "Failed to send reminder");
    return false;
  }

  async function handleSend(row: PendingRow) {
    await sendOne(row);
  }

  function openMemberFees(memberId: string) {
    router.push(`/${workspaceSlug}/members/${memberId}/fees`);
  }

  async function handleSendAll() {
    const sendable = filteredRows.filter((r) => r.item.memberPhone && r.status !== "sending");
    if (sendable.length === 0) return;

    setBulkSending(true);
    let ok = 0;
    let fail = 0;
    for (const row of sendable) {
      const success = await sendOne(row);
      if (success) ok++;
      else fail++;
    }
    setBulkSending(false);
    router.refresh();
    flashToast(
      fail === 0
        ? `${ok} reminder${ok === 1 ? "" : "s"} sent`
        : `${ok} sent, ${fail} failed — check popup blocker or phone numbers`
    );
  }

  const filteredRows = rows.filter((r) => {
    if (statusFilter !== "all" && statusFilter !== r.item.reminderStage) return false;
    if (query && !r.item.memberName.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, statusFilter, tab]);

  const visiblePending = filteredRows.slice(0, visibleCount);
  const hasMorePending = visibleCount < filteredRows.length;

  const activeLog = tab === "before_due_log" ? sentBeforeDue : sentOverdue;
  const filteredLog = activeLog.filter(
    (a) => !query || a.memberName.toLowerCase().includes(query.toLowerCase())
  );
  const visibleLog = filteredLog.slice(0, visibleCount);
  const hasMoreLog = visibleCount < filteredLog.length;

  const sendableCount = filteredRows.filter((r) => r.item.memberPhone).length;

  const TABS: { value: PageTab; label: string; count: number }[] = [
    { value: "queue", label: "Pending queue", count: rows.length },
    { value: "before_due_log", label: "Before-due log", count: sentBeforeDue.length },
    { value: "overdue_log", label: "Overdue log", count: sentOverdue.length },
  ];

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader
        title="Fee reminders"
        subtitle="Soft reminders before the due date, repeating nudges after — sent on WhatsApp."
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Fee reminder settings"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t.value ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

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

        {tab === "queue" && (
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {statusFilter === "all" ? "All" : statusFilter === "before_due" ? "Before due" : "Overdue"}
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            </button>
            {filterOpen && (
              <div className="absolute left-0 z-10 mt-1 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                {(["all", "before_due", "overdue"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setStatusFilter(s);
                      setFilterOpen(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {s === "all" ? "All" : s === "before_due" ? "Before due" : "Overdue"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "queue" && sendableCount > 0 && (
          <button
            type="button"
            onClick={handleSendAll}
            disabled={bulkSending}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {bulkSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send all pending ({sendableCount})
          </button>
        )}
      </div>

      {/* Queue tab */}
      {tab === "queue" &&
        (filteredRows.length === 0 ? (
          <EmptyState
            title="No reminders due right now"
            body="As soon as a soft reminder or overdue nudge becomes eligible, it'll show up here so you can send it on WhatsApp."
          />
        ) : (
          <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {visiblePending.map((row) => {
              const overdue = row.item.reminderStage === "overdue";
              return (
                <div
                  key={row.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => openMemberFees(row.item.memberId)}
                  onKeyDown={(e) => e.key === "Enter" && openMemberFees(row.item.memberId)}
                  className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 hover:bg-gray-50"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      overdue ? "bg-red-50" : "bg-amber-50"
                    }`}
                  >
                    <Bell className={`h-4 w-4 ${overdue ? "text-red-600" : "text-amber-600"}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{row.item.memberName}</p>
                    <p className="truncate text-xs text-gray-500">
                      ₹{row.item.amount.toLocaleString("en-IN")}
                      {row.item.planName ? ` · ${row.item.planName}` : ""}
                      {overdue ? ` · ${row.item.daysOverdue} days overdue` : ` · due ${row.item.dueDate}`}
                    </p>
                  </div>

                  <span
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      overdue ? "bg-red-100 text-red-600" : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {overdue ? <AlertCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {overdue ? "Overdue" : "Soft reminder"}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSend(row);
                    }}
                    disabled={!row.item.memberPhone || row.status === "sending"}
                    className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  >
                    {row.status === "sending" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {row.item.memberPhone ? "Send" : "No phone"}
                  </button>
                </div>
              );
            })}
          </div>
        ))}

      {/* Log tabs */}
      {tab !== "queue" &&
        (filteredLog.length === 0 ? (
          <EmptyState
            title={tab === "before_due_log" ? "No soft reminders sent yet" : "No overdue reminders sent yet"}
            body="Sends show up here the instant they go out on WhatsApp."
          />
        ) : (
          <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {visibleLog.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 border border-gray-100">
                  <Bell className="h-4 w-4 text-gray-400" />
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
        ))}

      {((tab === "queue" && hasMorePending) || (tab !== "queue" && hasMoreLog)) && (
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

      {settingsOpen && (
        <FeeReminderSettingsPanel
          workspaceId={workspaceId}
          initialSettings={initialSettings}
          onClose={() => setSettingsOpen(false)}
          onSaved={(message) => {
            setSettingsOpen(false);
            flashToast(message);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
        <Check className="h-6 w-6 text-emerald-600" />
      </div>
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="max-w-xs text-xs text-gray-500">{body}</p>
    </div>
  );
}

function FeeReminderSettingsPanel({
  workspaceId,
  initialSettings,
  onClose,
  onSaved,
}: {
  workspaceId: string;
  initialSettings: FeeReminderSettings;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [beforeDueDays, setBeforeDueDays] = useState(String(initialSettings.beforeDueDays));
  const [afterDueHours, setAfterDueHours] = useState(String(initialSettings.afterDueHours));
  const [repeatIntervalHours, setRepeatIntervalHours] = useState(String(initialSettings.repeatIntervalHours));
  const [sendMode, setSendMode] = useState<SendMode>(initialSettings.sendMode);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const result = await saveFeeReminderSettings(workspaceId, {
      // Send mode is the single source of truth now — "enabled" just
      // tracks whether auto-mode is switched on, so the cron job (which
      // filters on enabled + send_mode = "auto") keeps working unchanged.
      enabled: sendMode === "auto",
      beforeDueDays: Math.max(0, Number(beforeDueDays) || 0),
      afterDueHours: Math.max(0, Number(afterDueHours) || 0),
      repeatIntervalHours: Math.max(24, Number(repeatIntervalHours) || 24),
      sendMode,
    });

    setSaving(false);
    onSaved(result.success ? "Settings saved" : result.error || "Failed to save settings");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Fee reminder settings</h2>
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
            <p className="mb-2 text-sm font-medium text-gray-900">Send mode</p>
            <div
              role="group"
              aria-label="Fee reminder send mode"
              className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1"
            >
              <button
                type="button"
                onClick={() => setSendMode("manual")}
                aria-pressed={sendMode === "manual"}
                className={`flex min-h-[44px] items-center justify-center rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                  sendMode === "manual"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setSendMode("auto")}
                aria-pressed={sendMode === "auto"}
                className={`flex min-h-[44px] items-center justify-center rounded-lg text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                  sendMode === "auto"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Automatic
              </button>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              {sendMode === "manual"
                ? "Every eligible reminder waits in the Pending queue — you send each one yourself, whenever you want."
                : "Reminders go out on their own on the schedule below, no queue to check."}
            </p>
          </div>

          {sendMode === "auto" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Soft reminder — days before due date
                </label>
                <input
                  type="number"
                  min={0}
                  value={beforeDueDays}
                  onChange={(e) => setBeforeDueDays(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Sent once, never repeats. Skipped if the fee is paid before this date.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  First overdue reminder — hours after due date{" "}
                  <span className="font-normal text-gray-400">{hoursWithDayHint(Number(afterDueHours) || 0)}</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={afterDueHours}
                  onChange={(e) => setAfterDueHours(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Repeat every — hours{" "}
                  <span className="font-normal text-gray-400">
                    {hoursWithDayHint(Number(repeatIntervalHours) || 0)}
                  </span>
                </label>
                <input
                  type="number"
                  min={24}
                  value={repeatIntervalHours}
                  onChange={(e) => setRepeatIntervalHours(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Minimum 24 hours. Keeps repeating from the last send until the fee is marked paid.
                </p>
              </div>

              {!AUTO_WHATSAPP_ENABLED && (
                <p className="text-xs text-amber-600">
                  Saved, but automatic sending isn&apos;t live yet — WhatsApp auto-send is off workspace-wide until a
                  business number is reconnected. Reminders will still need manual send till then.
                </p>
              )}
              {AUTO_WHATSAPP_ENABLED && (
                <p className="text-xs text-gray-400">
                  Auto mode fires from an hourly server job, not from this page being open — both the before-due
                  and overdue WhatsApp templates are approved and live.
                </p>
              )}
            </>
          )}

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
