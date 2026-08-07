import { createServiceClient } from "@/lib/supabase/service";
import { getISTDateString } from "@/lib/utils/date";
import { deriveFeeSummary } from "@/lib/members/fee-status";
import { getMonthlyRevenue } from "@/lib/supabase/queries";
import { getExpensesForMonth } from "@/lib/expenses/queries";
import type { Member, FeeRecord, AttendanceRecord } from "@/lib/members/types";

export interface AttentionItem {
  kind: "overdue" | "due_soon" | "attendance_drop" | "no_plan";
  memberId: string;
  memberName: string;
  detail: string;
}

export interface ActivityItem {
  id: string;
  text: string;
  at: string;
}

export interface HomeOverview {
  activeMembers: number;
  presentToday: number;
  presentTodayPct: number;
  collectedThisMonth: number;
  pendingDues: number;
  /** Revenue for the selected month (cash basis — sum of paid_amount for fees paid that month). */
  revenue: number;
  /** Expenses for the selected month (sum of amount for expenses where status = 'paid' and paid_date in that month). */
  expenses: number;
  /** Selected month/year the revenue/expenses were computed for. */
  month: number;
  year: number;
  attention: AttentionItem[];
  members: {
    totalActive: number;
    newThisMonth: number;
    planBreakdown: { name: string; count: number }[];
  };
  fees: {
    collectedThisMonth: number;
    pendingAmount: number;
    pendingMembers: number;
    overdueAmount: number;
    overdueMembers: number;
  };
  attendance: {
    presentToday: number;
    presentTodayPct: number;
    weekAvgPct: number;
    mostConsistent: { name: string; days: number } | null;
  };
  activity: ActivityItem[];
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function getHomeOverview(
  workspaceId: string,
  month?: number,
  year?: number
): Promise<HomeOverview> {
  const supabase = createServiceClient();
  const today = getISTDateString();
  const monthStart = `${today.slice(0, 7)}-01`;
  const weekStart = shiftDate(today, -6);
  const thirtyDaysAgo = shiftDate(today, -30);

  // Selected month for the Revenue vs Expenses card (defaults to current month).
  const now = new Date();
  const selectedMonth = month ?? now.getMonth() + 1;
  const selectedYear = year ?? now.getFullYear();
  const [revenue, expenses] = await Promise.all([
    getMonthlyRevenue(workspaceId, selectedMonth, selectedYear),
    getExpensesForMonth(workspaceId, selectedMonth, selectedYear),
  ]);

  const [membersRes, feesRes, attendanceRes] = await Promise.all([
    supabase
      .from("members")
      .select("*, plan:plans!members_plan_id_fkey(name, duration)")
      .eq("workspace_id", workspaceId),
    supabase.from("fees").select("*").eq("workspace_id", workspaceId),
    supabase
      .from("attendance")
      .select("*")
      .eq("workspace_id", workspaceId)
      .gte("date", thirtyDaysAgo),
  ]);

  const members = (membersRes.data ?? []) as Member[];
  const fees = (feesRes.data ?? []) as FeeRecord[];
  const attendance = (attendanceRes.data ?? []) as (AttendanceRecord & {
    created_at?: string;
  })[];

  const feesByMember = new Map<string, FeeRecord[]>();
  for (const f of fees) {
    const list = feesByMember.get(f.member_id) ?? [];
    list.push(f);
    feesByMember.set(f.member_id, list);
  }

  // ── snapshot strip ────────────────────────────────────────────
  const presentTodayIds = new Set(
    attendance.filter((a) => a.date === today && a.status === "present").map((a) => a.member_id)
  );
  const presentToday = presentTodayIds.size;
  const activeMembers = members.length;
  const presentTodayPct = activeMembers
    ? Math.round((presentToday / activeMembers) * 100)
    : 0;

  const collectedThisMonth = fees
    .filter((f) => f.paid_date && f.paid_date >= monthStart && f.paid_date <= today)
    .reduce((sum, f) => sum + (f.paid_amount ?? 0), 0);

  // ── per-member fee state ──────────────────────────────────────
  const attention: AttentionItem[] = [];
  let pendingDues = 0;
  let overdueAmount = 0;
  const pendingMemberIds = new Set<string>();
  const overdueMemberIds = new Set<string>();
  const planCounts = new Map<string, number>();
  let newThisMonth = 0;
  const dueSoonCutoff = shiftDate(today, 7);

  for (const m of members) {
    if (m.joined_at && m.joined_at.slice(0, 10) >= monthStart) newThisMonth++;

    const planName = m.plan?.name ?? null;
    if (planName) planCounts.set(planName, (planCounts.get(planName) ?? 0) + 1);

    const summary = deriveFeeSummary(m, feesByMember.get(m.id) ?? [], today);

    if (summary.status === "no_plan") {
      attention.push({
        kind: "no_plan",
        memberId: m.id,
        memberName: m.name,
        detail: "No plan assigned",
      });
      continue;
    }

    const outstanding = summary.totalPending;
    if (outstanding > 0) {
      pendingDues += outstanding;
      pendingMemberIds.add(m.id);
    }

    if (summary.status === "overdue") {
      overdueAmount += outstanding;
      overdueMemberIds.add(m.id);
      attention.push({
        kind: "overdue",
        memberId: m.id,
        memberName: m.name,
        detail: `₹${outstanding.toLocaleString("en-IN")} overdue since ${summary.dueDate}`,
      });
    } else if (
      summary.status === "due" &&
      summary.dueDate &&
      summary.dueDate <= dueSoonCutoff
    ) {
      attention.push({
        kind: "due_soon",
        memberId: m.id,
        memberName: m.name,
        detail: `₹${(outstanding || summary.amount || 0).toLocaleString("en-IN")} due on ${summary.dueDate}`,
      });
    }
  }

  // ── attendance rollups ────────────────────────────────────────
  const weekRecords = attendance.filter((a) => a.date >= weekStart);
  const weekDays = new Set(weekRecords.map((a) => a.date));
  const weekPresent = weekRecords.filter((a) => a.status === "present").length;
  const weekAvgPct =
    activeMembers && weekDays.size
      ? Math.round((weekPresent / (activeMembers * weekDays.size)) * 100)
      : 0;

  const presentDaysByMember = new Map<string, number>();
  for (const a of attendance) {
    if (a.status !== "present") continue;
    presentDaysByMember.set(a.member_id, (presentDaysByMember.get(a.member_id) ?? 0) + 1);
  }

  let mostConsistent: { name: string; days: number } | null = null;
  for (const [memberId, days] of presentDaysByMember) {
    const member = members.find((m) => m.id === memberId);
    if (!member) continue;
    if (!mostConsistent || days > mostConsistent.days) {
      mostConsistent = { name: member.name, days };
    }
  }

  // Members present far below the group average are worth a nudge.
  for (const m of members) {
    const days = presentDaysByMember.get(m.id) ?? 0;
    if (weekDays.size >= 3 && days === 0) {
      attention.push({
        kind: "attendance_drop",
        memberId: m.id,
        memberName: m.name,
        detail: "No check-in in the last 30 days",
      });
    }
  }

  // ── recent activity ───────────────────────────────────────────
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "A member";

  const activity: ActivityItem[] = [
    ...fees
      .filter((f) => f.status === "paid" && f.paid_date)
      .map((f) => ({
        id: `fee-${f.id}`,
        at: f.paid_date!,
        text: `${nameOf(f.member_id)} — fee marked paid ₹${(f.paid_amount ?? 0).toLocaleString("en-IN")}`,
      })),
    ...attendance
      .filter((a) => a.status === "present")
      .map((a) => ({
        id: `att-${a.id}`,
        at: a.check_in ?? a.date,
        text: `${nameOf(a.member_id)} marked present`,
      })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 6);

  const planBreakdown = [...planCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const attentionOrder = { overdue: 0, due_soon: 1, no_plan: 2, attendance_drop: 3 };
  attention.sort((a, b) => attentionOrder[a.kind] - attentionOrder[b.kind]);

  return {
    activeMembers,
    presentToday,
    presentTodayPct,
    collectedThisMonth,
    pendingDues,
    revenue,
    expenses,
    month: selectedMonth,
    year: selectedYear,
    attention,
    members: { totalActive: activeMembers, newThisMonth, planBreakdown },
    fees: {
      collectedThisMonth,
      pendingAmount: pendingDues,
      pendingMembers: pendingMemberIds.size,
      overdueAmount,
      overdueMembers: overdueMemberIds.size,
    },
    attendance: {
      presentToday,
      presentTodayPct,
      weekAvgPct,
      mostConsistent,
    },
    activity,
  };
}
