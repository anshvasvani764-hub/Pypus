"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Wallet, AlertCircle, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Member, FeeRecord } from "@/lib/members/types";
import { getMemberPlanName } from "@/lib/members/mock-data";
import MemberAvatar from "@/components/shared/MemberAvatar";

interface ExpensesModuleViewProps {
  workspaceSlug: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function FeeStatusBadge({ feeStatus }: { feeStatus: FeeRecord["status"] | null }) {
  const status = feeStatus;

  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        Paid
      </span>
    );
  }
  if (status === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
        <AlertCircle className="h-3 w-3" />
        Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">
      <Clock className="h-3 w-3" />
      Due
    </span>
  );
}

function FeeRow({
  member,
  feeMap,
  workspaceSlug,
}: {
  member: Member;
  feeMap: Record<string, FeeRecord[]>;
  workspaceSlug: string;
}) {
  const fees = feeMap[member.id] ?? [];
  const upcoming = fees.find((f) => f.status === "due" || f.status === "overdue") ?? null;
  const totalPaid = fees
    .filter((f) => f.status === "paid")
    .reduce((sum, f) => sum + f.amount_snapshot, 0);

  const href = `/${workspaceSlug}/members/${member.id}/fees`;

  return (
    <Link
      href={href}
      className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors group"
    >
      <MemberAvatar name={member.name} avatarUrl={member.avatar_url} size={36} fallbackClassName="bg-gradient-to-br from-amber-400 to-orange-500 text-white" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {getMemberPlanName(member.id)}
        </p>
      </div>

      <div className="text-center shrink-0 hidden sm:block">
        <p className="text-sm font-bold text-gray-900">{formatCurrency(totalPaid)}</p>
        <p className="text-xs text-gray-400">paid</p>
      </div>

      <div className="text-center shrink-0 hidden md:block">
        {upcoming ? (
          <>
            <p className="text-sm font-bold text-gray-900">
              {formatCurrency(upcoming.amount_snapshot)}
            </p>
            <p className="text-xs text-gray-400">
              due {new Date(upcoming.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-400">—</p>
        )}
      </div>

      <FeeStatusBadge feeStatus={upcoming?.status ?? null} />

      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
    </Link>
  );
}

export function ExpensesModuleView({ workspaceSlug }: ExpensesModuleViewProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [feesMap, setFeesMap] = useState<Record<string, FeeRecord[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        const { data: memberData, error: mError } = await supabase
          .from("members")
          .select("*")
          .order("created_at", { ascending: true });
        if (mError) throw mError;

        const memberList = (memberData ?? []) as Member[];
        setMembers(memberList);

        if (memberList.length > 0) {
          const { data: feeData, error: fError } = await supabase
            .from("fees")
            .select("*")
            .in("member_id", memberList.map((m) => m.id));

          if (!fError && feeData) {
            const fees = (feeData ?? []) as FeeRecord[];
            const map: Record<string, FeeRecord[]> = {};
            for (const fee of fees) {
              const key = fee.member_id;
              if (!map[key]) map[key] = [];
              map[key].push(fee);
            }
            setFeesMap(map);
          }
        }
      } catch (err) {
        console.error("ExpensesModuleView fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [workspaceSlug]);

  if (loading) {
    return (
      <div className="w-full max-w-6xl px-8 py-10">
        <p className="text-sm text-gray-500">Loading fees data...</p>
      </div>
    );
  }

  const overdueCount = members.filter((m) => {
    const fees = feesMap[m.id] ?? [];
    return fees.some((f) => f.status === "overdue");
  }).length;

  const pendingCount = members.filter((m) => {
    const fees = feesMap[m.id] ?? [];
    return fees.some((f) => f.status === "due");
  }).length;

  return (
    <div className="w-full max-w-6xl px-8 py-10">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Fees</h1>
          <p className="mt-1 text-sm text-gray-500">
            Member payment status and collection overview
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">
                {overdueCount} overdue
              </span>
            </div>
          )}
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-700">
                {pendingCount} due soon
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
          <div className="w-9 shrink-0" />
          <p className="flex-1 text-xs font-bold text-gray-500 uppercase tracking-wide">Member</p>
          <p className="w-24 text-center text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:block">Total Paid</p>
          <p className="w-24 text-center text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:block">Next Due</p>
          <p className="w-20 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Status</p>
          <div className="w-4 shrink-0" />
        </div>

        <div className="divide-y divide-gray-100">
          {members.map((member) => (
            <FeeRow
              key={member.id}
              member={member}
              feeMap={feesMap}
              workspaceSlug={workspaceSlug}
            />
          ))}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/40">
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            Click any member to view their full payment history
          </p>
        </div>
      </div>
    </div>
  );
}
