"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Search, LogIn, ChevronRight } from "lucide-react";
import type { Member, AttendanceRecord } from "@/lib/members/types";
import type { MemberFeeSummary } from "@/lib/members/fee-status";
import { useSearch } from "@/context/SearchContext";
import { PendingFeesAlert } from "@/components/attendance/PendingFeesAlert";
import { createClient } from "@/lib/supabase/client";
import MemberAvatar from "@/components/shared/MemberAvatar";

type AttendanceFilter = "all" | "present" | "absent";

const FILTER_OPTIONS: { label: string; value: AttendanceFilter }[] = [
  { label: "All", value: "all" },
  { label: "Present Today", value: "present" },
  { label: "Absent Today", value: "absent" },
];

interface AttendanceRegisterProps {
  members: Member[];
  todayRecords: AttendanceRecord[];
  checkedInMemberIds: Record<string, string>;
  onCheckIn: (memberId: string, time: string) => void;
  workspaceSlug: string;
  workspaceId: string;
  feeSummaries: Record<string, MemberFeeSummary>;
}

import { getISTDateString, formatISTTime } from "@/lib/utils/date";

function formatCheckInTime(raw: string | null): string {
  if (!raw) return "";
  try {
    return formatISTTime(raw);
  } catch {
    return raw;
  }
}

function getAttendanceState(
  memberId: string,
  todayRecords: AttendanceRecord[]
) {
  const record = todayRecords.find((r) => r.member_id === memberId);
  if (!record) return "absent";
  if (record.check_in) return "present";
  return "absent";
}

function AttendanceStateBadge({
  state,
}: {
  state: ReturnType<typeof getAttendanceState>;
}) {
  if (state === "present") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
        <LogIn className="h-3 w-3" />
        Present
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">
      <LogIn className="h-3 w-3" />
      Absent
    </span>
  );
}

export function AttendanceRegister({
  members,
  todayRecords,
  checkedInMemberIds,
  onCheckIn,
  workspaceSlug,
  workspaceId,
  feeSummaries,
}: AttendanceRegisterProps) {
  const { searchQuery } = useSearch();
  const [activeFilter, setActiveFilter] = useState<AttendanceFilter>("all");
  const [pendingAlertMember, setPendingAlertMember] = useState<Member | null>(null);

  const filtered = useMemo(() => {
    let result = members;

    if (activeFilter !== "all") {
      result = result.filter((m) => getAttendanceState(m.id, todayRecords) === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }

    return result;
  }, [members, todayRecords, activeFilter, searchQuery]);

  const handleCheckIn = useCallback(
    async (member: Member) => {
      const supabase = createClient();
      const now = new Date();
      const today = getISTDateString(now);
      const checkInIso = now.toISOString();

      const { error } = await supabase
        .from("attendance")
        .upsert(
          {
            workspace_id: workspaceId,
            member_id: member.id,
            date: today,
            check_in: checkInIso,
            check_out: null,
            status: "present",
          },
          { onConflict: "member_id,date" }
        );

      if (error) {
        const errorDetails = Object.getOwnPropertyNames(error).length
          ? JSON.stringify(error, Object.getOwnPropertyNames(error))
          : JSON.stringify({ message: error.message || "Unknown error", name: error.name });
        console.error("Check-in error:", errorDetails);
        return;
      }

      onCheckIn(member.id, checkInIso);

      const summary = feeSummaries[member.id];
      if (summary?.status === "due" || summary?.status === "overdue") {
        setPendingAlertMember(member);
      }
    },
    [onCheckIn, workspaceId, feeSummaries]
  );

  const alertSummary = pendingAlertMember ? feeSummaries[pendingAlertMember.id] : null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <PendingFeesAlert
        isOpen={pendingAlertMember != null}
        onClose={() => setPendingAlertMember(null)}
        memberName={pendingAlertMember?.name ?? ""}
        planName={alertSummary?.planName ?? null}
        amount={alertSummary?.totalPending ?? null}
        dueDate={alertSummary?.dueDate ?? null}
        isOverdue={alertSummary?.status === "overdue"}
      />

      {/* Search + Filters */}
      <div className="px-5 pt-5 pb-3 space-y-3">
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

      {/* Table */}
      <div className="divide-y divide-gray-100">
        {/* Table header */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
          <div className="w-9 shrink-0" />
          <p className="flex-1 text-xs font-bold text-gray-500 uppercase tracking-wide">Member</p>
          <p className="w-28 text-center text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:block">Plan</p>
          <p className="w-20 text-center text-xs font-bold text-gray-500 uppercase tracking-wide hidden md:block">Check-in</p>
          <p className="w-28 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Status</p>
          <div className="w-4 shrink-0" />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-900">No members found</p>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery
                ? `No results for "${searchQuery}"`
                : "Try a different filter"}
            </p>
          </div>
        ) : (
          filtered.map((member) => {
            const record = todayRecords.find((r) => r.member_id === member.id);
            const state = getAttendanceState(member.id, todayRecords);
            const hasCheckIn = record?.check_in != null || checkedInMemberIds[member.id] != null;
            const checkInTime = record?.check_in ?? checkedInMemberIds[member.id] ?? null;

            const href = `/${workspaceSlug}/members/${member.id}/attendance`;

            return (
              <Link
                key={member.id}
                href={href}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors group"
              >
                {/* Avatar */}
                <MemberAvatar name={member.name} avatarUrl={member.avatar_url} size={36} />

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
                </div>

                {/* Plan */}
                <p className="w-28 text-center text-xs text-gray-500 truncate hidden sm:block">
                  {member.plan?.name ?? "No Plan"}
                </p>

                {/* Check-in */}
                <div className="w-20 text-center hidden md:block">
                  {hasCheckIn ? (
                    <span className="text-xs font-medium text-gray-900">{formatCheckInTime(checkInTime)}</span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCheckIn(member);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                    >
                      <LogIn className="h-3 w-3" />
                      Check In
                    </button>
                  )}
                </div>

                {/* Status */}
                <div className="w-28 shrink-0">
                  <AttendanceStateBadge state={state} />
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