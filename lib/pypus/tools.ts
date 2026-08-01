import type { createClient } from "@/lib/supabase/server";
import { getISTDateString, formatISTTime } from "@/lib/utils/date";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface PypusTool {
  name: string;
  description: string;
  parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  run: (ctx: ToolContext, args: Record<string, unknown>) => Promise<unknown>;
}

interface ToolContext {
  supabase: Supabase;
  workspaceId: string;
}

// ── date helpers (all IST-anchored) ───────────────────────────────

const IST_OFFSET = "+05:30";
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function istParts() {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Shift a 'YYYY-MM-DD' string by a whole number of days. */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function weekdayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** monthOffset 0 = current IST month, -1 = previous. Returns inclusive date bounds. */
function monthRange(monthOffset = 0) {
  const { year, month } = istParts();
  const start = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
  const next = new Date(Date.UTC(year, month + monthOffset, 1));
  return {
    label: `${start.getUTCFullYear()}-${pad(start.getUTCMonth() + 1)}`,
    start: start.toISOString().slice(0, 10),
    endExclusive: next.toISOString().slice(0, 10),
    end: shiftDate(next.toISOString().slice(0, 10), -1),
  };
}

function weekStart(): string {
  const { year, month, day } = istParts();
  const now = new Date(Date.UTC(year, month - 1, day));
  return shiftDate(now.toISOString().slice(0, 10), -((now.getUTCDay() + 6) % 7));
}

function today(): string {
  return getISTDateString();
}

function daysBetween(from: string, to: string): number {
  const [ay, am, ad] = from.split("-").map(Number);
  const [by, bm, bd] = to.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** timestamptz bounds for an inclusive-start / exclusive-end IST date window */
function tsRange(startDate: string, endExclusive: string) {
  return { from: `${startDate}T00:00:00${IST_OFFSET}`, to: `${endExclusive}T00:00:00${IST_OFFSET}` };
}

const outstandingOf = (f: { amount_snapshot: number | null; paid_amount: number | null }) =>
  (f.amount_snapshot ?? 0) - (f.paid_amount ?? 0);

// ── shared loaders ────────────────────────────────────────────────

interface MemberRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  plan_id: string | null;
  trainer_id: string | null;
  joined_at: string | null;
}

async function loadMembers({ supabase, workspaceId }: ToolContext): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from("members")
    .select("id, name, email, phone, plan_id, trainer_id, joined_at")
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  return data ?? [];
}

async function loadPlanNames({ supabase, workspaceId }: ToolContext) {
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, duration, price")
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.id, p]));
}

/**
 * Members are addressed by name in chat, so every member-scoped tool resolves a
 * free-text name first. Ambiguity is returned to the model rather than guessed.
 */
async function resolveMember(ctx: ToolContext, rawName: unknown) {
  const query = String(rawName ?? "").trim().toLowerCase();
  if (!query) return { error: "member_name is required" as const };

  const members = await loadMembers(ctx);
  const exact = members.filter((m) => m.name.toLowerCase() === query);
  const partial = members.filter((m) => m.name.toLowerCase().includes(query));
  const byToken = members.filter((m) =>
    query.split(/\s+/).some((t) => t.length > 2 && m.name.toLowerCase().split(/\s+/).includes(t))
  );
  const hits = exact.length ? exact : partial.length ? partial : byToken;

  if (!hits.length) {
    return {
      error: "member_not_found" as const,
      searched: String(rawName ?? ""),
      availableMembers: members.map((m) => m.name),
    };
  }
  if (hits.length > 1) {
    return { error: "ambiguous_member" as const, matches: hits.map((m) => m.name) };
  }
  return { member: hits[0] };
}

// ── MEMBERS tools ─────────────────────────────────────────────────

const membersOverview: PypusTool = {
  name: "get_members_overview",
  description:
    "Roster-wide member facts: total active members, how many joined this month, the oldest member by join date, members with no plan assigned, per-plan member counts, and trainer assignment counts. Use for any question about member totals, joins, plan grouping, or trainers.",
  parameters: { type: "object", properties: {} },
  async run(ctx) {
    const [members, plans] = await Promise.all([loadMembers(ctx), loadPlanNames(ctx)]);
    const month = monthRange(0);
    const joinedDate = (m: MemberRow) => (m.joined_at ? getISTDateString(new Date(m.joined_at)) : null);

    const withJoin = members.filter((m) => joinedDate(m));
    const oldest = withJoin.sort((a, b) => joinedDate(a)!.localeCompare(joinedDate(b)!))[0];

    const perPlan = new Map<string, string[]>();
    for (const m of members) {
      const label = m.plan_id ? plans.get(m.plan_id)?.name ?? "Unknown plan" : "No plan assigned";
      perPlan.set(label, [...(perPlan.get(label) ?? []), m.name]);
    }

    const trainerIds = members.map((m) => m.trainer_id).filter(Boolean);

    return {
      totalActiveMembers: members.length,
      joinedThisMonth: {
        month: month.label,
        count: withJoin.filter((m) => joinedDate(m)! >= month.start && joinedDate(m)! <= month.end).length,
        members: withJoin
          .filter((m) => joinedDate(m)! >= month.start && joinedDate(m)! <= month.end)
          .map((m) => ({ name: m.name, joinedOn: joinedDate(m) })),
      },
      oldestMember: oldest ? { name: oldest.name, joinedOn: joinedDate(oldest) } : null,
      membersWithoutPlan: members.filter((m) => !m.plan_id).map((m) => m.name),
      membersByPlan: Object.fromEntries(
        [...perPlan].map(([plan, names]) => [plan, { count: names.length, members: names }])
      ),
      trainerAssignment: trainerIds.length
        ? { assignedCount: trainerIds.length, note: "trainer_id values exist but trainer names are not stored in this workspace" }
        : { tracked: false, note: "No member has a trainer assigned — this workspace does not track trainers yet." },
    };
  },
};

const memberProfile: PypusTool = {
  name: "get_member_profile",
  description:
    "Full profile of one member by name: phone, email, plan, join date, trainer, and current fee status. Use for questions about a single member's contact details, plan, join date or profile.",
  parameters: {
    type: "object",
    properties: { member_name: { type: "string", description: "Member name as the user typed it" } },
    required: ["member_name"],
  },
  async run(ctx, args) {
    const found = await resolveMember(ctx, args.member_name);
    if ("error" in found) return found;
    const { member } = found;

    const [plans, feesRes] = await Promise.all([
      loadPlanNames(ctx),
      ctx.supabase
        .from("fees")
        .select("plan_name_snapshot, amount_snapshot, paid_amount, due_date, paid_date, status, payment_method")
        .eq("workspace_id", ctx.workspaceId)
        .eq("member_id", member.id)
        .order("due_date", { ascending: false }),
    ]);
    if (feesRes.error) throw feesRes.error;
    const fees = feesRes.data ?? [];

    return {
      name: member.name,
      phone: member.phone,
      email: member.email,
      plan: member.plan_id ? plans.get(member.plan_id)?.name ?? "Unknown plan" : null,
      joinedOn: member.joined_at ? getISTDateString(new Date(member.joined_at)) : null,
      trainer: member.trainer_id ? "assigned (name not stored)" : "not assigned",
      currentFeeStatus: fees[0]?.status ?? "no fee record",
      totalOutstanding: fees.reduce((s, f) => s + outstandingOf(f), 0),
      lastPayment: fees
        .filter((f) => f.paid_date)
        .sort((a, b) => b.paid_date!.localeCompare(a.paid_date!))
        .map((f) => ({ paidOn: f.paid_date, amount: f.paid_amount, method: f.payment_method }))[0] ?? null,
    };
  },
};

const plansCatalog: PypusTool = {
  name: "get_plans",
  description: "The workspace's plan catalogue: name, duration and price of each plan.",
  parameters: { type: "object", properties: {} },
  async run(ctx) {
    const plans = await loadPlanNames(ctx);
    return { plans: [...plans.values()].map((p) => ({ name: p.name, duration: p.duration, price: p.price })) };
  },
};

// ── FEES tools ────────────────────────────────────────────────────

const feesSummary: PypusTool = {
  name: "get_fees_summary",
  description:
    "Fee totals for a month: collected amount, expected amount, collection split by payment method, and count/amount of pending (due + overdue) fees. Pass month_offset 0 for this month and -1 for last month; call twice to compare months.",
  parameters: {
    type: "object",
    properties: {
      month_offset: {
        type: "integer",
        description: "0 = current IST month (default), -1 = previous month, -2 = two months ago",
      },
    },
  },
  async run(ctx, args) {
    const offset = Number(args.month_offset ?? 0);
    const month = monthRange(Number.isFinite(offset) ? offset : 0);

    const [paidRes, expectedRes, pendingRes] = await Promise.all([
      ctx.supabase
        .from("fees")
        .select("paid_amount, payment_method, paid_date")
        .eq("workspace_id", ctx.workspaceId)
        .gte("paid_date", month.start)
        .lte("paid_date", month.end),
      ctx.supabase
        .from("fees")
        .select("amount_snapshot")
        .eq("workspace_id", ctx.workspaceId)
        .gte("due_date", month.start)
        .lte("due_date", month.end),
      ctx.supabase
        .from("fees")
        .select("member_id, amount_snapshot, paid_amount, status")
        .eq("workspace_id", ctx.workspaceId)
        .in("status", ["due", "overdue"]),
    ]);
    const err = paidRes.error || expectedRes.error || pendingRes.error;
    if (err) throw err;

    const paid = paidRes.data ?? [];
    const pending = pendingRes.data ?? [];

    const byMethod: Record<string, number> = {};
    for (const p of paid) {
      const key = p.payment_method ?? "Unrecorded";
      byMethod[key] = (byMethod[key] ?? 0) + (p.paid_amount ?? 0);
    }

    return {
      month: month.label,
      currency: "INR",
      collected: paid.reduce((s, p) => s + (p.paid_amount ?? 0), 0),
      expected: (expectedRes.data ?? []).reduce((s, f) => s + (f.amount_snapshot ?? 0), 0),
      collectionByPaymentMethod: byMethod,
      pendingNow: {
        memberCount: new Set(pending.map((f) => f.member_id)).size,
        dueCount: pending.filter((f) => f.status === "due").length,
        overdueCount: pending.filter((f) => f.status === "overdue").length,
        totalOutstanding: pending.reduce((s, f) => s + outstandingOf(f), 0),
      },
    };
  },
};

const pendingFees: PypusTool = {
  name: "get_pending_fees",
  description:
    "Unpaid fees split into two lists: 'overdue' (due date already passed, with days overdue) and 'dueButNotYetOverdue' (due date still in the future), each with the member and outstanding amount, highest first. Also flags members who have no fee record at all. Use for pending/overdue lists and 'who owes most'.",
  parameters: {
    type: "object",
    properties: {
      min_days_overdue: { type: "integer", description: "Only include fees overdue by more than this many days" },
    },
  },
  async run(ctx, args) {
    const [members, feesRes] = await Promise.all([
      loadMembers(ctx),
      ctx.supabase
        .from("fees")
        .select("member_id, plan_name_snapshot, amount_snapshot, paid_amount, due_date, status")
        .eq("workspace_id", ctx.workspaceId),
    ]);
    if (feesRes.error) throw feesRes.error;

    const allFees = feesRes.data ?? [];
    const nameById = new Map(members.map((m) => [m.id, m.name]));
    const now = today();
    const minDays = Number(args.min_days_overdue ?? 0);

    const rows = allFees
      .filter((f) => f.status === "due" || f.status === "overdue")
      .map((f) => ({
        member: nameById.get(f.member_id) ?? "Unknown member",
        plan: f.plan_name_snapshot,
        outstanding: outstandingOf(f),
        dueDate: f.due_date,
        daysOverdue: f.due_date && f.due_date < now ? daysBetween(f.due_date, now) : 0,
        status: f.status,
      }))
      .filter((r) => (Number.isFinite(minDays) && minDays > 0 ? r.daysOverdue > minDays : true))
      .sort((a, b) => b.outstanding - a.outstanding);

    const withFees = new Set(allFees.map((f) => f.member_id));

    return {
      currency: "INR",
      pendingCount: rows.length,
      totalOutstanding: rows.reduce((s, r) => s + r.outstanding, 0),
      overdue: rows.filter((r) => r.daysOverdue > 0),
      dueButNotYetOverdue: rows.filter((r) => r.daysOverdue === 0),
      membersWithNoFeeRecord: members.filter((m) => !withFees.has(m.id)).map((m) => m.name),
    };
  },
};

const revenueByPlan: PypusTool = {
  name: "get_revenue_by_plan",
  description:
    "Total amount actually collected per plan, all-time, based on the plan name snapshot on each fee record. Use for 'revenue from <plan>' questions.",
  parameters: { type: "object", properties: {} },
  async run(ctx) {
    const { data, error } = await ctx.supabase
      .from("fees")
      .select("plan_name_snapshot, paid_amount, member_id")
      .eq("workspace_id", ctx.workspaceId)
      .gt("paid_amount", 0);
    if (error) throw error;

    const perPlan = new Map<string, { collected: number; members: Set<string> }>();
    for (const f of data ?? []) {
      const key = f.plan_name_snapshot ?? "Unknown plan";
      const entry = perPlan.get(key) ?? { collected: 0, members: new Set<string>() };
      entry.collected += f.paid_amount ?? 0;
      entry.members.add(f.member_id);
      perPlan.set(key, entry);
    }

    return {
      currency: "INR",
      revenueByPlan: Object.fromEntries(
        [...perPlan].map(([plan, v]) => [plan, { collected: v.collected, payingMembers: v.members.size }])
      ),
    };
  },
};

const paymentPunctuality: PypusTool = {
  name: "get_payment_punctuality",
  description:
    "Splits members into those who always paid on or before the due date this year and those who paid late at least once (with how many days late). Use for 'who never paid late' or payment-discipline questions.",
  parameters: { type: "object", properties: {} },
  async run(ctx) {
    const { year } = istParts();
    const [members, feesRes] = await Promise.all([
      loadMembers(ctx),
      ctx.supabase
        .from("fees")
        .select("member_id, due_date, paid_date, status")
        .eq("workspace_id", ctx.workspaceId)
        .gte("due_date", `${year}-01-01`)
        .lte("due_date", `${year}-12-31`),
    ]);
    if (feesRes.error) throw feesRes.error;

    const nameById = new Map(members.map((m) => [m.id, m.name]));
    const perMember = new Map<string, { late: number; maxDaysLate: number; total: number }>();
    for (const f of feesRes.data ?? []) {
      const e = perMember.get(f.member_id) ?? { late: 0, maxDaysLate: 0, total: 0 };
      e.total++;
      const lateDays = f.paid_date && f.due_date && f.paid_date > f.due_date ? daysBetween(f.due_date, f.paid_date) : 0;
      const stillLate = f.status === "overdue" && f.due_date ? daysBetween(f.due_date, today()) : 0;
      const worst = Math.max(lateDays, stillLate);
      if (worst > 0) {
        e.late++;
        e.maxDaysLate = Math.max(e.maxDaysLate, worst);
      }
      perMember.set(f.member_id, e);
    }

    return {
      year,
      neverLate: [...perMember]
        .filter(([, v]) => v.late === 0)
        .map(([id, v]) => ({ member: nameById.get(id) ?? "Unknown member", feeCycles: v.total })),
      paidLate: [...perMember]
        .filter(([, v]) => v.late > 0)
        .map(([id, v]) => ({ member: nameById.get(id) ?? "Unknown member", lateCycles: v.late, maxDaysLate: v.maxDaysLate })),
      membersWithNoFeeCycleThisYear: members
        .filter((m) => !perMember.has(m.id))
        .map((m) => m.name),
    };
  },
};

const memberFeeHistory: PypusTool = {
  name: "get_member_fee_history",
  description:
    "One member's full fee history: every cycle with amount, due date, paid date, method and status, plus their last payment. Use for 'when did X last pay' or 'X ka fees history'.",
  parameters: {
    type: "object",
    properties: { member_name: { type: "string" } },
    required: ["member_name"],
  },
  async run(ctx, args) {
    const found = await resolveMember(ctx, args.member_name);
    if ("error" in found) return found;

    const { data, error } = await ctx.supabase
      .from("fees")
      .select("plan_name_snapshot, amount_snapshot, paid_amount, due_date, paid_date, payment_method, status")
      .eq("workspace_id", ctx.workspaceId)
      .eq("member_id", found.member.id)
      .order("due_date", { ascending: false });
    if (error) throw error;

    const rows = data ?? [];
    const payments = rows.filter((f) => f.paid_date).sort((a, b) => b.paid_date!.localeCompare(a.paid_date!));

    return {
      member: found.member.name,
      currency: "INR",
      lastPayment: payments[0]
        ? { paidOn: payments[0].paid_date, amount: payments[0].paid_amount, method: payments[0].payment_method }
        : null,
      totalOutstanding: rows.reduce((s, f) => s + outstandingOf(f), 0),
      cycles: rows.map((f) => ({
        plan: f.plan_name_snapshot,
        amount: f.amount_snapshot,
        paid: f.paid_amount,
        dueDate: f.due_date,
        paidDate: f.paid_date,
        method: f.payment_method,
        status: f.status,
      })),
    };
  },
};

// ── ATTENDANCE tools ──────────────────────────────────────────────

const attendanceToday: PypusTool = {
  name: "get_attendance_today",
  description:
    "Today's attendance: who is present with their check-in time, who is marked absent, and who has no record yet.",
  parameters: { type: "object", properties: {} },
  async run(ctx) {
    const now = today();
    const [members, attRes] = await Promise.all([
      loadMembers(ctx),
      ctx.supabase
        .from("attendance")
        .select("member_id, status, check_in, check_out")
        .eq("workspace_id", ctx.workspaceId)
        .eq("date", now),
    ]);
    if (attRes.error) throw attRes.error;

    const nameById = new Map(members.map((m) => [m.id, m.name]));
    const rows = attRes.data ?? [];
    const marked = new Set(rows.map((r) => r.member_id));

    return {
      date: now,
      weekday: weekdayOf(now),
      totalActiveMembers: members.length,
      present: rows
        .filter((r) => r.status === "present")
        .map((r) => ({
          member: nameById.get(r.member_id) ?? "Unknown member",
          checkIn: r.check_in ? formatISTTime(r.check_in) : null,
          checkOut: r.check_out ? formatISTTime(r.check_out) : null,
        })),
      absent: rows.filter((r) => r.status === "absent").map((r) => nameById.get(r.member_id) ?? "Unknown member"),
      noRecordYet: members.filter((m) => !marked.has(m.id)).map((m) => m.name),
    };
  },
};

const attendanceStats: PypusTool = {
  name: "get_attendance_stats",
  description:
    "Gym-wide attendance analytics over a period: total check-ins, present vs absent ratio, per-member present/absent counts (to find most absent or most consistent), longest present streak per member, busiest check-in hour slots, per-weekday averages, and weekend vs weekday averages. Use period 'week' (current week), 'month' (current IST month), or 'last_30_days'.",
  parameters: {
    type: "object",
    properties: {
      period: { type: "string", enum: ["week", "month", "last_30_days"], description: "Defaults to month" },
    },
  },
  async run(ctx, args) {
    const period = String(args.period ?? "month");
    const now = today();
    const start =
      period === "week" ? weekStart() : period === "last_30_days" ? shiftDate(now, -29) : monthRange(0).start;

    const [members, attRes] = await Promise.all([
      loadMembers(ctx),
      ctx.supabase
        .from("attendance")
        .select("member_id, date, status, check_in")
        .eq("workspace_id", ctx.workspaceId)
        .gte("date", start)
        .lte("date", now)
        .order("date", { ascending: true }),
    ]);
    if (attRes.error) throw attRes.error;

    const nameById = new Map(members.map((m) => [m.id, m.name]));
    const rows = attRes.data ?? [];
    const present = rows.filter((r) => r.status === "present");
    const absent = rows.filter((r) => r.status === "absent");

    const perMember = new Map<string, { present: number; absent: number; dates: string[] }>();
    for (const r of rows) {
      const e = perMember.get(r.member_id) ?? { present: 0, absent: 0, dates: [] };
      if (r.status === "present") {
        e.present++;
        e.dates.push(r.date);
      } else if (r.status === "absent") e.absent++;
      perMember.set(r.member_id, e);
    }

    const longestStreak = (dates: string[]) => {
      const sorted = [...new Set(dates)].sort();
      let best = 0;
      let run = 0;
      let prev: string | null = null;
      for (const d of sorted) {
        run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
        prev = d;
        best = Math.max(best, run);
      }
      return best;
    };

    const hourBuckets: Record<string, number> = {};
    for (const r of present) {
      if (!r.check_in) continue;
      const hour = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        hour12: false,
      }).format(new Date(r.check_in));
      const slot = `${hour}:00-${pad((Number(hour) + 1) % 24)}:00`;
      hourBuckets[slot] = (hourBuckets[slot] ?? 0) + 1;
    }

    const perWeekday = new Map<string, { checkIns: number; days: Set<string> }>();
    for (const r of present) {
      const wd = weekdayOf(r.date);
      const e = perWeekday.get(wd) ?? { checkIns: 0, days: new Set<string>() };
      e.checkIns++;
      e.days.add(r.date);
      perWeekday.set(wd, e);
    }
    const weekdayAvg = Object.fromEntries(
      [...perWeekday].map(([wd, v]) => [wd, { totalCheckIns: v.checkIns, avgPerDay: +(v.checkIns / v.days.size).toFixed(1) }])
    );

    const isWeekend = (d: string) => ["Saturday", "Sunday"].includes(weekdayOf(d));
    const weekendDays = new Set(present.filter((r) => isWeekend(r.date)).map((r) => r.date));
    const weekdayDays = new Set(present.filter((r) => !isWeekend(r.date)).map((r) => r.date));
    const weekendCheckIns = present.filter((r) => isWeekend(r.date)).length;
    const weekdayCheckIns = present.length - weekendCheckIns;

    const memberStats = [...perMember].map(([id, v]) => ({
      member: nameById.get(id) ?? "Unknown member",
      present: v.present,
      absent: v.absent,
      attendancePercent: v.present + v.absent ? Math.round((v.present / (v.present + v.absent)) * 100) : 0,
      longestPresentStreak: longestStreak(v.dates),
    }));

    return {
      period,
      from: start,
      to: now,
      totalCheckIns: present.length,
      presentRecords: present.length,
      absentRecords: absent.length,
      presentToAbsentRatio: absent.length ? +(present.length / absent.length).toFixed(2) : null,
      memberStats: memberStats.sort((a, b) => b.present - a.present),
      mostAbsent: [...memberStats].sort((a, b) => b.absent - a.absent).filter((m) => m.absent > 0).slice(0, 3),
      mostConsistent: [...memberStats].sort(
        (a, b) => b.longestPresentStreak - a.longestPresentStreak || b.present - a.present
      )[0] ?? null,
      checkInSlots: Object.fromEntries(Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])),
      perWeekday: weekdayAvg,
      weekendVsWeekday: {
        weekendAvgCheckIns: weekendDays.size ? +(weekendCheckIns / weekendDays.size).toFixed(1) : 0,
        weekdayAvgCheckIns: weekdayDays.size ? +(weekdayCheckIns / weekdayDays.size).toFixed(1) : 0,
      },
    };
  },
};

const memberAttendance: PypusTool = {
  name: "get_member_attendance",
  description:
    "One member's attendance detail: day-by-day records with check-in/check-out times, attendance percentage, present/absent counts and longest streak. Use for a single member's history, their attendance %, a specific day's timings, or (by calling twice) to compare two members.",
  parameters: {
    type: "object",
    properties: {
      member_name: { type: "string" },
      period: { type: "string", enum: ["month", "last_30_days", "week"], description: "Defaults to month" },
    },
    required: ["member_name"],
  },
  async run(ctx, args) {
    const found = await resolveMember(ctx, args.member_name);
    if ("error" in found) return found;

    const period = String(args.period ?? "month");
    const now = today();
    const start =
      period === "week" ? weekStart() : period === "last_30_days" ? shiftDate(now, -29) : monthRange(0).start;

    const { data, error } = await ctx.supabase
      .from("attendance")
      .select("date, status, check_in, check_out")
      .eq("workspace_id", ctx.workspaceId)
      .eq("member_id", found.member.id)
      .gte("date", start)
      .lte("date", now)
      .order("date", { ascending: false });
    if (error) throw error;

    const rows = data ?? [];
    const presentDates = rows.filter((r) => r.status === "present").map((r) => r.date).sort();
    let best = 0;
    let run = 0;
    let prev: string | null = null;
    for (const d of presentDates) {
      run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
      prev = d;
      best = Math.max(best, run);
    }

    return {
      member: found.member.name,
      period,
      from: start,
      to: now,
      presentDays: presentDates.length,
      absentDays: rows.filter((r) => r.status === "absent").length,
      attendancePercent: rows.length ? Math.round((presentDates.length / rows.length) * 100) : 0,
      longestPresentStreak: best,
      records: rows.map((r) => ({
        date: r.date,
        weekday: weekdayOf(r.date),
        status: r.status,
        checkIn: r.check_in ? formatISTTime(r.check_in) : null,
        checkOut: r.check_out ? formatISTTime(r.check_out) : null,
      })),
    };
  },
};

const inactiveMembers: PypusTool = {
  name: "get_inactive_members",
  description:
    "Members with no present check-in in the last N days (default 14), with the date they were last seen. Use for 'inactive members' or 'kaun nahi aa raha' questions.",
  parameters: {
    type: "object",
    properties: { days: { type: "integer", description: "Look-back window in days, default 14" } },
  },
  async run(ctx, args) {
    const days = Number.isFinite(Number(args.days)) && Number(args.days) > 0 ? Number(args.days) : 14;
    const now = today();
    const cutoff = shiftDate(now, -(days - 1));

    const [members, attRes] = await Promise.all([
      loadMembers(ctx),
      ctx.supabase
        .from("attendance")
        .select("member_id, date, status")
        .eq("workspace_id", ctx.workspaceId)
        .eq("status", "present"),
    ]);
    if (attRes.error) throw attRes.error;

    const lastSeen = new Map<string, string>();
    for (const r of attRes.data ?? []) {
      const cur = lastSeen.get(r.member_id);
      if (!cur || r.date > cur) lastSeen.set(r.member_id, r.date);
    }

    return {
      windowDays: days,
      since: cutoff,
      inactive: members
        .filter((m) => {
          const seen = lastSeen.get(m.id);
          return !seen || seen < cutoff;
        })
        .map((m) => ({
          member: m.name,
          lastSeen: lastSeen.get(m.id) ?? "never",
          daysSinceLastVisit: lastSeen.get(m.id) ? daysBetween(lastSeen.get(m.id)!, now) : null,
        }))
        .sort((a, b) => (b.daysSinceLastVisit ?? 9999) - (a.daysSinceLastVisit ?? 9999)),
    };
  },
};

export const PYPUS_TOOLS: PypusTool[] = [
  membersOverview,
  memberProfile,
  plansCatalog,
  feesSummary,
  pendingFees,
  revenueByPlan,
  paymentPunctuality,
  memberFeeHistory,
  attendanceToday,
  attendanceStats,
  memberAttendance,
  inactiveMembers,
];

export async function runPypusTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<unknown> {
  const tool = PYPUS_TOOLS.find((t) => t.name === name);
  if (!tool) return { error: `Unknown tool "${name}"` };
  try {
    return await tool.run(ctx, args);
  } catch (err) {
    console.error(`pypus tool ${name} failed`, err);
    return { error: `Tool "${name}" could not read the database.` };
  }
}
