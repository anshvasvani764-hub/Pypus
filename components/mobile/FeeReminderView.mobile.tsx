'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Check,
  Loader2,
  Clock,
  AlertCircle,
  Search,
  Send,
  Settings as SettingsIcon,
  X as XIcon,
} from 'lucide-react'
import { MobileTopBar } from '@/components/mobile/MobileTopBar'
import {
  saveFeeReminderSettings,
  sendFeeReminderNow,
  type FeeReminderSettings,
  type SendMode,
} from '@/app/actions/fee-reminders'
import { hoursWithDayHint } from '@/lib/agent/fee-reminder-eligibility'
import { AUTO_WHATSAPP_ENABLED } from '@/lib/config/messaging'
import type { FeeWorklistItem, AgentActivityItem } from '@/lib/agent/queries'

interface Props {
  workspaceId: string
  workspaceSlug: string
  workspaceName: string
  pending: FeeWorklistItem[]
  sentBeforeDue: AgentActivityItem[]
  sentOverdue: AgentActivityItem[]
  initialSettings: FeeReminderSettings
}

type PageTab = 'queue' | 'before_due_log' | 'overdue_log'
type RowFilter = 'all' | 'before_due' | 'overdue'
type RowStatus = 'before_due' | 'overdue' | 'sending' | 'sent' | 'failed'

interface PendingRow {
  key: string
  item: FeeWorklistItem
  status: RowStatus
}

const PAGE_SIZE = 10

const FILTERS: { value: RowFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'before_due', label: 'Before due' },
  { value: 'overdue', label: 'Overdue' },
]

export function FeeReminderView({
  workspaceId,
  workspaceSlug,
  workspaceName,
  pending,
  sentBeforeDue,
  sentOverdue,
  initialSettings,
}: Props) {
  const router = useRouter()

  const [sendMode, setSendMode] = useState<SendMode>(initialSettings.sendMode)
  const isAutoMode = sendMode === 'auto'

  const [tab, setTab] = useState<PageTab>(isAutoMode ? 'before_due_log' : 'queue')
  const [rows, setRows] = useState<PendingRow[]>(() =>
    pending.map((item) => ({ key: `fee-${item.feeId}`, item, status: item.reminderStage }))
  )
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<RowFilter>('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [bulkSending, setBulkSending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showClearQueueModal, setShowClearQueueModal] = useState(false)

  useEffect(() => {
    setRows(pending.map((item) => ({ key: `fee-${item.feeId}`, item, status: item.reminderStage })))
  }, [pending])

  useEffect(() => {
    if (!showClearQueueModal || bulkSending) return
    const nothingLeftToSend = rows.filter((r) => r.item.memberPhone).length === 0
    if (nothingLeftToSend) setShowClearQueueModal(false)
  }, [rows, bulkSending, showClearQueueModal])

  function flashToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function sendOne(row: PendingRow): Promise<boolean> {
    const { item } = row
    if (!item.memberPhone) return false

    setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, status: 'sending' } : r)))

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
    })

    if (result.success) {
      setRows((prev) => prev.filter((r) => r.key !== row.key))
      return true
    }

    setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, status: 'failed' } : r)))
    flashToast(result.error || 'Failed to send reminder')
    return false
  }

  function openMemberFees(memberId: string) {
    router.push(`/${workspaceSlug}/members/${memberId}/fees`)
  }

  async function handleSendAll() {
    const sendable = filteredRows.filter((r) => r.item.memberPhone && r.status !== 'sending')
    if (sendable.length === 0) return

    setBulkSending(true)
    let ok = 0
    let fail = 0
    for (const row of sendable) {
      const success = await sendOne(row)
      if (success) ok++
      else fail++
    }
    setBulkSending(false)
    router.refresh()
    flashToast(fail === 0 ? `${ok} reminder${ok === 1 ? '' : 's'} sent` : `${ok} sent, ${fail} failed`)
  }

  const filteredRows = rows.filter((r) => {
    if (statusFilter !== 'all' && statusFilter !== r.item.reminderStage) return false
    if (query && !r.item.memberName.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [query, statusFilter, tab])

  const visiblePending = filteredRows.slice(0, visibleCount)
  const hasMorePending = visibleCount < filteredRows.length

  const activeLog = tab === 'before_due_log' ? sentBeforeDue : sentOverdue
  const filteredLog = activeLog.filter(
    (a) => !query || a.memberName.toLowerCase().includes(query.toLowerCase())
  )
  const visibleLog = filteredLog.slice(0, visibleCount)
  const hasMoreLog = visibleCount < filteredLog.length

  const sendableCount = filteredRows.filter((r) => r.item.memberPhone).length

  const logTabs: { value: PageTab; label: string; count: number }[] = [
    { value: 'before_due_log', label: 'Before due', count: sentBeforeDue.length },
    { value: 'overdue_log', label: 'Overdue', count: sentOverdue.length },
  ]
  const queueTab = { value: 'queue' as PageTab, label: 'Queue', count: rows.length }

  const TABS = useMemo(
    () => (isAutoMode ? [...logTabs, ...(rows.length > 0 ? [queueTab] : [])] : [queueTab, ...logTabs]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAutoMode, sentBeforeDue.length, sentOverdue.length, rows.length]
  )

  useEffect(() => {
    if (!TABS.some((t) => t.value === tab)) setTab('before_due_log')
  }, [TABS, tab])

  return (
    <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface pb-6">
      <MobileTopBar
        title="Fee reminders"
        label="Automations"
        workspaceSlug={workspaceSlug}
        backHref={`/${workspaceSlug}/workspace`}
        action={
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Fee reminder settings"
            className="flex size-8 shrink-0 -mr-1.5 items-center justify-center rounded-full text-ve-on-surface active:bg-ve-surface-container-high active:scale-95"
          >
            <SettingsIcon size={18} />
          </button>
        }
      />

      <main className="px-4 pt-3">
        {/* Status banner */}
        <div className="mb-3 flex items-center justify-between rounded-xl bg-ve-primary-container/25 px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-ve-primary" />
            <p className="truncate text-[12px] font-semibold text-ve-on-surface">
              {isAutoMode ? 'Automatic sending is on' : 'Manual — send from Queue'}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 mb-3">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`whitespace-nowrap shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all active:scale-95 ${
                tab === t.value
                  ? 'bg-ve-primary text-white shadow-sm'
                  : 'bg-ve-surface-container-high text-ve-on-surface-variant'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2.5 rounded-xl bg-ve-surface-container px-3.5 py-2.5 mb-3 border-2 border-transparent focus-within:border-ve-primary transition-all">
          <Search size={16} className="text-ve-outline shrink-0" />
          <input
            className="bg-transparent border-none focus:ring-0 w-full text-[13px] text-ve-on-surface placeholder:text-ve-outline outline-none"
            placeholder="Filter by member"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Queue-only status filter chips */}
        {tab === 'queue' && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 mb-3">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`whitespace-nowrap shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all active:scale-95 ${
                  statusFilter === f.value
                    ? 'bg-ve-secondary text-white shadow-sm'
                    : 'bg-ve-surface-container-high text-ve-on-surface-variant'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Send all */}
        {tab === 'queue' && sendableCount > 0 && (
          <button
            type="button"
            onClick={handleSendAll}
            disabled={bulkSending}
            className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-ve-primary px-3.5 py-2.5 text-[13px] font-bold text-white active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {bulkSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Send all pending ({sendableCount})
          </button>
        )}

        {/* Queue tab */}
        {tab === 'queue' &&
          (filteredRows.length === 0 ? (
            <EmptyState
              title="No reminders due right now"
              body="As soon as a soft reminder or overdue nudge becomes eligible, it'll show up here."
            />
          ) : (
            <div className="flex flex-col divide-y divide-ve-outline-variant/15 rounded-xl bg-white border border-ve-outline-variant/25 overflow-hidden">
              {visiblePending.map((row) => {
                const overdue = row.item.reminderStage === 'overdue'
                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() => openMemberFees(row.item.memberId)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 text-left active:bg-ve-surface-container transition-colors"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        overdue ? 'bg-ve-error-container' : 'bg-ve-secondary-container/25'
                      }`}
                    >
                      <Bell size={15} className={overdue ? 'text-ve-error' : 'text-ve-secondary'} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-ve-on-surface leading-tight">
                        {row.item.memberName}
                      </p>
                      <p className="truncate text-[11px] text-ve-outline leading-tight">
                        ₹{row.item.amount.toLocaleString('en-IN')}
                        {overdue ? ` · ${row.item.daysOverdue}d overdue` : ` · due ${row.item.dueDate}`}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold whitespace-nowrap ${
                          overdue ? 'bg-ve-error-container text-ve-error' : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        {overdue ? <AlertCircle size={10} /> : <Clock size={10} />}
                        {overdue ? 'Overdue' : 'Soft'}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          void sendOne(row)
                        }}
                        aria-label="Send now"
                        className="relative -m-1 flex h-9 w-9 items-center justify-center rounded-full bg-ve-primary text-white active:scale-90 transition-all disabled:opacity-50"
                      >
                        {row.status === 'sending' ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Send size={13} />
                        )}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          ))}

        {/* Log tabs */}
        {tab !== 'queue' &&
          (filteredLog.length === 0 ? (
            <EmptyState
              title={tab === 'before_due_log' ? 'No soft reminders sent yet' : 'No overdue reminders sent yet'}
              body="Sends show up here the instant they go out on WhatsApp."
            />
          ) : (
            <div className="flex flex-col divide-y divide-ve-outline-variant/15 rounded-xl bg-white border border-ve-outline-variant/25 overflow-hidden">
              {visibleLog.map((row) => (
                <div key={row.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ve-surface-container-high">
                    <Bell size={15} className="text-ve-outline" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-ve-on-surface leading-tight">{row.memberName}</p>
                    <p className="truncate text-[11px] text-ve-outline leading-tight">{row.detail}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-ve-primary/10 text-ve-primary px-2 py-1 text-[10px] font-bold">
                      <Check size={10} />
                      Sent
                    </span>
                    <span className="text-[10px] text-ve-outline">{row.at}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}

        {((tab === 'queue' && hasMorePending) || (tab !== 'queue' && hasMoreLog)) && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              className="rounded-full bg-ve-surface-container-high px-4 py-2 text-[12px] font-bold text-ve-on-surface-variant active:scale-95 transition-all"
            >
              Load more
            </button>
          </div>
        )}
      </main>

      {settingsOpen && (
        <FeeReminderSettingsSheet
          workspaceId={workspaceId}
          initialSettings={{ ...initialSettings, sendMode }}
          onClose={() => setSettingsOpen(false)}
          onSaved={(newSendMode, message) => {
            const switchedToAuto = sendMode !== 'auto' && newSendMode === 'auto'
            const hadPending = rows.filter((r) => r.item.memberPhone).length > 0
            setSendMode(newSendMode)
            setSettingsOpen(false)
            flashToast(message)
            router.refresh()
            if (switchedToAuto && hadPending) setShowClearQueueModal(true)
          }}
        />
      )}

      {showClearQueueModal && (
        <ClearQueueOnAutoModal
          rows={rows}
          bulkSending={bulkSending}
          onSendAll={handleSendAll}
          onClose={() => setShowClearQueueModal(false)}
        />
      )}

      {toast && (
        <div className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[80] rounded-xl border border-ve-outline-variant/20 bg-ve-on-surface px-4 py-2.5 text-center text-[12px] font-bold text-ve-surface shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-ve-outline-variant bg-ve-surface-container/60 px-6 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ve-primary/10">
        <Check size={18} className="text-ve-primary" />
      </div>
      <p className="text-[13px] font-bold text-ve-on-surface">{title}</p>
      <p className="max-w-xs text-[11px] text-ve-outline leading-snug">{body}</p>
    </div>
  )
}

function FeeReminderSettingsSheet({
  workspaceId,
  initialSettings,
  onClose,
  onSaved,
}: {
  workspaceId: string
  initialSettings: FeeReminderSettings
  onClose: () => void
  onSaved: (mode: SendMode, message: string) => void
}) {
  const [beforeDueDays, setBeforeDueDays] = useState(String(initialSettings.beforeDueDays))
  const [afterDueHours, setAfterDueHours] = useState(String(initialSettings.afterDueHours))
  const [repeatIntervalHours, setRepeatIntervalHours] = useState(String(initialSettings.repeatIntervalHours))
  const [sendMode, setSendMode] = useState<SendMode>(initialSettings.sendMode)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const result = await saveFeeReminderSettings(workspaceId, {
      enabled: sendMode === 'auto',
      beforeDueDays: Math.max(0, Number(beforeDueDays) || 0),
      afterDueHours: Math.max(0, Number(afterDueHours) || 0),
      repeatIntervalHours: Math.max(24, Number(repeatIntervalHours) || 24),
      sendMode,
    })

    setSaving(false)
    onSaved(sendMode, result.success ? 'Settings saved' : result.error || 'Failed to save settings')
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40">
      <div className="w-full sm:max-w-md max-h-[88vh] overflow-y-auto rounded-t-[1.5rem] sm:rounded-[1.5rem] bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-5 py-4 border-b border-ve-outline-variant/10">
          <h2 className="text-base font-bold text-ve-on-surface">Fee reminder settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ve-on-surface-variant hover:bg-ve-surface-container transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div>
            <p className="mb-2 text-sm font-bold text-ve-on-surface">Send mode</p>
            <div
              role="group"
              aria-label="Fee reminder send mode"
              className="grid grid-cols-2 gap-1 rounded-xl bg-ve-surface-container p-1"
            >
              <button
                type="button"
                onClick={() => setSendMode('manual')}
                aria-pressed={sendMode === 'manual'}
                className={`flex min-h-[44px] items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                  sendMode === 'manual' ? 'bg-white text-ve-on-surface shadow-sm' : 'text-ve-on-surface-variant'
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setSendMode('auto')}
                aria-pressed={sendMode === 'auto'}
                className={`flex min-h-[44px] items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                  sendMode === 'auto' ? 'bg-white text-ve-on-surface shadow-sm' : 'text-ve-on-surface-variant'
                }`}
              >
                Automatic
              </button>
            </div>
            <p className="mt-1.5 text-xs text-ve-outline leading-snug">
              {sendMode === 'manual'
                ? 'Every eligible reminder waits in the Queue — you send each one yourself, whenever you want.'
                : 'Reminders go out on their own on the schedule below, no queue to check.'}
            </p>
          </div>

          {sendMode === 'auto' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-ve-on-surface">
                  Soft reminder — days before due date
                </label>
                <input
                  type="number"
                  min={0}
                  value={beforeDueDays}
                  onChange={(e) => setBeforeDueDays(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-ve-outline-variant/40 bg-white px-4 py-2.5 text-sm text-ve-on-surface outline-none focus:border-ve-primary focus:ring-2 focus:ring-ve-primary/20"
                />
                <p className="mt-1 text-xs text-ve-outline">
                  Sent once, never repeats. Skipped if the fee is paid before this date.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ve-on-surface">
                  First overdue reminder — hours after due date{' '}
                  <span className="font-normal text-ve-outline">
                    {hoursWithDayHint(Number(afterDueHours) || 0)}
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={afterDueHours}
                  onChange={(e) => setAfterDueHours(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-ve-outline-variant/40 bg-white px-4 py-2.5 text-sm text-ve-on-surface outline-none focus:border-ve-primary focus:ring-2 focus:ring-ve-primary/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ve-on-surface">
                  Repeat every — hours{' '}
                  <span className="font-normal text-ve-outline">
                    {hoursWithDayHint(Number(repeatIntervalHours) || 0)}
                  </span>
                </label>
                <input
                  type="number"
                  min={24}
                  value={repeatIntervalHours}
                  onChange={(e) => setRepeatIntervalHours(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-ve-outline-variant/40 bg-white px-4 py-2.5 text-sm text-ve-on-surface outline-none focus:border-ve-primary focus:ring-2 focus:ring-ve-primary/20"
                />
                <p className="mt-1 text-xs text-ve-outline">
                  Minimum 24 hours. Keeps repeating from the last send until the fee is marked paid.
                </p>
              </div>

              {!AUTO_WHATSAPP_ENABLED && (
                <p className="text-xs text-amber-600">
                  Saved, but automatic sending isn&apos;t live yet — WhatsApp auto-send is off workspace-wide
                  until a business number is reconnected. Reminders will still need manual send till then.
                </p>
              )}
              {AUTO_WHATSAPP_ENABLED && (
                <p className="text-xs text-ve-outline">
                  Auto mode fires from an hourly server job, not from this page being open.
                </p>
              )}
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-ve-outline-variant/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] rounded-full border border-ve-outline-variant/40 text-sm font-bold text-ve-on-surface-variant active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-full bg-ve-primary text-white text-sm font-bold active:scale-95 transition-all disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ClearQueueOnAutoModal({
  rows,
  bulkSending,
  onSendAll,
  onClose,
}: {
  rows: PendingRow[]
  bulkSending: boolean
  onSendAll: () => void
  onClose: () => void
}) {
  const sendable = rows.filter((r) => r.item.memberPhone)

  return (
    <div className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center bg-black/40">
      <div className="w-full sm:max-w-md max-h-[80vh] overflow-y-auto rounded-t-[1.5rem] sm:rounded-[1.5rem] bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-5 py-4 border-b border-ve-outline-variant/10">
          <h2 className="text-base font-bold text-ve-on-surface">Auto mode is on</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ve-on-surface-variant hover:bg-ve-surface-container transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-3">
          <p className="text-sm text-ve-on-surface-variant">
            {sendable.length > 0
              ? `${sendable.length} reminder${sendable.length === 1 ? '' : 's'} ${
                  sendable.length === 1 ? 'is' : 'are'
                } already sitting in the queue from before. Send them now instead of waiting for the next hourly run?`
              : 'Queue is already clear — nothing waiting to send.'}
          </p>

          {sendable.length > 0 && (
            <div className="max-h-56 divide-y divide-ve-outline-variant/15 overflow-y-auto rounded-xl border border-ve-outline-variant/25">
              {sendable.map((row) => (
                <div key={row.key} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
                  <span className="text-ve-on-surface">{row.item.memberName}</span>
                  {row.status === 'sending' ? (
                    <Loader2 size={14} className="animate-spin text-ve-primary" />
                  ) : row.status === 'failed' ? (
                    <span className="text-xs font-bold text-ve-error">Failed</span>
                  ) : (
                    <span className="text-xs text-ve-outline">Waiting</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-ve-outline-variant/10 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-full border border-ve-outline-variant/40 text-sm font-bold text-ve-on-surface-variant active:scale-95 transition-all"
          >
            Skip for now
          </button>
          {sendable.length > 0 && (
            <button
              type="button"
              onClick={onSendAll}
              disabled={bulkSending}
              className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-full bg-ve-primary text-white text-sm font-bold active:scale-95 transition-all disabled:opacity-60"
            >
              {bulkSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send all ({sendable.length})
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
