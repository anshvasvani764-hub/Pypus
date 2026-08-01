// ──────────────────────────────────────────────
// Member Module — Mock Data + Supabase Wrappers
// Data-fetching functions are async wrappers over real Supabase queries.
// Derivation helpers remain sync pure functions for client-side computation.
// ──────────────────────────────────────────────

import type { Member, AttendanceRecord, FeeRecord, Plan } from "./types";

export const MOCK_MEMBERS: Member[] = [
  {
    id: "mem-001",
    workspace_id: "ws-001",
    name: "Rahul Sharma",
    email: "rahul.sharma@email.com",
    phone: "+91 98765 43210",
    avatar_url: null,
    trainer_id: "tr-001",
    trainer_name: "Arjun Singh",
    joined_at: "2025-08-15",
  },
  {
    id: "mem-002",
    workspace_id: "ws-001",
    name: "Priya Patel",
    email: "priya.patel@email.com",
    phone: "+91 87654 32109",
    avatar_url: null,
    trainer_id: "tr-002",
    trainer_name: "Neha Kapoor",
    joined_at: "2026-01-10",
  },
  {
    id: "mem-003",
    workspace_id: "ws-001",
    name: "Amit Verma",
    email: "amit.verma@email.com",
    phone: "+91 76543 21098",
    avatar_url: null,
    trainer_id: null,
    trainer_name: null,
    joined_at: "2025-06-01",
  },
  {
    id: "mem-004",
    workspace_id: "ws-001",
    name: "Sneha Reddy",
    email: "sneha.reddy@email.com",
    phone: "+91 65432 10987",
    avatar_url: null,
    trainer_id: "tr-001",
    trainer_name: "Arjun Singh",
    joined_at: "2026-02-20",
  },
  {
    id: "mem-005",
    workspace_id: "ws-001",
    name: "Vikram Joshi",
    email: "vikram.joshi@email.com",
    phone: "+91 54321 09876",
    avatar_url: null,
    trainer_id: "tr-002",
    trainer_name: "Neha Kapoor",
    joined_at: "2025-12-05",
  },
  {
    id: "mem-006",
    workspace_id: "ws-001",
    name: "Ananya Gupta",
    email: "ananya.gupta@email.com",
    phone: "+91 43210 98765",
    avatar_url: null,
    trainer_id: null,
    trainer_name: null,
    joined_at: "2026-03-01",
  },
  {
    id: "mem-007",
    workspace_id: "ws-001",
    name: "Rohit Mehta",
    email: "rohit.mehta@email.com",
    phone: "+91 32109 87654",
    avatar_url: null,
    trainer_id: "tr-001",
    trainer_name: "Arjun Singh",
    joined_at: "2025-04-10",
  },
  {
    id: "mem-008",
    workspace_id: "ws-001",
    name: "Kavita Nair",
    email: "kavita.nair@email.com",
    phone: "+91 21098 76543",
    avatar_url: null,
    trainer_id: "tr-002",
    trainer_name: "Neha Kapoor",
    joined_at: "2026-02-28",
  },
];

// ── Attendance Records ──────────────────────────

export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  // Rahul Sharma (mem-001) — good attendance
  { id: "att-001", member_id: "mem-001", date: "2026-03-17", check_in: "06:15", check_out: "07:30", status: "present" },
  { id: "att-002", member_id: "mem-001", date: "2026-03-18", check_in: "06:20", check_out: "07:35", status: "present" },
  { id: "att-003", member_id: "mem-001", date: "2026-03-19", check_in: "06:10", check_out: "07:25", status: "present" },
  { id: "att-004", member_id: "mem-001", date: "2026-03-20", check_in: "06:30", check_out: "07:40", status: "present" },
  { id: "att-005", member_id: "mem-001", date: "2026-03-21", check_in: null, check_out: null, status: "absent" },
  { id: "att-006", member_id: "mem-001", date: "2026-03-22", check_in: "06:15", check_out: "07:30", status: "present" },
  { id: "att-007", member_id: "mem-001", date: "2026-03-23", check_in: "06:25", check_out: "07:45", status: "present" },
  { id: "att-008", member_id: "mem-001", date: "2026-03-24", check_in: "06:20", check_out: "07:30", status: "present" },
  { id: "att-009", member_id: "mem-001", date: "2026-03-25", check_in: null, check_out: null, status: "absent" },
  { id: "att-010", member_id: "mem-001", date: "2026-03-26", check_in: "06:10", check_out: "07:20", status: "present" },
  // Priya Patel (mem-002) — moderate attendance
  { id: "att-011", member_id: "mem-002", date: "2026-03-17", check_in: "07:00", check_out: "08:15", status: "present" },
  { id: "att-012", member_id: "mem-002", date: "2026-03-18", check_in: "07:10", check_out: "08:20", status: "present" },
  { id: "att-013", member_id: "mem-002", date: "2026-03-19", check_in: null, check_out: null, status: "absent" },
  { id: "att-014", member_id: "mem-002", date: "2026-03-20", check_in: "07:05", check_out: "08:10", status: "present" },
  { id: "att-015", member_id: "mem-002", date: "2026-03-21", check_in: "07:15", check_out: "08:30", status: "present" },
  { id: "att-016", member_id: "mem-002", date: "2026-03-22", check_in: null, check_out: null, status: "absent" },
  { id: "att-017", member_id: "mem-002", date: "2026-03-23", check_in: "07:00", check_out: "08:15", status: "present" },
  { id: "att-018", member_id: "mem-002", date: "2026-03-24", check_in: null, check_out: null, status: "absent" },
  { id: "att-019", member_id: "mem-002", date: "2026-03-25", check_in: "07:20", check_out: "08:30", status: "present" },
  { id: "att-020", member_id: "mem-002", date: "2026-03-26", check_in: "07:10", check_out: "08:25", status: "present" },
  // Amit Verma (mem-003) — poor attendance (expired)
  { id: "att-021", member_id: "mem-003", date: "2026-03-01", check_in: null, check_out: null, status: "absent" },
  { id: "att-022", member_id: "mem-003", date: "2026-03-03", check_in: null, check_out: null, status: "absent" },
  { id: "att-023", member_id: "mem-003", date: "2026-03-05", check_in: "08:00", check_out: "09:00", status: "present" },
  { id: "att-024", member_id: "mem-003", date: "2026-03-08", check_in: null, check_out: null, status: "absent" },
  { id: "att-025", member_id: "mem-003", date: "2026-03-10", check_in: "07:45", check_out: "08:50", status: "present" },
  // Sneha Reddy (mem-004) — excellent attendance
  { id: "att-026", member_id: "mem-004", date: "2026-03-17", check_in: "05:45", check_out: "07:00", status: "present" },
  { id: "att-027", member_id: "mem-004", date: "2026-03-18", check_in: "05:50", check_out: "07:10", status: "present" },
  { id: "att-028", member_id: "mem-004", date: "2026-03-19", check_in: "05:40", check_out: "06:55", status: "present" },
  { id: "att-029", member_id: "mem-004", date: "2026-03-20", check_in: "05:55", check_out: "07:05", status: "present" },
  { id: "att-030", member_id: "mem-004", date: "2026-03-21", check_in: "05:50", check_out: "07:00", status: "present" },
  { id: "att-031", member_id: "mem-004", date: "2026-03-22", check_in: "05:45", check_out: "07:00", status: "present" },
  { id: "att-032", member_id: "mem-004", date: "2026-03-23", check_in: "05:55", check_out: "07:10", status: "present" },
  { id: "att-033", member_id: "mem-004", date: "2026-03-24", check_in: "05:50", check_out: "07:05", status: "present" },
  { id: "att-034", member_id: "mem-004", date: "2026-03-25", check_in: "05:40", check_out: "06:50", status: "present" },
  { id: "att-035", member_id: "mem-004", date: "2026-03-26", check_in: "05:45", check_out: "07:00", status: "present" },
];

// ── Plans ─────────────────────────────────

export const MOCK_PLANS: Plan[] = [
  {
    id: "plan-premium-annual",
    workspace_id: "ws-001",
    name: "Premium Annual",
    duration: "yearly",
    price: 14999,
    features: [
      "Unlimited gym access",
      "Personal training (2x/month)",
      "Nutrition consultation",
      "Locker + towel service",
      "Priority booking",
    ],
    status: "active",
  },
  {
    id: "plan-monthly-basic",
    workspace_id: "ws-001",
    name: "Monthly Basic",
    duration: "monthly",
    price: 1999,
    features: [
      "Gym access (peak hours only)",
      "Towel service",
      "Locker access",
    ],
    status: "active",
  },
  {
    id: "plan-quarterly-pro",
    workspace_id: "ws-001",
    name: "Quarterly Pro",
    duration: "quarterly",
    price: 4999,
    features: [
      "Unlimited gym access",
      "Personal training (1x/month)",
      "Locker + towel service",
    ],
    status: "active",
  },
];

// ── Fee Records (subscriptions/payments) ──
// plan_name_snapshot and amount_snapshot preserve the plan price
// at the time the member subscribed — they are NOT live-linked.
// Changing a plan's price later does NOT affect existing records.

export const MOCK_FEES: FeeRecord[] = [
  // Rahul Sharma (mem-001) — Premium Annual, paid
  { id: "fee-001", member_id: "mem-001", plan_id: "plan-premium-annual", plan_name_snapshot: "Premium Annual", amount_snapshot: 14999, paid_amount: 14999, due_date: "2026-08-15", paid_date: "2026-08-10", payment_method: "Bank Transfer", status: "paid" },
  { id: "fee-002", member_id: "mem-001", plan_id: "plan-premium-annual", plan_name_snapshot: "Premium Annual", amount_snapshot: 14999, paid_amount: 14999, due_date: "2025-08-15", paid_date: "2025-08-12", payment_method: "Bank Transfer", status: "paid" },
  { id: "fee-003", member_id: "mem-001", plan_id: "plan-premium-annual", plan_name_snapshot: "Premium Annual", amount_snapshot: 14999, paid_amount: 14999, due_date: "2024-08-15", paid_date: "2024-08-14", payment_method: "Bank Transfer", status: "paid" },
  // Priya Patel (mem-002) — Monthly Basic, has due
  { id: "fee-004", member_id: "mem-002", plan_id: "plan-monthly-basic", plan_name_snapshot: "Monthly Basic", amount_snapshot: 1999, paid_amount: 0, due_date: "2026-04-10", paid_date: null, payment_method: null, status: "due" },
  { id: "fee-005", member_id: "mem-002", plan_id: "plan-monthly-basic", plan_name_snapshot: "Monthly Basic", amount_snapshot: 1999, paid_amount: 1999, due_date: "2026-03-10", paid_date: "2026-03-08", payment_method: "UPI", status: "paid" },
  { id: "fee-006", member_id: "mem-002", plan_id: "plan-monthly-basic", plan_name_snapshot: "Monthly Basic", amount_snapshot: 1999, paid_amount: 1999, due_date: "2026-02-10", paid_date: "2026-02-09", payment_method: "UPI", status: "paid" },
  // Amit Verma (mem-003) — expired, overdue
  { id: "fee-007", member_id: "mem-003", plan_id: "plan-premium-annual", plan_name_snapshot: "Premium Annual", amount_snapshot: 14999, paid_amount: 0, due_date: "2025-06-01", paid_date: null, payment_method: null, status: "overdue" },
  { id: "fee-008", member_id: "mem-003", plan_id: "plan-premium-annual", plan_name_snapshot: "Premium Annual", amount_snapshot: 14999, paid_amount: 14999, due_date: "2024-06-01", paid_date: "2024-05-28", payment_method: "Cash", status: "paid" },
  // Sneha Reddy (mem-004) — Quarterly Pro, paid
  { id: "fee-009", member_id: "mem-004", plan_id: "plan-quarterly-pro", plan_name_snapshot: "Quarterly Pro", amount_snapshot: 4999, paid_amount: 4999, due_date: "2026-05-20", paid_date: "2026-05-18", payment_method: "UPI", status: "paid" },
  { id: "fee-010", member_id: "mem-004", plan_id: "plan-quarterly-pro", plan_name_snapshot: "Quarterly Pro", amount_snapshot: 4999, paid_amount: 4999, due_date: "2026-02-20", paid_date: "2026-02-18", payment_method: "UPI", status: "paid" },
  // Vikram Joshi (mem-005) — Monthly Basic, paid
  { id: "fee-011", member_id: "mem-005", plan_id: "plan-monthly-basic", plan_name_snapshot: "Monthly Basic", amount_snapshot: 1999, paid_amount: 1999, due_date: "2026-04-05", paid_date: "2026-04-03", payment_method: "UPI", status: "paid" },
  { id: "fee-012", member_id: "mem-005", plan_id: "plan-monthly-basic", plan_name_snapshot: "Monthly Basic", amount_snapshot: 1999, paid_amount: 1999, due_date: "2026-03-05", paid_date: "2026-03-04", payment_method: "UPI", status: "paid" },
  // Ananya Gupta (mem-006) — Quarterly Pro, due
  { id: "fee-013", member_id: "mem-006", plan_id: "plan-quarterly-pro", plan_name_snapshot: "Quarterly Pro", amount_snapshot: 4999, paid_amount: 0, due_date: "2026-04-01", paid_date: null, payment_method: null, status: "due" },
  // Rohit Mehta (mem-007) — expired, overdue
  { id: "fee-014", member_id: "mem-007", plan_id: "plan-premium-annual", plan_name_snapshot: "Premium Annual", amount_snapshot: 14999, paid_amount: 0, due_date: "2025-04-10", paid_date: null, payment_method: null, status: "overdue" },
  { id: "fee-015", member_id: "mem-007", plan_id: "plan-premium-annual", plan_name_snapshot: "Premium Annual", amount_snapshot: 14999, paid_amount: 14999, due_date: "2024-04-10", paid_date: "2024-04-08", payment_method: "Cash", status: "paid" },
  // Kavita Nair (mem-008) — Monthly Basic, paid
  { id: "fee-016", member_id: "mem-008", plan_id: "plan-monthly-basic", plan_name_snapshot: "Monthly Basic", amount_snapshot: 1999, paid_amount: 1999, due_date: "2026-04-28", paid_date: "2026-04-26", payment_method: "UPI", status: "paid" },
  { id: "fee-017", member_id: "mem-008", plan_id: "plan-monthly-basic", plan_name_snapshot: "Monthly Basic", amount_snapshot: 1999, paid_amount: 1999, due_date: "2026-03-28", paid_date: "2026-03-27", payment_method: "UPI", status: "paid" },
];

// ── Today's Attendance Records (2026-07-29) ──

// ── Today's Attendance Records (2026-07-29) ──
// These simulate a realistic current-day snapshot.
// "today" is derived dynamically at render time via new Date().toISOString().slice(0, 10).

const TODAY = "2026-07-29";

export const MOCK_ATTENDANCE_TODAY: AttendanceRecord[] = [
  // Rahul Sharma (mem-001) — checked out
  { id: "att-today-001", member_id: "mem-001", date: TODAY, check_in: "06:15", check_out: "07:30", status: "present" },
  // Priya Patel (mem-002) — currently inside (no check_out)
  { id: "att-today-002", member_id: "mem-002", date: TODAY, check_in: "07:00", check_out: null, status: "present" },
  // Sneha Reddy (mem-004) — checked out
  { id: "att-today-003", member_id: "mem-004", date: TODAY, check_in: "05:45", check_out: "07:00", status: "present" },
  // Vikram Joshi (mem-005) — currently inside (no check_out)
  { id: "att-today-004", member_id: "mem-005", date: TODAY, check_in: "07:10", check_out: null, status: "present" },
  // Kavita Nair (mem-008) — checked out
  { id: "att-today-005", member_id: "mem-008", date: TODAY, check_in: "06:30", check_out: "07:45", status: "present" },
  // Amit Verma (mem-003) — absent (no record)
  // Ananya Gupta (mem-006) — absent (no record)
  // Rohit Mehta (mem-007) — absent (no record)
];

// ── Helper Functions ────────────────────────────

export function getAttendanceForMember(memberId: string): AttendanceRecord[] {
  return MOCK_ATTENDANCE.filter((a) => a.member_id === memberId);
}

export function getFeesForMember(memberId: string): FeeRecord[] {
  return MOCK_FEES.filter((f) => f.member_id === memberId);
}

export function getMemberById(memberId: string): Member | undefined {
  return MOCK_MEMBERS.find((m) => m.id === memberId);
}

export function getAttendanceSummary(memberId: string) {
  const records = getAttendanceForMember(memberId);
  const total = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  // Calculate streak (consecutive present days from most recent)
  let streak = 0;
  const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  for (const record of sorted) {
    if (record.status === "present") streak++;
    else break;
  }

  return { total, present, percentage, streak, records };
}

export function getUpcomingDue(memberId: string) {
  const fees = getFeesForMember(memberId);
  const pending = fees.filter((f) => f.status === "due" || f.status === "overdue");
  const sorted = pending.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  return sorted[0] ?? null;
}

export function getPlansForMember(memberId: string): Plan[] {
  const fees = getFeesForMember(memberId);
  const paidFees = fees
    .filter((f) => f.status === "paid")
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
  return paidFees.map((f) => {
    const plan = MOCK_PLANS.find((p) => p.id === f.plan_id);
    return plan ?? {
      id: f.plan_id,
      workspace_id: "ws-001",
      name: f.plan_name_snapshot,
      duration: "monthly",
      price: f.amount_snapshot,
      features: [],
      status: "active" as const,
    };
  });
}

export function getPlanById(planId: string): Plan | undefined {
  return MOCK_PLANS.find((p) => p.id === planId);
}

export function getActivePlans(): Plan[] {
  return MOCK_PLANS.filter((p) => p.status === "active");
}

export const MEMBER_FILTERS = [
  { label: "All Members", value: "all" },
  { label: "Fees Due", value: "fee_due" },
  { label: "Low Attendance", value: "low_attendance" },
  { label: "Recently Joined", value: "recent" },
];

// ── Helpers ──────────────────────────────────

export function getAttendanceForToday(): AttendanceRecord[] {
  const today = new Date().toISOString().slice(0, 10);
  return MOCK_ATTENDANCE.filter((a) => a.date === today);
}

// ── Member Plan / Fee Derivation Helpers ──
// Member.plan_name, Member.plan_price, and Member.fee_status were removed
// from the Member type. These helpers derive those values from the
// member's latest FeeRecord (most recent by due_date), so components
// that need plan info compute it at read-time instead.

export function getMemberLatestFee(memberId: string): FeeRecord | null {
  const memberFees = MOCK_FEES.filter((f) => f.member_id === memberId);
  if (memberFees.length === 0) return null;
  return memberFees.sort(
    (a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
  )[0];
}

export function getMemberPlanName(memberId: string): string {
  const latest = getMemberLatestFee(memberId);
  return latest?.plan_name_snapshot ?? "—";
}

export function getMemberPlanPrice(memberId: string): number {
  const latest = getMemberLatestFee(memberId);
  return latest?.amount_snapshot ?? 0;
}

export function getMemberFeeStatus(
  memberId: string
): "paid" | "due" | "overdue" | null {
  const latest = getMemberLatestFee(memberId);
  if (!latest) return null;
  if (latest.status === "paid") return "paid";
  if (latest.status === "overdue") return "overdue";
  return "due";
}
