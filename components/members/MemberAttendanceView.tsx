"use client";

import { useState } from "react";
import { CalendarCheck, Flame, TrendingUp, Clock, Pencil } from "lucide-react";
import type { AttendanceRecord } from "@/lib/members/types";
import { getISTDateString } from "@/lib/utils/date";
import { EditAttendanceModal } from "@/components/records/EditAttendanceModal";

function formatISTTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

interface MemberAttendanceViewProps {
  memberId: string;
  records: AttendanceRecord[];
  workspaceId: string;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  iconColor?: string;
  iconBg?: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  iconColor = "text-emerald-600",
  iconBg = "bg-emerald-50",
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 flex items-center gap-4">
      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function AttendanceBadge({ status }: { status: AttendanceRecord["status"] }) {
  if (status === "present") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
        <CalendarCheck className="h-3 w-3" />
        Present
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-600">
      Absent
    </span>
  );
}

export function MemberAttendanceView({ memberId, records, workspaceId }: MemberAttendanceViewProps) {
  const [recordsState, setRecordsState] = useState<AttendanceRecord[]>(records);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  const sorted = [...recordsState].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const total = recordsState.length;
  const present = recordsState.filter((r) => r.status === "present").length;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
  const streak = computeStreak(recordsState);

  function computeStreak(recs: AttendanceRecord[]): number {
  const sorted = [...recs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  let streak = 0;
  const today = getISTDateString();
  let yesterday = getISTDateString(new Date(Date.now() - 86400000));
  let lastDate = today;
  for (const r of sorted) {
    if (r.status !== "present") continue;
    if (r.date === lastDate || r.date === yesterday) {
      streak++;
      lastDate = r.date;
      yesterday = getISTDateString(new Date(new Date(r.date).getTime() - 86400000));
    }
  }
  return streak;
}

  function handleSaved(originalId: string, updated: AttendanceRecord) {
    setRecordsState((prev) =>
      prev.map((r) => (r.id === originalId ? updated : r))
    );
  }

  return (
    <div className="mt-5 space-y-5">
      <EditAttendanceModal
        isOpen={editingRecord !== null}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        workspaceId={workspaceId}
        memberId={memberId}
        onSaved={handleSaved}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={CalendarCheck}
          label="Total Sessions"
          value={total}
        />
        <StatCard
          icon={TrendingUp}
          label="Attendance %"
          value={`${percentage}%`}
          iconColor={
            percentage >= 75
              ? "text-emerald-600"
              : percentage >= 50
              ? "text-amber-500"
              : "text-red-500"
          }
          iconBg={
            percentage >= 75
              ? "bg-emerald-50"
              : percentage >= 50
              ? "bg-amber-50"
              : "bg-red-50"
          }
        />
        <StatCard
          icon={CalendarCheck}
          label="Sessions Present"
          value={present}
        />
        <StatCard
          icon={Flame}
          label="Current Streak"
          value={`${streak} day${streak !== 1 ? "s" : ""}`}
          iconColor="text-orange-500"
          iconBg="bg-orange-50"
        />
      </div>

      {/* Attendance table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Session History</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Data sourced from the Attendance module
          </p>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarCheck className="h-8 w-8 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No attendance records yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sorted.map((record) => {
              const date = new Date(record.date).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <div
                  key={record.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full shrink-0 mt-0.5"
                      style={{
                        backgroundColor: record.status === "present" ? "#10b981" : "#f87171",
                      }}
                    />
                    <span className="text-sm font-medium text-gray-900">{date}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    {record.status === "present" && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                        <Clock className="h-3 w-3" />
                        {formatISTTime(record.check_in)}
                        <span className="text-gray-400">–</span>
                        {formatISTTime(record.check_out)}
                      </span>
                    )}
                    <AttendanceBadge status={record.status} />
                    <button
                      onClick={() => setEditingRecord(record)}
                      className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title="Edit record"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
