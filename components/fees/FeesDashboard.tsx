"use client";

import { CreditCard, Plus } from "lucide-react";
import type { Member, FeeRecord } from "@/lib/members/types";
import { FeesSnapshotCards } from "@/components/fees/FeesSnapshotCards";
import { FeesPaymentsTable } from "@/components/fees/FeesPaymentsTable";

interface FeesDashboardProps {
  workspaceSlug: string;
  members: Member[];
  upcomingFees: FeeRecord[];
  monthlyRevenue: number;
}

export function FeesDashboard({
  workspaceSlug,
  members,
  upcomingFees,
  monthlyRevenue,
}: FeesDashboardProps) {
  const activeSubscriptions = members.length;
  const pendingCollection = upcomingFees.reduce(
    (sum, f) => sum + f.amount_snapshot,
    0
  );

  return (
    <div className="w-full max-w-6xl px-8 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Fees Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track memberships, payments and pending collections.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm">
            <Plus className="h-4 w-4" />
            Add Payment
          </button>
          <a
            href={`/${workspaceSlug}/fees/plans`}
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            Plans & Pricing
          </a>
        </div>
      </div>

      <div className="mt-6">
        <FeesSnapshotCards
          activeSubscriptions={activeSubscriptions}
          pendingCollection={pendingCollection}
          upcomingRenewals={upcomingFees.length}
          monthlyRevenue={monthlyRevenue}
        />
      </div>

      <div className="mt-6">
        <FeesPaymentsTable
          members={members}
          fees={upcomingFees}
          workspaceSlug={workspaceSlug}
        />
      </div>
    </div>
  );
}