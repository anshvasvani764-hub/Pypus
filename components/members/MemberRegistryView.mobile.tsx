'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, ChevronRight, Users } from 'lucide-react'
import type { Member } from '@/lib/members/types'
import type { DerivedFeeStatus } from '@/lib/members/fee-status'
import { MobileTopBar } from '@/components/mobile/MobileTopBar'

const STATUS_CHIP: Record<DerivedFeeStatus, { label: string; classes: string; ring: string }> = {
  paid: { label: 'Paid', classes: 'bg-ve-primary-container text-ve-on-primary-container', ring: 'border-ve-primary-container' },
  due: { label: 'Due', classes: 'bg-ve-tertiary-container text-ve-on-tertiary-container', ring: 'border-ve-tertiary-container' },
  overdue: { label: 'Overdue', classes: 'bg-ve-error-container text-ve-on-error-container', ring: 'border-ve-error-container' },
  no_plan: { label: 'No plan', classes: 'bg-ve-surface-container-high text-ve-on-surface-variant', ring: 'border-ve-outline-variant' },
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'fee_due', label: 'Fees Due' },
  { key: 'low_attendance', label: 'Low Attendance' },
  { key: 'recent', label: 'Recently Joined' },
]

function filterMembers(
  members: Member[],
  filter: string,
  query: string,
  attendanceMap: Record<string, { total: number; percentage: number }>,
  feeStatusMap: Record<string, DerivedFeeStatus>
): Member[] {
  let result = members

  if (filter === 'fee_due') {
    result = result.filter((m) => {
      const st = feeStatusMap[m.id]
      return st === 'due' || st === 'overdue'
    })
  } else if (filter === 'low_attendance') {
    result = result.filter((m) => {
      const s = attendanceMap[m.id]
      return s && s.total > 0 && s.percentage < 60
    })
  } else if (filter === 'recent') {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    result = result.filter((m) => new Date(m.joined_at) >= cutoff)
  }

  const q = query.trim().toLowerCase()
  if (q) {
    result = result.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.phone ?? '').toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q)
    )
  }

  return result
}

export function MemberRegistryViewMobile({
  members,
  workspaceSlug,
  attendanceMap,
  feeStatusMap,
  planNameMap,
}: {
  members: Member[]
  workspaceSlug: string
  attendanceMap: Record<string, { total: number; percentage: number }>
  feeStatusMap: Record<string, DerivedFeeStatus>
  planNameMap: Record<string, string | null>
}) {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')

  const filtered = useMemo(
    () => filterMembers(members, activeFilter, query, attendanceMap, feeStatusMap),
    [members, activeFilter, query, attendanceMap, feeStatusMap]
  )

  return (
    <div>
      <MobileTopBar
        title="Members"
        workspaceSlug={workspaceSlug}
        backHref={`/${workspaceSlug}/workspace`}
        action={<span className="size-10" />}
      />

      <div className="px-ve-margin">
        <div className="relative">
          <Search
            size={20}
            className="absolute top-1/2 left-4 -translate-y-1/2 text-ve-on-surface-variant/60"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            placeholder="Search by name, phone or email"
            className="h-14 w-full rounded-ve border-2 border-ve-outline-variant/30 bg-ve-surface-container-lowest pr-4 pl-12 text-ve-body text-ve-on-surface outline-none focus:border-ve-primary [&::-webkit-search-cancel-button]:hidden"
          />
        </div>

        <div className="-mx-ve-margin mt-ve-md mb-ve-lg flex gap-ve-sm overflow-x-auto px-ve-margin [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={
                activeFilter === f.key
                  ? 'text-ve-label shrink-0 rounded-full bg-ve-primary px-5 py-2.5 text-ve-on-primary shadow-md shadow-ve-primary/20'
                  : 'text-ve-label shrink-0 rounded-full bg-ve-surface-container-high px-5 py-2.5 text-ve-on-surface-variant'
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mb-ve-md flex items-end justify-between">
          <h2 className="text-ve-headline-mobile text-ve-on-surface">Registry</h2>
          <span className="text-ve-label text-ve-on-surface-variant/60 uppercase">
            {filtered.length} {filtered.length === 1 ? 'Member' : 'Members'}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-ve-surface-container">
              <Users size={22} className="text-ve-on-surface-variant" />
            </span>
            <p className="font-semibold text-ve-on-surface">No members found</p>
            <p className="mt-1 text-sm text-ve-on-surface-variant">
              {query ? `No results for "${query}"` : 'Try a different filter'}
            </p>
          </div>
        ) : (
          <ul className="grid gap-ve-md">
            {filtered.map((m) => {
              const chip = STATUS_CHIP[feeStatusMap[m.id] ?? 'no_plan']
              return (
                <li key={m.id}>
                  <Link
                    href={`/${workspaceSlug}/members/${m.id}`}
                    className="flex items-center gap-ve-md rounded-ve-lg border border-ve-outline-variant/10 bg-ve-surface-container-lowest p-ve-md shadow-sm active:scale-[0.98]"
                  >
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.avatar_url}
                        alt=""
                        referrerPolicy="no-referrer"
                        className={`size-14 shrink-0 rounded-full border-2 object-cover ${chip.ring}`}
                      />
                    ) : (
                      <span
                        className={`flex size-14 shrink-0 items-center justify-center rounded-full border-2 bg-ve-surface-container text-lg font-bold text-ve-on-surface ${chip.ring}`}
                      >
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-ve-on-surface">{m.name}</span>
                      <span className="block truncate text-sm text-ve-on-surface-variant/70">
                        {planNameMap[m.id] ?? m.phone}
                      </span>
                    </span>

                    <span
                      className={`text-ve-label shrink-0 rounded-full px-3 py-1 text-[10px] uppercase ${chip.classes}`}
                    >
                      {chip.label}
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-ve-on-surface-variant/40" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
