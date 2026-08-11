import type { AttendanceRecord } from "@/lib/members/types";
import { getISTDateString } from "@/lib/utils/date";

export function fillAbsentDays(
  records: AttendanceRecord[],
  memberId: string,
  joinedAt: string
): AttendanceRecord[] {
  const existingDates = new Set(records.map((r) => r.date));

  const startDate = getISTDateString(new Date(joinedAt));
  const today = getISTDateString();

  const filled: AttendanceRecord[] = [...records];

  let cursor = new Date(startDate + "T00:00:00");
  const end = new Date(today + "T00:00:00");

  while (cursor <= end) {
    const dateStr = getISTDateString(cursor);
    if (!existingDates.has(dateStr)) {
      filled.push({
        id: `absent-${memberId}-${dateStr}`,
        member_id: memberId,
        date: dateStr,
        check_in: null,
        check_out: null,
        status: "absent",
      });
    }
    cursor = new Date(cursor.getTime() + 86400000);
  }

  return filled;
}