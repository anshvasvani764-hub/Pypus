// ──────────────────────────────────────────────
// Member Module — TypeScript types
// Mirrors future Supabase schema for easy swap
// NOTE: plan_name, plan_price, fee_status are DERIVED
// at read-time from the member's latest fees record.
// They are NOT stored directly on the member record.
// ──────────────────────────────────────────────

export type MembershipStatus = "active" | "expired";
export type FeeStatus = "paid" | "due";
export type AttendanceStatus = "present" | "absent";
export type PaymentStatus = "completed" | "pending" | "overdue";
export type PlanDuration = "monthly" | "quarterly" | "yearly";
export type SubscriptionStatus = "paid" | "due" | "overdue";

export interface Member {
  id: string;
  workspace_id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  trainer_id: string | null;
  trainer_name: string | null;
  joined_at: string; // ISO date
  plan_id?: string | null;
  plan?: { name: string; duration?: PlanDuration } | null;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  member_id: string;
  date: string; // ISO date
  check_in: string | null; // ISO datetime (timestamptz)
  check_out: string | null; // ISO datetime (timestamptz)
  status: AttendanceStatus;
}

export interface Plan {
  id: string;
  workspace_id: string;
  name: string;
  duration: PlanDuration;
  price: number;
  features: string[];
  status: "active" | "inactive";
}

export interface FeeRecord {
  id: string;
  member_id: string;
  plan_id: string;
  plan_name_snapshot: string;
  amount_snapshot: number;
  paid_amount: number;
  due_date: string; // ISO date
  paid_date: string | null; // ISO date
  payment_method: string | null; // "UPI" | "Cash" | "Bank Transfer" | null
  status: SubscriptionStatus;
}

export interface PaymentReminder {
  id: string;
  member_id: string;
  sent_at: string;
  type: "whatsapp" | "email" | "sms";
  message: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  percentage: number;
  streak: number;
  records: AttendanceRecord[];
}

export interface MemberFilter {
  label: string;
  value: string;
  icon?: string;
}
