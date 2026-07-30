"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import type { Member, FeeRecord } from "@/lib/members/types";
import { getMemberPlanName } from "@/lib/members/mock-data";
import { MemberSearchBar } from "@/components/members/MemberSearchBar";
import type { SubscriptionStatus } from "@/lib/members/types";
import MemberAvatar from "@/components/shared/MemberAvatar";

type PaymentFilter = "all" | "paid" | "due" | "overdue";

const FILTER_OPTIONS: { label: string; value: PaymentFilter }[] = [
  { label: "All", value: "all" },
  { label: "Paid", value: "paid" },
  { label: "Due", value: "due" },
  { label: "Overdue", value: "overdue" },
];

interface FeesPaymentsTableProps {
  members: Member[];
  fees: FeeRecord[];
  workspaceSlug: string;
}

function PaymentStatusBadge({ status }: { status: SubscriptionStatus }) {
  const configs = {
    paid: {
      label: "Paid",
      className: "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700",
      icon: CheckCircle2,
    },
    due: {
      label: "Due",
      className: "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600",
      icon: Clock,
    },
    overdue: {
      label: "Overdue",
      className: "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600",
      icon: AlertCircle,
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span className={config.className}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function FeesPaymentsTable({ members, fees, workspaceSlug }: FeesPaymentsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<PaymentFilter>("all");

  const memberFeeMap = useMemo(() => {
    const map = new Map<string, FeeRecord[]>();
    members.forEach((m) => map.set(m.id, []));
    fees.forEach((f) => {
      const existing = map.get(f.member_id) ?? [];
      existing.push(f);
      map.set(f.member_id, existing);
    });
    return map;
  }, [members, fees]);

  const filtered = useMemo(() => {
    let result = members;

    if (activeFilter !== "all") {
      result = result.filter((m) => {
        const memberFees = memberFeeMap.get(m.id) ?? [];
        const latest = memberFees.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())[0];
        if (!latest) return false;
        return latest.status === activeFilter;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }

    return result;
  }, [members, memberFeeMap, activeFilter, searchQuery]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 pt-5 pb-3 space-y-3">
        <MemberSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by member name..."
        />
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setActiveFilter(opt.value)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                activeFilter === opt.value
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
          <div className="w-9 shrink-0" />
          <p className="flex-1 text-xs font-bold text-gray-500 uppercase tracking-wide">Member</p>
          <p className="w-24 text-center text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:block">Plan</p>
          <p className="w-24 text-center text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:block">Amount</p>
          <p className="w-28 text-center text-xs font-bold text-gray-500 uppercase tracking-wide hidden lg:block">Due Date</p>
          <p className="w-24 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Status</p>
          <div className="w-10 shrink-0" />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-900">No members found</p>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery ? `No results for "${searchQuery}"` : "Try a different filter"}
            </p>
          </div>
        ) : (
          filtered.map((member) => {
            const memberFees = memberFeeMap.get(member.id) ?? [];
            const latestFee = memberFees.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())[0];

            const href = `/${workspaceSlug}/members/${member.id}/fees`;

            return (
              <Link
                key={member.id}
                href={href}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors group"
              >
                <MemberAvatar name={member.name} avatarUrl={member.avatar_url} size={36} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
                </div>

                <p className="w-24 text-center text-xs text-gray-500 truncate hidden sm:block">
                  {latestFee?.plan_name_snapshot ?? getMemberPlanName(member.id)}
                </p>

                <p className="w-24 text-center text-sm font-medium text-gray-900 hidden md:block">
                  {latestFee ? formatCurrency(latestFee.amount_snapshot) : "—"}
                </p>

                <p className="w-28 text-center text-xs text-gray-500 hidden lg:block">
                  {latestFee ? formatDate(latestFee.due_date) : "—"}
                </p>

                <div className="w-24 shrink-0">
                  {latestFee ? (
                    <PaymentStatusBadge status={latestFee.status} />
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
              </Link>
            );
          })
        )}
      </div>

      {filtered.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/40">
          <p className="text-xs text-gray-400">
            Showing {filtered.length} of {members.length} members
          </p>
        </div>
      )}
    </div>
  );
}