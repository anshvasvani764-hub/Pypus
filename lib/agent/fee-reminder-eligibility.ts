export type ReminderStage = "before_due" | "overdue";

export interface FeeReminderSettingsLike {
  beforeDueDays: number;
  afterDueHours: number;
  repeatIntervalHours: number;
}

export interface FeeReminderEligibility {
  eligible: boolean;
  /** Which stage this fee is currently in the lifecycle of, even when not
   *  eligible yet (e.g. "overdue" but the repeat gap hasn't elapsed). Null
   *  only when the before-due reminder already went out and the due date
   *  hasn't arrived yet — nothing left to schedule until it does. */
  stage: ReminderStage | null;
  /** ISO timestamp of when the next reminder for this fee will become
   *  eligible (or did become eligible, if in the past and `eligible` is true). */
  nextEligibleAt: string;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** due_date is a plain 'YYYY-MM-DD' — treat it as midnight IST. */
function dueDateMidnightIST(dueDate: string): number {
  return Date.parse(`${dueDate}T00:00:00+05:30`);
}

/**
 * Given a fee's due date, the workspace's reminder settings, and the last
 * time a reminder went out for this fee (per stage), works out whether a
 * reminder is eligible to fire right now.
 *
 * Lifecycle:
 *  - Before the due date: exactly one soft reminder, at
 *    due_date - beforeDueDays. Skipped once sent.
 *  - On/after the due date: first overdue reminder at
 *    due_date + afterDueHours, then repeats every repeatIntervalHours from
 *    the last overdue send — for as long as the fee stays unpaid. There's
 *    no separate "cancel" step: a paid fee simply never reaches this
 *    function again (the caller only evaluates fees still due/overdue).
 */
export function evaluateFeeReminder(
  dueDate: string,
  settings: FeeReminderSettingsLike,
  lastBeforeDueSentAt: string | null,
  lastOverdueSentAt: string | null,
  now: number = Date.now()
): FeeReminderEligibility {
  const dueMs = dueDateMidnightIST(dueDate);
  const beforeDueFireAt = dueMs - settings.beforeDueDays * DAY_MS;

  if (now >= dueMs) {
    const baseline = lastOverdueSentAt ? new Date(lastOverdueSentAt).getTime() : null;
    const nextFireAt = baseline
      ? baseline + settings.repeatIntervalHours * HOUR_MS
      : dueMs + settings.afterDueHours * HOUR_MS;

    return {
      eligible: now >= nextFireAt,
      stage: "overdue",
      nextEligibleAt: new Date(nextFireAt).toISOString(),
    };
  }

  if (lastBeforeDueSentAt) {
    // Soft reminder already sent, due date hasn't arrived — nothing to do
    // until it does and the overdue chain takes over.
    return { eligible: false, stage: null, nextEligibleAt: new Date(dueMs).toISOString() };
  }

  return {
    eligible: now >= beforeDueFireAt,
    stage: "before_due",
    nextEligibleAt: new Date(beforeDueFireAt).toISOString(),
  };
}

/** Human label + hour-to-day hint, e.g. 36 -> "36h (1.5 days)". Used in the
 *  settings panel so an hours field doesn't feel opaque. */
export function hoursWithDayHint(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "";
  const days = hours / 24;
  const label = Number.isInteger(days) ? `${days} day${days === 1 ? "" : "s"}` : `${days.toFixed(1)} days`;
  return `(${label})`;
}

/** Formats a 'YYYY-MM-DD' due date the way the approved WhatsApp templates
 *  expect it, e.g. "5 Sep 2026". Shared by the auto-send cron job and the
 *  manual "Send" button so both paths produce identical wording. */
export function formatDueDateForWhatsApp(dueDate: string): string {
  return new Date(`${dueDate}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
