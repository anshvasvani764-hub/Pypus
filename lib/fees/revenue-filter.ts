import type { FeeRecord } from "@/lib/members/types";
import { getISTDateString } from "@/lib/utils/date";

export type RevenuePeriod = "today" | "week" | "month" | "custom";

export interface DateRange {
  start: string; // ISO date (YYYY-MM-DD), inclusive
  end: string; // ISO date (YYYY-MM-DD), inclusive
}

/**
 * Resolves a RevenuePeriod into a concrete [start, end] IST date range.
 * "week" = current calendar week starting Monday.
 * "custom" requires customStart/customEnd to already be YYYY-MM-DD strings.
 */
export function getPeriodRange(
  period: RevenuePeriod,
  customStart?: string,
  customEnd?: string
): DateRange {
  const todayStr = getISTDateString();

  if (period === "today") {
    return { start: todayStr, end: todayStr };
  }

  if (period === "custom") {
    return {
      start: customStart || todayStr,
      end: customEnd || customStart || todayStr,
    };
  }

  // For week/month we derive from the IST "today" string to avoid
  // server-local-timezone drift, then do date math in UTC-safe fashion.
  const [y, m, d] = todayStr.split("-").map(Number);
  const todayUTC = new Date(Date.UTC(y, m - 1, d));

  if (period === "week") {
    const dayOfWeek = todayUTC.getUTCDay(); // 0 = Sunday
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(todayUTC);
    monday.setUTCDate(todayUTC.getUTCDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return {
      start: monday.toISOString().slice(0, 10),
      end: sunday.toISOString().slice(0, 10),
    };
  }

  // period === "month"
  const firstOfMonth = new Date(Date.UTC(y, m - 1, 1));
  const lastOfMonth = new Date(Date.UTC(y, m, 0));
  return {
    start: firstOfMonth.toISOString().slice(0, 10),
    end: lastOfMonth.toISOString().slice(0, 10),
  };
}

/**
 * Sums paid_amount for fees paid within [start, end] inclusive.
 * Only counts rows with status "paid" and a non-null paid_date.
 */
export function calculateCollectedRevenue(
  fees: FeeRecord[],
  range: DateRange
): number {
  return fees
    .filter((f) => {
      if (f.status !== "paid" || !f.paid_date) return false;
      const paidDate = f.paid_date.slice(0, 10);
      return paidDate >= range.start && paidDate <= range.end;
    })
    .reduce((sum, f) => sum + (f.paid_amount ?? 0), 0);
}

export function periodLabel(
  period: RevenuePeriod,
  range: DateRange
): string {
  switch (period) {
    case "today":
      return "today";
    case "week":
      return "this week";
    case "month":
      return "this month";
    case "custom":
      return range.start === range.end
        ? formatShort(range.start)
        : `${formatShort(range.start)} – ${formatShort(range.end)}`;
  }
}

function formatShort(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}
