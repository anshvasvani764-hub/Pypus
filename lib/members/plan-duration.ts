// ──────────────────────────────────────────────
// Plan duration helpers
// Plans store duration as a plain number string for n = 1..12 (e.g. "1",
// "3", "12") so a gym can price any month-count plan instead of being stuck
// with monthly/quarterly/yearly. Old plans created before this change still
// have duration = "monthly" | "quarterly" | "yearly", and a short-lived
// earlier format used "<n>_month" — every helper below accepts all three,
// so existing plans/fees keep working with no data migration needed.
// ──────────────────────────────────────────────

export interface PlanDurationOption {
  value: string;
  label: string;
  months: number;
}

/** 1 Month ... 12 Months, for every duration dropdown in the app. */
export const PLAN_DURATION_OPTIONS: PlanDurationOption[] = Array.from(
  { length: 12 },
  (_, i) => {
    const months = i + 1;
    return {
      value: `${months}`,
      label: months === 1 ? "1 Month" : `${months} Months`,
      months,
    };
  }
);

const LEGACY_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

const LEGACY_DAYS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

const LEGACY_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

/** Number of calendar months a plan duration covers. Understands the plain
 *  "<n>" format, the short-lived "<n>_month" format, and the legacy
 *  monthly/quarterly/yearly strings. */
export function monthsForDuration(duration: string | null | undefined): number {
  if (!duration) return 1;
  if (duration in LEGACY_MONTHS) return LEGACY_MONTHS[duration];
  const match = /^(\d+)(?:_month)?$/.exec(duration);
  if (match) return Math.min(12, Math.max(1, Number(match[1])));
  return 1;
}

/** Cycle length in days used for due-date math across billing. Legacy
 *  durations keep their exact historical day counts (365 for yearly, not
 *  360) so existing due dates don't shift; new durations are months * 30. */
export function daysForDuration(duration: string | null | undefined): number {
  if (!duration) return 30;
  if (duration in LEGACY_DAYS) return LEGACY_DAYS[duration];
  return monthsForDuration(duration) * 30;
}

/** Human label for a duration value, e.g. "3 Months" or "Monthly" (legacy). */
export function durationLabel(duration: string | null | undefined): string {
  if (!duration) return "1 Month";
  if (duration in LEGACY_LABELS) return LEGACY_LABELS[duration];
  const months = monthsForDuration(duration);
  return months === 1 ? "1 Month" : `${months} Months`;
}
