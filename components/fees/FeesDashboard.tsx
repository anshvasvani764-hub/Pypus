"use client";

import { useState, useMemo, useCallback } from "react";
import { CreditCard } from "lucide-react";
import type { Member, FeeRecord } from "@/lib/members/types";
import { deriveFeeSummary } from "@/lib/members/fee-status";
import { PageHeader } from "@/components/layout/PageHeader";
import { FeesSnapshotCards } from "@/components/fees/FeesSnapshotCards";
import { FeesPaymentsTable } from "@/components/fees/FeesPaymentsTable";
import { RevenueFilterBar } from "@/components/fees/RevenueFilterBar";
import {
  type RevenuePeriod,
  getPeriodRange,
  calculateCollectedRevenue,
  periodLabel,
} from "@/lib/fees/revenue-filter";
import { getISTDateString } from "@/lib/utils/date";

interface FeesDashboardProps {
  workspaceSlug: string;
  workspaceId: string;
  workspaceName: string;
  members: Member[];
  fees: FeeRecord[];
  monthlyRevenue: number;
  expectedRevenue?: number;
  pendingCollection?: number;
}

export function FeesDashboard({
  workspaceSlug,
  workspaceId,
  workspaceName,
  members,
  fees: initialFees,
  monthlyRevenue: initialRevenue,
  expectedRevenue: expectedRevenueProp,
  pendingCollection: pendingCollectionProp,
}: FeesDashboardProps) {
  const [fees, setFees] = useState<FeeRecord[]>(initialFees);
  const [planIds, setPlanIds] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(members.map((m) => [m.id, m.plan_id ?? null]))
  );
  const [revenue, setRevenue] = useState(initialRevenue);

  const todayStr = getISTDateString();
  const [period, setPeriod] = useState<RevenuePeriod>("month");
  const [customStart, setCustomStart] = useState(todayStr);
  const [customEnd, setCustomEnd] = useState(todayStr);
  const [customDate, setCustomDate] = useState(todayStr);

  const revenueRange = useMemo(
    () => getPeriodRange(period, customStart, customEnd, customDate),
    [period, customStart, customEnd, customDate]
  );

  // For the default "month" period we reuse the server-computed revenue
  // (which already accounts for live payments via handlePaid below).
  // For every other period (including "day") we derive the total client-side
  // from `fees`, which already holds the full, unfiltered fee history for
  // this workspace.
  const filteredRevenue = useMemo(() => {
    if (period === "month") return revenue;
    return calculateCollectedRevenue(fees, revenueRange);
  }, [period, revenue, fees, revenueRange]);

  const revenueLabel = periodLabel(period, revenueRange);

  const summaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof deriveFeeSummary>>();
    for (const m of members) {
      map.set(
        m.id,
        deriveFeeSummary(
          { plan_id: planIds[m.id] ?? null },
          fees.filter((f) => f.member_id === m.id)
        )
      );
    }
    return map;
  }, [members, fees, planIds]);

  const snapshot = useMemo(() => {
    let pendingCollection = pendingCollectionProp ?? 0;
    let expectedRevenue = expectedRevenueProp ?? 0;

    if (expectedRevenueProp == null && pendingCollectionProp == null) {
      for (const m of members) {
        const s = summaries.get(m.id);
        if (!s || s.status === "no_plan") continue;
        pendingCollection += s.totalPending;
        expectedRevenue += s.monthlyValue;
      }
    } else if (pendingCollectionProp == null) {
      for (const m of members) {
        const s = summaries.get(m.id);
        if (!s || s.status === "no_plan") continue;
        pendingCollection += s.totalPending;
      }
    } else if (expectedRevenueProp == null) {
      for (const m of members) {
        const s = summaries.get(m.id);
        if (!s || s.status === "no_plan") continue;
        expectedRevenue += s.monthlyValue;
      }
    }

    return { pendingCollection, expectedRevenue };
  }, [members, summaries, expectedRevenueProp, pendingCollectionProp]);

  const handlePlanAssigned = useCallback(
    (memberId: string, planId: string | null, fee: FeeRecord) => {
      setPlanIds((prev) => ({ ...prev, [memberId]: planId }));
      setFees((prev) => [...prev, fee]);
    },
    []
  );

  const handlePaid = useCallback((fee: FeeRecord, amount: number) => {
    setFees((prev) => {
      const exists = prev.some((f) => f.id === fee.id);
      return exists ? prev.map((f) => (f.id === fee.id ? fee : f)) : [...prev, fee];
    });
    setRevenue((prev) => prev + amount);
  }, []);

  return (
    <div className="w-full max-w-6xl px-8 py-6">
      <PageHeader
        title="Fees Management"
        subtitle="Track memberships, payments and pending collections."
        backHref={`/${workspaceSlug}/workspace`}
        actions={
          <a
            href={`/${workspaceSlug}/fees/plans`}
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            Plans & Pricing
          </a>
        }
      />

      <div className="mt-6">
        <RevenueFilterBar
          period={period}
          customStart={customStart}
          customEnd={customEnd}
          customDate={customDate}
          onPeriodChange={setPeriod}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
          onCustomDateChange={setCustomDate}
        />
      </div>

      <div className="mt-4">
        <FeesSnapshotCards
          feesCollected={filteredRevenue}
          pendingCollection={snapshot.pendingCollection}
          expectedRevenue={snapshot.expectedRevenue}
          feesCollectedLabel={revenueLabel}
        />
      </div>

      <div className="mt-6">
        <FeesPaymentsTable
          members={members}
          summaries={summaries}
          workspaceSlug={workspaceSlug}
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          onPlanAssigned={handlePlanAssigned}
          onPaid={handlePaid}
        />
      </div>
    </div>
  );
}
