import {
  type PypusTool,
  outstandingOf,
  loadMembers,
  loadPlanNames,
  resolveMember,
  monthRange,
  istParts,
  today,
  daysBetween,
  shiftDate,
  needsConfirmation,
} from "./shared";
import { savePlan, deletePlan as deletePlanAction } from "@/app/actions/settings";
import { assignPlanToMember as assignPlanToMemberAction } from "@/app/actions/member-plan";
import { daysForDuration, durationLabel } from "@/lib/members/plan-duration";

const plansCatalog: PypusTool = {
  name: "get_plans",
  riskLevel: "low",
  description: "The workspace's plan catalogue: name, duration and price of each plan.",
  parameters: { type: "object", properties: {} },
  async run(ctx) {
    const plans = await loadPlanNames(ctx);
    return { plans: [...plans.values()].map((p) => ({ name: p.name, duration: p.duration, price: p.price })) };
  },
};

const feesSummary: PypusTool = {
  name: "get_fees_summary",
  riskLevel: "low",
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
  riskLevel: "low",
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
  riskLevel: "low",
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
  riskLevel: "low",
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
  riskLevel: "low",
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

// ── WRITE ───────────────────────────────────────────────────────────

const recordFeePayment: PypusTool = {
  name: "record_fee_payment",
  riskLevel: "low",
  description:
    "Records a payment against a member's most urgent due/overdue fee (marks it paid, partially or fully). Executes immediately — reversible via update_fee_payment/delete_fee_payment if needed, so no confirmation step. Confirm in one line what was recorded (amount, resulting status, remaining balance).",
  parameters: {
    type: "object",
    properties: {
      member_name: { type: "string" },
      amount: { type: "number", description: "Amount being paid now, in rupees" },
      payment_method: { type: "string", description: "e.g. Cash, UPI, Card. Defaults to Cash." },
    },
    required: ["member_name", "amount"],
  },
  async run(ctx, args) {
    const found = await resolveMember(ctx, args.member_name);
    if ("error" in found) return found;

    const amount = Number(args.amount);
    if (!Number.isFinite(amount) || amount <= 0) return { error: "amount must be a positive number" };
    const paymentMethod = typeof args.payment_method === "string" && args.payment_method.trim()
      ? args.payment_method.trim()
      : "Cash";

    const { data: fees, error: feesErr } = await ctx.supabase
      .from("fees")
      .select("id, plan_name_snapshot, amount_snapshot, paid_amount, due_date, status")
      .eq("workspace_id", ctx.workspaceId)
      .eq("member_id", found.member.id)
      .in("status", ["due", "overdue"])
      .order("due_date", { ascending: true })
      .limit(1);
    if (feesErr) return { error: `Could not load fees: ${feesErr.message}` };
    if (!fees || fees.length === 0) {
      return { error: "no_due_fee" as const, member: found.member.name };
    }

    const fee = fees[0];
    const outstanding = outstandingOf(fee);
    const newPaidAmount = (fee.paid_amount ?? 0) + amount;
    const willBeFullyPaid = newPaidAmount >= (fee.amount_snapshot ?? 0);

    const { error: updateErr } = await ctx.supabase
      .from("fees")
      .update({
        paid_amount: newPaidAmount,
        payment_method: paymentMethod,
        paid_date: willBeFullyPaid ? today() : fee.status === "overdue" ? today() : null,
        status: willBeFullyPaid ? "paid" : fee.status,
      })
      .eq("id", fee.id)
      .eq("workspace_id", ctx.workspaceId)
      .eq("member_id", found.member.id);

    if (updateErr) return { error: `Could not record payment: ${updateErr.message}` };

    return {
      success: true,
      member: found.member.name,
      plan: fee.plan_name_snapshot,
      dueDate: fee.due_date,
      amountRecorded: amount,
      paymentMethod,
      resultingStatus: willBeFullyPaid ? "paid" : fee.status,
      remainingAfterThisPayment: Math.max(outstanding - amount, 0),
      note: "Fee record updated. No receipt/WhatsApp was generated — do that from the Fees tab if needed.",
    };
  },
};

const updateFeePayment: PypusTool = {
  name: "update_fee_payment",
  riskLevel: "high",
  description:
    "Corrects an existing fee record's amount, paid amount, due date, payment method or status — for fixing a mistake, not for recording a new payment (use record_fee_payment for that). Targets the member's most recent fee cycle unless due_date is given to pick a specific one. Touches money records, so always preview first: call without confirmed:true, show the preview, and only call again with confirmed:true after explicit confirmation.",
  parameters: {
    type: "object",
    properties: {
      member_name: { type: "string" },
      due_date: { type: "string", description: "YYYY-MM-DD of the specific cycle to edit; defaults to the most recent cycle" },
      amount: { type: "number", description: "New total amount for this cycle, if changing" },
      paid_amount: { type: "number", description: "New paid amount for this cycle, if changing" },
      payment_method: { type: "string", description: "New payment method, if changing" },
      status: { type: "string", enum: ["due", "overdue", "paid"], description: "New status, if changing" },
      confirmed: { type: "boolean", description: "Set true only after the owner has explicitly confirmed this exact edit." },
    },
    required: ["member_name"],
  },
  async run(ctx, args) {
    const found = await resolveMember(ctx, args.member_name);
    if ("error" in found) return found;

    let query = ctx.supabase
      .from("fees")
      .select("id, plan_name_snapshot, amount_snapshot, paid_amount, due_date, payment_method, status")
      .eq("workspace_id", ctx.workspaceId)
      .eq("member_id", found.member.id);

    if (typeof args.due_date === "string" && args.due_date.trim()) {
      query = query.eq("due_date", args.due_date.trim());
    }

    const { data: fees, error: feesErr } = await query.order("due_date", { ascending: false }).limit(1);
    if (feesErr) return { error: `Could not load fee record: ${feesErr.message}` };
    if (!fees || fees.length === 0) return { error: "no_matching_fee_record" as const, member: found.member.name };

    const fee = fees[0];
    const updates: Record<string, unknown> = {};
    if (args.amount !== undefined && Number.isFinite(Number(args.amount))) updates.amount_snapshot = Number(args.amount);
    if (args.paid_amount !== undefined && Number.isFinite(Number(args.paid_amount))) updates.paid_amount = Number(args.paid_amount);
    if (typeof args.payment_method === "string" && args.payment_method.trim()) updates.payment_method = args.payment_method.trim();
    if (typeof args.status === "string" && ["due", "overdue", "paid"].includes(args.status)) updates.status = args.status;

    if (Object.keys(updates).length === 0) {
      return { error: "Nothing to update — pass at least one of amount, paid_amount, payment_method or status" };
    }

    const preview = {
      member: found.member.name,
      plan: fee.plan_name_snapshot,
      dueDate: fee.due_date,
      current: {
        amount: fee.amount_snapshot,
        paidAmount: fee.paid_amount,
        paymentMethod: fee.payment_method,
        status: fee.status,
      },
      changingTo: updates,
    };

    const gate = needsConfirmation(args, preview);
    if (gate) return gate;

    const { error: updateErr } = await ctx.supabase
      .from("fees")
      .update(updates)
      .eq("id", fee.id)
      .eq("workspace_id", ctx.workspaceId);
    if (updateErr) return { error: `Could not update fee record: ${updateErr.message}` };

    return { success: true, ...preview };
  },
};

const deleteFeePayment: PypusTool = {
  name: "delete_fee_payment",
  riskLevel: "high",
  description:
    "Permanently deletes a fee record for a member — use when a cycle was created or paid by mistake. Targets the most recent cycle unless due_date is given. This cannot be undone, so always preview first: call without confirmed:true, show the preview, and only call again with confirmed:true after explicit confirmation.",
  parameters: {
    type: "object",
    properties: {
      member_name: { type: "string" },
      due_date: { type: "string", description: "YYYY-MM-DD of the specific cycle to delete; defaults to the most recent cycle" },
      confirmed: { type: "boolean", description: "Set true only after the owner has explicitly confirmed this deletion." },
    },
    required: ["member_name"],
  },
  async run(ctx, args) {
    const found = await resolveMember(ctx, args.member_name);
    if ("error" in found) return found;

    let query = ctx.supabase
      .from("fees")
      .select("id, plan_name_snapshot, amount_snapshot, paid_amount, due_date, status")
      .eq("workspace_id", ctx.workspaceId)
      .eq("member_id", found.member.id);

    if (typeof args.due_date === "string" && args.due_date.trim()) {
      query = query.eq("due_date", args.due_date.trim());
    }

    const { data: fees, error: feesErr } = await query.order("due_date", { ascending: false }).limit(1);
    if (feesErr) return { error: `Could not load fee record: ${feesErr.message}` };
    if (!fees || fees.length === 0) return { error: "no_matching_fee_record" as const, member: found.member.name };

    const fee = fees[0];
    const preview = {
      member: found.member.name,
      plan: fee.plan_name_snapshot,
      dueDate: fee.due_date,
      amount: fee.amount_snapshot,
      paidAmount: fee.paid_amount,
      status: fee.status,
      warning: "This permanently deletes the fee record and cannot be undone.",
    };

    const gate = needsConfirmation(args, preview);
    if (gate) return gate;

    const { error: delErr } = await ctx.supabase
      .from("fees")
      .delete()
      .eq("id", fee.id)
      .eq("workspace_id", ctx.workspaceId);
    if (delErr) return { error: `Could not delete fee record: ${delErr.message}` };

    return { success: true, deleted: preview };
  },
};

// ── PLANS ───────────────────────────────────────────────────────────

const addPlan: PypusTool = {
  name: "add_plan",
  riskLevel: "low",
  description:
    "Creates a new membership plan for this workspace. Use for 'naya plan banao' / 'add a plan' type requests.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Plan name, e.g. 'Gold 3 Month'" },
      duration_months: { type: "integer", description: "Duration in months, 1-12" },
      price: { type: "number", description: "Price in rupees" },
    },
    required: ["name", "duration_months", "price"],
  },
  async run(ctx, args) {
    const name = typeof args.name === "string" ? args.name.trim() : "";
    if (!name) return { error: "Plan name is required" };
    const months = Number(args.duration_months);
    if (!Number.isFinite(months) || months < 1 || months > 12) return { error: "duration_months must be between 1 and 12" };
    const price = Number(args.price);
    if (!Number.isFinite(price) || price < 0) return { error: "Enter a valid price" };

    const result = await savePlan({
      workspaceId: ctx.workspaceId,
      name,
      duration: String(months) as never,
      price,
    });
    if (!result.success) return { error: result.error ?? "Could not create plan" };

    return { success: true, plan: { name, duration: durationLabel(String(months)), price } };
  },
};

const updatePlan: PypusTool = {
  name: "update_plan",
  riskLevel: "low",
  description:
    "Edits an existing plan's name, duration or price. Pass only the fields that should change. Existing members on this plan are not affected until they're reassigned.",
  parameters: {
    type: "object",
    properties: {
      plan_name: { type: "string", description: "The plan's current name, to find it" },
      name: { type: "string", description: "New name, if changing" },
      duration_months: { type: "integer", description: "New duration in months (1-12), if changing" },
      price: { type: "number", description: "New price, if changing" },
    },
    required: ["plan_name"],
  },
  async run(ctx, args) {
    const planName = typeof args.plan_name === "string" ? args.plan_name.trim().toLowerCase() : "";
    if (!planName) return { error: "plan_name is required" };

    const plans = await loadPlanNames(ctx);
    const match = [...plans.values()].find((p) => p.name.toLowerCase() === planName);
    if (!match) return { error: "plan_not_found" as const, availablePlans: [...plans.values()].map((p) => p.name) };

    const newName = typeof args.name === "string" && args.name.trim() ? args.name.trim() : match.name;
    const months = args.duration_months !== undefined ? Number(args.duration_months) : null;
    if (months !== null && (!Number.isFinite(months) || months < 1 || months > 12)) {
      return { error: "duration_months must be between 1 and 12" };
    }
    const newDuration = months !== null ? String(months) : match.duration;
    const newPrice = args.price !== undefined && Number.isFinite(Number(args.price)) ? Number(args.price) : match.price;

    const result = await savePlan({
      workspaceId: ctx.workspaceId,
      planId: match.id,
      name: newName,
      duration: newDuration as never,
      price: newPrice,
    });
    if (!result.success) return { error: result.error ?? "Could not update plan" };

    return { success: true, plan: { name: newName, duration: durationLabel(newDuration), price: newPrice } };
  },
};

const deletePlanTool: PypusTool = {
  name: "delete_plan",
  riskLevel: "high",
  description:
    "Permanently deletes a plan from this workspace. Existing members keep their current fee records but lose the plan link. This cannot be undone, so always preview first: call without confirmed:true, show the preview, and only call again with confirmed:true after explicit confirmation.",
  parameters: {
    type: "object",
    properties: {
      plan_name: { type: "string" },
      confirmed: { type: "boolean", description: "Set true only after the owner has explicitly confirmed deleting this exact plan." },
    },
    required: ["plan_name"],
  },
  async run(ctx, args) {
    const planName = typeof args.plan_name === "string" ? args.plan_name.trim().toLowerCase() : "";
    if (!planName) return { error: "plan_name is required" };

    const plans = await loadPlanNames(ctx);
    const match = [...plans.values()].find((p) => p.name.toLowerCase() === planName);
    if (!match) return { error: "plan_not_found" as const, availablePlans: [...plans.values()].map((p) => p.name) };

    const { count: membersOnPlan } = await ctx.supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", ctx.workspaceId)
      .eq("plan_id", match.id);

    const preview = {
      plan: match.name,
      duration: durationLabel(match.duration),
      price: match.price,
      membersCurrentlyOnThisPlan: membersOnPlan ?? 0,
      warning: "This permanently deletes the plan and cannot be undone.",
    };

    const gate = needsConfirmation(args, preview);
    if (gate) return gate;

    const result = await deletePlanAction({ workspaceId: ctx.workspaceId, planId: match.id });
    if (!result.success) return { error: result.error ?? "Could not delete plan" };

    return { success: true, deleted: preview };
  },
};

const assignPlanToMemberTool: PypusTool = {
  name: "assign_plan_to_member",
  riskLevel: "low",
  description:
    "Assigns or changes a member's plan and opens a new fee cycle for it (due date = today + plan duration). Use for 'X ko Gold plan de do' / 'X ka plan change karo' type requests.",
  parameters: {
    type: "object",
    properties: {
      member_name: { type: "string" },
      plan_name: { type: "string" },
    },
    required: ["member_name", "plan_name"],
  },
  async run(ctx, args) {
    const found = await resolveMember(ctx, args.member_name);
    if ("error" in found) return found;

    const planName = typeof args.plan_name === "string" ? args.plan_name.trim().toLowerCase() : "";
    if (!planName) return { error: "plan_name is required" };

    const plans = await loadPlanNames(ctx);
    const match = [...plans.values()].find((p) => p.name.toLowerCase() === planName);
    if (!match) return { error: "plan_not_found" as const, availablePlans: [...plans.values()].map((p) => p.name) };

    const dueDate = shiftDate(today(), daysForDuration(match.duration));

    const result = await assignPlanToMemberAction({
      workspaceId: ctx.workspaceId,
      memberId: found.member.id,
      planId: match.id,
      planName: match.name,
      amount: match.price,
      dueDate,
    });
    if (!result.success) return { error: result.error ?? "Could not assign plan" };

    return {
      success: true,
      member: found.member.name,
      plan: match.name,
      amount: match.price,
      dueDate,
    };
  },
};

export const FEES_TOOLS: PypusTool[] = [
  plansCatalog,
  feesSummary,
  pendingFees,
  revenueByPlan,
  paymentPunctuality,
  memberFeeHistory,
  recordFeePayment,
  updateFeePayment,
  deleteFeePayment,
  addPlan,
  updatePlan,
  deletePlanTool,
  assignPlanToMemberTool,
];
