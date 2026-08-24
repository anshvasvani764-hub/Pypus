'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  Loader2,
  Clock,
  RotateCcw,
  MessageCircle,
  Receipt,
  Search,
  X as XIcon,
} from 'lucide-react'
import { MobileTopBar } from '@/components/mobile/MobileTopBar'
import { sendAgentReceipt } from '@/app/actions/agent'
import { AUTO_WHATSAPP_ENABLED } from '@/lib/config/messaging'
import type { ReceiptWorklistItem, AgentActivityItem } from '@/lib/agent/queries'

interface Props {
  workspaceSlug: string
  workspaceName: string
  activity: AgentActivityItem[]
  receiptsPending: ReceiptWorklistItem[]
}

type RowStatus = 'queued' | 'sending' | 'sent' | 'failed'

interface LiveRow {
  source: 'live'
  key: string
  item: ReceiptWorklistItem
  status: RowStatus
  secondsLeft: number
  error?: string
}

interface HistoryRow {
  source: 'history'
  key: string
  memberName: string
  detail: string
  at: string
}

const PAGE_SIZE = 10
const MIN_DELAY_S = 1
const MAX_DELAY_S = 30
const randomDelaySeconds = () =>
  Math.floor(Math.random() * (MAX_DELAY_S - MIN_DELAY_S + 1)) + MIN_DELAY_S

type Filter = 'All' | 'Sent' | 'Sending' | 'Queued' | 'Failed'
const FILTERS: Filter[] = ['All', 'Sent', 'Sending', 'Queued', 'Failed']
const FILTER_TO_STATUS: Record<Filter, RowStatus | 'all'> = {
  All: 'all',
  Sent: 'sent',
  Sending: 'sending',
  Queued: 'queued',
  Failed: 'failed',
}

const STATUS_CHIP: Record<RowStatus, string> = {
  queued: 'bg-ve-secondary-container/40 text-ve-secondary',
  sending: 'bg-ve-secondary-container/40 text-ve-secondary',
  sent: 'bg-ve-primary/10 text-ve-primary',
  failed: 'bg-ve-error-container text-ve-error',
}

const STATUS_LABEL: Record<RowStatus, string> = {
  queued: 'Queued',
  sending: 'Sending',
  sent: 'Sent',
  failed: 'Failed',
}

function StatusIcon({ status }: { status: RowStatus }) {
  if (status === 'sending') return <Loader2 size={12} className="animate-spin" />
  if (status === 'queued') return <Clock size={12} />
  if (status === 'sent') return <Check size={12} />
  return <XIcon size={12} />
}

export function AgentPendingView({
  workspaceSlug,
  workspaceName,
  activity,
  receiptsPending,
}: Props) {
  const router = useRouter()
  const [rows, setRows] = useState<LiveRow[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const queuedKeysRef = useRef<Set<string>>(new Set())
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const fresh = receiptsPending.filter(
      (r) => !queuedKeysRef.current.has(`rcpt-${r.receiptId}`)
    )
    if (fresh.length === 0) return

    const withDelays = fresh.map((item) => ({ item, delay: randomDelaySeconds() }))

    setRows((prev) => [
      ...withDelays.map(
        ({ item, delay }): LiveRow => ({
          source: 'live',
          key: `rcpt-${item.receiptId}`,
          item,
          status: 'queued',
          secondsLeft: delay,
        })
      ),
      ...prev,
    ])

    withDelays.forEach(({ item, delay }) => {
      const key = `rcpt-${item.receiptId}`
      queuedKeysRef.current.add(key)
      if (AUTO_WHATSAPP_ENABLED) {
        const timer = setTimeout(() => void fireSend(key, item), delay * 1000)
        timersRef.current.set(key, timer)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptsPending])

  useEffect(() => {
    const tick = setInterval(() => {
      setRows((prev) =>
        prev.map((r) =>
          r.status === 'queued' && r.secondsLeft > 0 ? { ...r, secondsLeft: r.secondsLeft - 1 } : r
        )
      )
    }, 1000)
    return () => {
      clearInterval(tick)
      timersRef.current.forEach((t) => clearTimeout(t))
    }
  }, [])

  async function fireSend(key: string, item: ReceiptWorklistItem) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, status: 'sending' } : r)))

    const result = await sendAgentReceipt({
      receiptId: item.receiptId,
      memberPhone: item.memberPhone,
      memberName: item.memberName,
      amount: item.amount,
      workspaceName,
      paymentMethod: item.paymentMethod,
      validTillDate: item.validTillDate,
      receiptImageUrl: item.receiptImageUrl,
    })

    setRows((prev) =>
      prev.map((r) =>
        r.key === key
          ? result.success
            ? { ...r, status: 'sent' }
            : { ...r, status: 'failed', error: result.error }
          : r
      )
    )
  }

  function retryNow(e: React.MouseEvent, key: string, item: ReceiptWorklistItem) {
    e.stopPropagation()
    e.preventDefault()
    const existing = timersRef.current.get(key)
    if (existing) clearTimeout(existing)
    void fireSend(key, item)
  }

  function openMemberFees(memberId: string) {
    router.push(`/${workspaceSlug}/members/${memberId}/fees`)
  }

  const historyRows: HistoryRow[] = useMemo(
    () =>
      activity
        .filter((a) => a.kind === 'receipt')
        .map((a) => ({ source: 'history', key: a.id, memberName: a.memberName, detail: a.detail, at: a.at })),
    [activity]
  )

  const statusFilter = FILTER_TO_STATUS[filter]

  const filteredLive = rows.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (query && !r.item.memberName.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })
  const filteredHistory = historyRows.filter((h) => {
    if (statusFilter !== 'all' && statusFilter !== 'sent') return false
    if (query && !h.memberName.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [query, filter])

  const visibleLive = filteredLive.slice(0, visibleCount)
  const visibleHistory = filteredHistory.slice(0, Math.max(0, visibleCount - filteredLive.length))
  const totalFiltered = filteredLive.length + filteredHistory.length
  const hasMore = visibleCount < totalFiltered

  const sentCount = rows.filter((r) => r.status === 'sent').length + historyRows.length
  const totalCount = rows.length + historyRows.length

  return (
    <div className="font-ve min-h-screen bg-ve-surface text-ve-on-surface pb-6">
      <MobileTopBar
        title="Agent"
        label="Pypus"
        workspaceSlug={workspaceSlug}
        backHref={`/${workspaceSlug}/workspace`}
        action={
          <div className="flex items-center gap-1 rounded-full bg-ve-primary/10 px-2.5 py-1.5 text-ve-primary">
            <MessageCircle size={13} fill="currentColor" strokeWidth={0} />
          </div>
        }
      />

      <main className="px-4 pt-3">
        {/* Status banner */}
        <div className="mb-3 flex items-center justify-between rounded-xl bg-ve-primary-container/25 px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-ve-primary" />
            <p className="truncate text-[12px] font-semibold text-ve-on-surface">
              WhatsApp connected
            </p>
          </div>
          <span className="shrink-0 text-[11px] font-bold text-ve-outline">
            Sent {sentCount}/{totalCount || 0}
          </span>
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

        {/* Filter chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 mb-3">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all active:scale-95 ${
                filter === f
                  ? 'bg-ve-primary text-white shadow-sm'
                  : 'bg-ve-surface-container-high text-ve-on-surface-variant'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Rows */}
        {filteredLive.length === 0 && filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 rounded-xl border border-dashed border-ve-outline-variant bg-ve-surface-container/60 px-6 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ve-primary/10">
              <Check size={18} className="text-ve-primary" />
            </div>
            <p className="text-[13px] font-bold text-ve-on-surface">No receipts yet</p>
            <p className="max-w-xs text-[11px] text-ve-outline leading-snug">
              As soon as a payment is marked paid, its receipt goes out on WhatsApp and shows up here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-ve-outline-variant/15 rounded-xl bg-white border border-ve-outline-variant/25 overflow-hidden">
            {visibleLive.map((row) => (
              <button
                key={row.key}
                type="button"
                onClick={() => openMemberFees(row.item.memberId)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-left active:bg-ve-surface-container transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ve-secondary-container/25">
                  <Receipt size={15} className="text-ve-secondary" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-ve-on-surface leading-tight">
                    {row.item.memberName}
                  </p>
                  <p className="truncate text-[11px] text-ve-outline leading-tight">
                    #{row.item.receiptNumber} • ₹{row.item.amount.toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  {row.status === 'failed' && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => retryNow(e, row.key, row.item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          retryNow(e as unknown as React.MouseEvent, row.key, row.item)
                        }
                      }}
                      aria-label="Retry now"
                      className="relative -m-2 flex h-11 w-11 items-center justify-center rounded-full active:scale-90 transition-all"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ve-secondary text-white">
                        <RotateCcw size={11} />
                      </span>
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold whitespace-nowrap ${STATUS_CHIP[row.status]}`}
                  >
                    <StatusIcon status={row.status} />
                    {row.status === 'queued' && AUTO_WHATSAPP_ENABLED
                      ? `${row.secondsLeft}s`
                      : STATUS_LABEL[row.status]}
                  </span>
                </div>
              </button>
            ))}

            {visibleHistory.map((row) => (
              <div
                key={row.key}
                className="flex items-center gap-2.5 px-3.5 py-2.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ve-surface-container-high">
                  <Receipt size={15} className="text-ve-outline" />
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
        )}

        {hasMore && (
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
    </div>
  )
}
