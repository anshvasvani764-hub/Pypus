import type { FeeRecord, Member } from "./types";
import { getISTDateString } from "@/lib/utils/date";
import { daysForDuration } from "@/lib/members/plan-duration";

export type DerivedFeeStatus = "paid" | "due" | "overdue" | "no_plan";

export interface MemberFeeSummary {
  status: DerivedFeeStatus;
  planName: string | null;
  amount: number | null;
  dueDate: string | null;
  /** The fee row a payment should be recorded against, null when nothing is owed. */
  payableFee: FeeRecord | null;
  totalPaid: number;
  totalPending: number;
  /** Plan price normalised to a 30-day month, so quarterly/yearly plans don't
   *  inflate a single month's expected revenue. */
  monthlyValue: number;
}

/** @deprecated kept for backward compatibility — use daysForDuration() from
 *  lib/members/plan-duration.ts, which also understands 1-12 month plans. */
const CYCLE_DAYS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

export { CYCLE_DAYS };

/** Plan duration lives on `plans`, not on the fee row, so callers that know the
 *  member's plan pass it in; without it we assume a monthly cycle. */
export function toMonthlyValue(fee: FeeRecord | null, planDuration?: string): number {
  if (!fee) return 0;
  const days = daysForDuration(planDuration);
  return ((fee.amount_snapshot ?? 0) * 30) / days;
}

function latestByDueDate(fees: FeeRecord[]): FeeRecord | null {
  if (fees.length === 0) return null;
  return [...fees].sort(
    (a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
  )[0];
}

/**
 * A paid row stays "paid" only until its due_date arrives — on that day the
 * membership period ends and the member owes the next cycle, so the derived
 * status flips back to due without any row being written.
 */
export function deriveFeeSummary(
  member: (Pick<Member, "plan_id"> & { plan?: { duration?: string } | null }) | null,
  fees: FeeRecord[],
  today: string = getISTDateString()
): MemberFeeSummary {
  const totalPaid = fees.reduce((sum, f) => sum + (f.paid_amount ?? 0), 0);

  const outstanding = fees.filter((f) => f.status !== "paid");
  const totalPending = outstanding.reduce(
    (sum, f) => sum + ((f.amount_snapshot ?? 0) - (f.paid_amount ?? 0)),
    0
  );

  const latest = latestByDueDate(fees);
  const hasPlan = member?.plan_id != null || latest != null;

  if (!hasPlan) {
    return {
      status: "no_plan",
      planName: null,
      amount: null,
      dueDate: null,
      payableFee: null,
      totalPaid,
      totalPending,
      monthlyValue: 0,
    };
  }

  // Prefer the oldest unpaid row — that's what the member actually owes next.
  const oldestUnpaid =
    [...outstanding].sort(
      (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    )[0] ?? null;

  const reference = oldestUnpaid ?? latest;

  if (!reference) {
    return {
      status: "due",
      planName: null,
      amount: null,
      dueDate: null,
      payableFee: null,
      totalPaid,
      totalPending,
      monthlyValue: 0,
    };
  }

  const planName = reference.plan_name_snapshot ?? null;
  const amount = reference.amount_snapshot ?? null;
  const dueDate = reference.due_date;
  const periodEnded = dueDate <= today;
  const monthlyValue = toMonthlyValue(reference, member?.plan?.duration);

  if (oldestUnpaid) {
    return {
      status: periodEnded ? "overdue" : "due",
      planName,
      amount,
      dueDate,
      payableFee: oldestUnpaid,
      totalPaid,
      totalPending,
      monthlyValue,
    };
  }

  // Everything on record is paid — the member is covered until due_date lands.
  return {
    status: periodEnded ? "due" : "paid",
    planName,
    amount,
    dueDate,
    payableFee: periodEnded ? reference : null,
    totalPaid,
    totalPending,
    monthlyValue,
  };
}

const STATUS_STYLES: Record<DerivedFeeStatus, { label: string; classes: string }> = {
  paid: { label: "Paid", classes: "bg-emerald-50 text-emerald-600" },
  due: { label: "Due", classes: "bg-amber-50 text-amber-600" },
  overdue: { label: "Overdue", classes: "bg-red-50 text-red-600" },
  no_plan: { label: "No plan", classes: "bg-gray-100 text-gray-500" },
};

export function feeStatusStyle(status: DerivedFeeStatus) {
  return STATUS_STYLES[status];
}
