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
import { sendReminder } from "@/app/actions/member-reminders";
import {
  saveFeeReminderSettings,
  type FeeReminderSettings,
  type RepeatInterval,
  type SendMode,
} from "@/app/actions/fee-reminders";
import { AUTO_WHATSAPP_ENABLED } from "@/lib/config/messaging";
import type { FeeWorklistItem, AgentActivityItem } from "@/lib/agent/queries";

interface FeeReminderViewProps {
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  pending: FeeWorklistItem[];
  sent: AgentActivityItem[];
  initialSettings: FeeReminderSettings;
}

type RowFilter = "all" | "due" | "overdue" | "sent";
type RowStatus = "due" | "overdue" | "sending" | "sent" | "failed";

interface PendingRow {
  source: "pending";
  key: string;
  item: FeeWorklistItem;
  status: RowStatus;
}

interface SentRow {
  source: "sent";
  key: string;
  memberName: string;
  detail: string;
  at: string;
}

const PAGE_SIZE = 10;

const REPEAT_OPTIONS: { value: RepeatInterval; label: string }[] = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "every_2_days", label: "Every 2 days" },
];

export function FeeReminderView({
  workspaceId,
  workspaceSlug,
  workspaceName,
  pending,
  sent,
  initialSettings,
}: FeeReminderViewProps) {
  const router = useRouter();

  const [rows, setRows] = useState<PendingRow[]>(() =>
    pending.map((item) => ({
      source: "pending",
      key: `fee-${item.feeId}`,
      item,
      status: item.status,
    }))
  );
  const [sentRows, setSentRows] = useState<SentRow[]>(() =>
    sent.map((a) => ({ source: "sent", key: a.id, memberName: a.memberName, detail: a.detail, at: a.at }))
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
        source: "pending",
        key: `fee-${item.feeId}`,
        item,
        status: item.status,
      }))
    );
  }, [pending]);

  useEffect(() => {
    setSentRows(
      sent.map((a) => ({ source: "sent", key: a.id, memberName: a.memberName, detail: a.detail, at: a.at }))
    );
  }, [sent]);

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

    const result = await sendReminder({
      workspaceId,
      memberId: item.memberId,
      memberPhone: item.memberPhone,
      memberName: item.memberName,
      workspaceName,
      feeId: item.feeId,
      type: "fees",
    });

    if (result.success && result.url) {
      window.open(result.url, "_blank", "noopener,noreferrer");
      setRows((prev) => prev.filter((r) => r.key !== row.key));
      setSentRows((prev) => [
        {
          source: "sent",
          key: `just-sent-${item.feeId}-${Date.now()}`,
          memberName: item.memberName,
          detail: "Fee reminder sent on WhatsApp",
          at: "Just now",
        },
        ...prev,
      ]);
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
    if (statusFilter === "sent") return false;
    if (statusFilter !== "all" && statusFilter !== r.item.status) return false;
    if (query && !r.item.memberName.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });
  const filteredSent = sentRows.filter((s) => {
    if (statusFilter !== "all" && statusFilter !== "sent") return false;
    if (query && !s.memberName.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, statusFilter]);

  const visiblePending = filteredRows.slice(0, visibleCount);
  const visibleSent = filteredSent.slice(0, Math.max(0, visibleCount - filteredRows.length));
  const totalFiltered = filteredRows.length + filteredSent.length;
  const hasMore = visibleCount < totalFiltered;

  const sendableCount = filteredRows.filter((r) => r.item.memberPhone).length;

  return (
    <div className="space-y-6 px-6 py-6 md:px-8">
      <PageHeader
        title="Fee reminders"
        subtitle="Members with a due or overdue fee — send a WhatsApp nudge with one tap."
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <MessageCircle className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
              WhatsApp
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

        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {statusFilter === "all"
              ? "All statuses"
              : statusFilter === "due"
                ? "Due"
                : statusFilter === "overdue"
                  ? "Overdue"
                  : "Sent"}
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>
          {filterOpen && (
            <div className="absolute left-0 z-10 mt-1 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
              {(["all", "due", "overdue", "sent"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatusFilter(s);
                    setFilterOpen(false);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {s === "all" ? "All statuses" : s === "due" ? "Due" : s === "overdue" ? "Overdue" : "Sent"}
                </button>
              ))}
            </div>
          )}
        </div>

        {sendableCount > 0 && (
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

        <div className="ml-auto flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Sent {sentRows.length} · Pending {rows.length}
        </div>
      </div>

      {/* Row list */}
      {filteredRows.length === 0 && filteredSent.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <Check className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">No fee reminders yet</p>
          <p className="max-w-xs text-xs text-gray-500">
            As soon as a member&apos;s fee is due or overdue, they&apos;ll show up here so you can send a WhatsApp reminder.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {visiblePending.map((row) => {
            const overdue = row.item.status === "overdue";
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
                  {overdue ? "Overdue" : "Due"}
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

          {visibleSent.map((row) => (
            <div key={row.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
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
  const [enabled, setEnabled] = useState(initialSettings.enabled);
  const [daysAfterDue, setDaysAfterDue] = useState(String(initialSettings.daysAfterDue));
  const [repeatInterval, setRepeatInterval] = useState<RepeatInterval>(initialSettings.repeatInterval);
  const [sendMode, setSendMode] = useState<SendMode>(initialSettings.sendMode);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const result = await saveFeeReminderSettings(workspaceId, {
      enabled,
      daysAfterDue: Math.max(0, Number(daysAfterDue) || 0),
      repeatInterval,
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Enabled</p>
              <p className="text-xs text-gray-500">Turn fee reminders on for this workspace</p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled((v) => !v)}
              aria-pressed={enabled}
              aria-label="Toggle fee reminders enabled"
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                enabled ? "bg-emerald-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Start reminder (days after due date)
            </label>
            <input
              type="number"
              min={0}
              value={daysAfterDue}
              onChange={(e) => setDaysAfterDue(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Repeat</label>
            <select
              value={repeatInterval}
              onChange={(e) => setRepeatInterval(e.target.value as RepeatInterval)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              {REPEAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Send mode</label>
            <select
              value={sendMode}
              onChange={(e) => setSendMode(e.target.value as SendMode)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="manual">Manual approval</option>
              <option value="auto">Automatic</option>
            </select>
            {sendMode === "auto" && !AUTO_WHATSAPP_ENABLED && (
              <p className="mt-1.5 text-xs text-amber-600">
                Saved, but automatic sending isn&apos;t live yet — WhatsApp auto-send is off workspace-wide until a
                business number is reconnected. Reminders will still need manual send till then.
              </p>
            )}
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
