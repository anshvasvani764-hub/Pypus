"use client";

import { useState, useCallback } from "react";
import type { Member, AttendanceRecord } from "@/lib/members/types";
import type { MemberFeeSummary } from "@/lib/members/fee-status";
import { PageHeader } from "@/components/layout/PageHeader";
import { AttendanceSnapshotCards } from "@/components/attendance/AttendanceSnapshotCards";
import { AttendanceRegister } from "@/components/attendance/AttendanceRegister";
import { PrintQrButton } from "@/components/attendance/PrintQrButton";

interface AttendanceModuleViewProps {
  workspaceSlug: string;
  workspaceId: string;
  workspaceName: string;
  members: Member[];
  todayRecords: AttendanceRecord[];
  feeSummaries: Record<string, MemberFeeSummary>;
}

export function AttendanceModuleView({
  workspaceSlug,
  workspaceId,
  workspaceName,
  members,
  todayRecords,
  feeSummaries,
}: AttendanceModuleViewProps) {
  const [checkedInMemberIds, setCheckedInMemberIds] = useState<
    Record<string, string>
  >({});

  const handleCheckIn = useCallback((memberId: string, time: string) => {
    setCheckedInMemberIds((prev) => ({ ...prev, [memberId]: time }));
  }, []);

  const effectiveRecords = buildEffectiveRecords(todayRecords, checkedInMemberIds);
  const snapshot = computeSnapshot(members, effectiveRecords);

  return (
    <div className="w-full max-w-6xl px-8 py-6">
      <PageHeader
        title="Attendance"
        subtitle="Daily check-ins for all gym members"
        backHref={`/${workspaceSlug}/workspace`}
        actions={<PrintQrButton workspaceId={workspaceId} workspaceName={workspaceName} />}
      />

      <div className="mt-6">
        <AttendanceSnapshotCards
          totalMembers={snapshot.totalMembers}
          todayCheckIns={snapshot.todayCheckIns}
          attendanceRatePercent={snapshot.attendanceRatePercent}
          attendanceRateFraction={snapshot.attendanceRateFraction}
          missingToday={snapshot.missingToday}
        />
      </div>

      <div className="mt-6">
        <AttendanceRegister
          members={members}
          todayRecords={effectiveRecords}
          checkedInMemberIds={checkedInMemberIds}
          onCheckIn={handleCheckIn}
          workspaceSlug={workspaceSlug}
          workspaceId={workspaceId}
          feeSummaries={feeSummaries}
        />
      </div>
    </div>
  );
}

import { getISTDateString } from "@/lib/utils/date";

function buildEffectiveRecords(
  serverRecords: AttendanceRecord[],
  checkedInIds: Record<string, string>
): AttendanceRecord[] {
  const serverMap = new Map(serverRecords.map((r) => [r.member_id, r]));
  const result = serverRecords.map((r) => {
    if (checkedInIds[r.member_id] != null && r.check_in == null) {
      return {
        ...r,
        check_in: checkedInIds[r.member_id],
        status: "present" as const,
      };
    }
    return r;
  });

  for (const [memberId, time] of Object.entries(checkedInIds)) {
    if (!serverMap.has(memberId)) {
      result.push({
        id: `local-${memberId}`,
        member_id: memberId,
        date: getISTDateString(),
        check_in: time,
        check_out: null,
        status: "present" as const,
      });
    }
  }

  return result;
}

function computeSnapshot(members: Member[], todayRecords: AttendanceRecord[]) {
  const totalMembers = members.length;
  const todayCheckIns = todayRecords.filter((r) => r.check_in != null).length;
  const attendanceRatePercent =
    totalMembers > 0 ? Math.round((todayCheckIns / totalMembers) * 100) : 0;
  const attendanceRateFraction = `${todayCheckIns}/${totalMembers} members attended`;
  const missingToday = totalMembers - todayCheckIns;

  return {
    totalMembers,
    todayCheckIns,
    attendanceRatePercent,
    attendanceRateFraction,
    missingToday,
  };
}