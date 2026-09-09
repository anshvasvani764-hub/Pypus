import {
  getFeeReminderSettings,
  saveFeeReminderSettings,
  sendFeeReminderNow,
} from "@/app/actions/fee-reminders";
import { getReceiptWorklist } from "@/lib/agent/queries";
import { sendAgentReceipt } from "@/app/actions/agent";
import {
  saveReceiptAgentSettings,
  dismissReceiptFromQueue,
  updateReceiptTemplateVars,
} from "@/app/actions/receipt-agent";
import type { ReceiptTemplateVars } from "@/lib/receipts/template-vars";
import { type PypusTool, resolveMember, loadWorkspaceName, today, daysBetween, needsConfirmation } from "./shared";

// ── FEE REMINDERS ──────────────────────────────────────────────────

const updateFeeReminderSettings: PypusTool = {
  name: "update_fee_reminder_settings",
  riskLevel: "low",
  description:
    "Changes the fee-reminder automation config: whether it's on/off, how many days before the due date the soft reminder goes out, how many hours after the due date the first overdue reminder fires, how often it repeats after that (min 24h), and whether sends are automatic or require a manual tap. Pass only the field(s) being changed. Use for 'reminder schedule change karo', 'auto reminder on/off karo' type requests.",
  parameters: {
    type: "object",
    properties: {
      enabled: { type: "boolean", description: "Turn the whole automation on/off" },
      before_due_days: { type: "integer", description: "Days before due date to send the soft reminder" },
      after_due_hours: { type: "integer", description: "Hours after due date before the first overdue reminder" },
      repeat_interval_hours: { type: "integer", description: "Hours between repeat overdue reminders, minimum 24" },
      send_mode: { type: "string", enum: ["manual", "auto"], description: "Whether reminders fire automatically or wait for a manual send" },
    },
  },
  async run(ctx, args) {
    const current = await getFeeReminderSettings(ctx.workspaceId);
    const next = {
      enabled: typeof args.enabled === "boolean" ? args.enabled : current.enabled,
      beforeDueDays: Number.isFinite(Number(args.before_due_days)) ? Number(args.before_due_days) : current.beforeDueDays,
      afterDueHours: Number.isFinite(Number(args.after_due_hours)) ? Number(args.after_due_hours) : current.afterDueHours,
      repeatIntervalHours: Number.isFinite(Number(args.repeat_interval_hours))
        ? Number(args.repeat_interval_hours)
        : current.repeatIntervalHours,
      sendMode: args.send_mode === "auto" || args.send_mode === "manual" ? args.send_mode : current.sendMode,
    };

    const result = await saveFeeReminderSettings(ctx.workspaceId, next);
    if (!result.success) return { error: result.error ?? "Could not update fee reminder settings" };
    return { success: true, ...next };
  },
};

const sendFeeReminder: PypusTool = {
  name: "send_fee_reminder",
  riskLevel: "high",
  description:
    "Sends a WhatsApp fee reminder to one member right now, using their real due/overdue fee to pick the correct approved template — a soft 'coming due' message if their fee isn't due yet, or an overdue message (with days overdue) if it already is. You never choose which template; it's decided from the member's actual fee status. Two-step: call first without confirmed:true to preview which member and which reminder type will be used, then call again with confirmed:true only after the owner confirms.",
  parameters: {
    type: "object",
    properties: {
      member_name: { type: "string" },
      confirmed: { type: "boolean", description: "Set true only after the owner has explicitly confirmed this exact member and reminder." },
    },
    required: ["member_name"],
  },
  async run(ctx, args) {
    const found = await resolveMember(ctx, args.member_name);
    if ("error" in found) return found;

    if (!found.member.phone) {
      return { error: "no_phone_on_file" as const, member: found.member.name };
    }

    const { data: fees, error: feesErr } = await ctx.supabase
      .from("fees")
      .select("id, amount_snapshot, paid_amount, due_date, status")
      .eq("workspace_id", ctx.workspaceId)
      .eq("member_id", found.member.id)
      .in("status", ["due", "overdue"])
      .order("due_date", { ascending: true })
      .limit(1);
    if (feesErr) return { error: `Could not load fee record: ${feesErr.message}` };
    if (!fees || fees.length === 0) {
      return { error: "no_due_fee" as const, member: found.member.name, note: "This member has no due/overdue fee to remind about." };
    }

    const fee = fees[0];
    const stage: "before_due" | "overdue" = fee.status === "overdue" ? "overdue" : "before_due";
    const daysOverdue = stage === "overdue" ? daysBetween(fee.due_date, today()) : 0;
    const outstanding = (fee.amount_snapshot ?? 0) - (fee.paid_amount ?? 0);

    const preview = {
      member: found.member.name,
      phone: found.member.phone,
      dueDate: fee.due_date,
      outstandingAmount: outstanding,
      reminderType: stage === "overdue" ? "overdue" : "before_due (soft, coming due)",
      daysOverdue,
    };

    const gate = needsConfirmation(args, preview);
    if (gate) return gate;

    const workspaceName = await loadWorkspaceName(ctx);
    const result = await sendFeeReminderNow({
      workspaceId: ctx.workspaceId,
      workspaceName,
      memberId: found.member.id,
      memberPhone: found.member.phone,
      memberName: found.member.name,
      feeId: fee.id,
      stage,
      amount: outstanding,
      dueDate: fee.due_date,
      daysOverdue,
    });
    if (!result.success) return { error: result.error ?? "Could not send reminder" };

    return { success: true, ...preview };
  },
};

// ── RECEIPTS ────────────────────────────────────────────────────────

const receiptQueue: PypusTool = {
  name: "get_receipt_queue",
  riskLevel: "low",
  description:
    "Lists payment receipts currently waiting to be sent on WhatsApp — member, amount, receipt number, paid date, payment method. Use for 'kitni receipts pending hain', 'kiski receipt bhejni baaki hai' questions.",
  parameters: { type: "object", properties: {} },
  async run(ctx) {
    const workspaceName = await loadWorkspaceName(ctx);
    const queue = await getReceiptWorklist(ctx.workspaceId, workspaceName);
    return {
      pendingCount: queue.length,
      receipts: queue.map((r) => ({
        member: r.memberName,
        amount: r.amount,
        receiptNumber: r.receiptNumber,
        paidDate: r.paidDate,
        paymentMethod: r.paymentMethod,
      })),
    };
  },
};

const updateReceiptAgentSettings: PypusTool = {
  name: "update_receipt_agent_settings",
  riskLevel: "low",
  description:
    "Sets whether payment receipts are sent automatically the moment a fee is marked paid ('auto'), or held in a queue for the owner to send manually ('manual'). Use for 'receipt automatic bhejo' / 'receipt manually bhejenge' type requests.",
  parameters: {
    type: "object",
    properties: {
      send_mode: { type: "string", enum: ["manual", "auto"] },
    },
    required: ["send_mode"],
  },
  async run(ctx, args) {
    if (args.send_mode !== "auto" && args.send_mode !== "manual") {
      return { error: "send_mode must be 'manual' or 'auto'" };
    }
    const result = await saveReceiptAgentSettings(ctx.workspaceId, { sendMode: args.send_mode });
    if (!result.success) return { error: result.error ?? "Could not update receipt settings" };
    return { success: true, sendMode: args.send_mode };
  },
};

const sendReceipt: PypusTool = {
  name: "send_receipt",
  riskLevel: "low",
  description:
    "Sends payment receipt(s) on WhatsApp that are already sitting in the pending queue. Pass member_name to send just that member's queued receipt; omit it to send every receipt currently waiting ('sabko bhej do', 'jitni receipts pending hai sab bhej do'). Only sends what's already queued — never generates a new receipt.",
  parameters: {
    type: "object",
    properties: {
      member_name: { type: "string", description: "Send only this member's pending receipt. Omit to send the whole queue." },
    },
  },
  async run(ctx, args) {
    const workspaceName = await loadWorkspaceName(ctx);
    const queue = await getReceiptWorklist(ctx.workspaceId, workspaceName);

    let targets = queue;
    let requestedFor = "entire queue";
    if (typeof args.member_name === "string" && args.member_name.trim()) {
      const found = await resolveMember(ctx, args.member_name);
      if ("error" in found) return found;
      requestedFor = found.member.name;
      targets = queue.filter((r) => r.memberId === found.member.id);
      if (targets.length === 0) {
        return { error: "no_pending_receipt_for_member" as const, member: found.member.name };
      }
    }

    if (targets.length === 0) {
      return { success: true, requestedFor, sentCount: 0, note: "Receipt queue is already empty." };
    }

    const results = await Promise.all(
      targets.map(async (r) => {
        const res = await sendAgentReceipt({
          receiptId: r.receiptId,
          memberPhone: r.memberPhone,
          templateVars: r.templateVars,
          receiptImageUrl: r.receiptImageUrl,
        });
        return { member: r.memberName, amount: r.amount, success: res.success, error: res.error };
      })
    );

    return {
      requestedFor,
      sentCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      results,
    };
  },
};

const dismissReceipt: PypusTool = {
  name: "dismiss_receipt",
  riskLevel: "low",
  description:
    "Removes one member's receipt from the pending queue without sending it on WhatsApp — for when it was already shared some other way. Use for 'iski receipt hata do queue se' type requests.",
  parameters: {
    type: "object",
    properties: { member_name: { type: "string" } },
    required: ["member_name"],
  },
  async run(ctx, args) {
    const workspaceName = await loadWorkspaceName(ctx);
    const queue = await getReceiptWorklist(ctx.workspaceId, workspaceName);
    const found = await resolveMember(ctx, args.member_name);
    if ("error" in found) return found;

    const item = queue.find((r) => r.memberId === found.member.id);
    if (!item) return { error: "no_pending_receipt_for_member" as const, member: found.member.name };

    const result = await dismissReceiptFromQueue(item.receiptId);
    if (!result.success) return { error: result.error ?? "Could not remove receipt from queue" };
    return { success: true, member: found.member.name, receiptNumber: item.receiptNumber };
  },
};

const updateReceiptMessage: PypusTool = {
  name: "update_receipt_message",
  riskLevel: "low",
  description:
    "Overrides the exact amount-paid, remaining-balance, payment method or valid-till text that will go out on a member's still-queued receipt WhatsApp message. Use only when the owner explicitly wants to correct what an unsent receipt message will say — has no effect on a receipt already sent.",
  parameters: {
    type: "object",
    properties: {
      member_name: { type: "string" },
      amount_paid: { type: "number", description: "Override for the amount-paid line" },
      remaining_amount: { type: "number", description: "Override for the remaining-balance line" },
      payment_method: { type: "string" },
      valid_till_date: { type: "string", description: "YYYY-MM-DD override for the valid-till line" },
    },
    required: ["member_name"],
  },
  async run(ctx, args) {
    const workspaceName = await loadWorkspaceName(ctx);
    const queue = await getReceiptWorklist(ctx.workspaceId, workspaceName);
    const found = await resolveMember(ctx, args.member_name);
    if ("error" in found) return found;

    const item = queue.find((r) => r.memberId === found.member.id);
    if (!item) return { error: "no_pending_receipt_for_member" as const, member: found.member.name };

    const vars: ReceiptTemplateVars = {
      ...item.templateVars,
      amountPaid: typeof args.amount_paid === "number" ? args.amount_paid : item.templateVars.amountPaid,
      remainingAmount:
        typeof args.remaining_amount === "number" ? args.remaining_amount : item.templateVars.remainingAmount,
      paymentMethod:
        typeof args.payment_method === "string" && args.payment_method.trim()
          ? args.payment_method.trim()
          : item.templateVars.paymentMethod,
      validTillDate:
        typeof args.valid_till_date === "string" && args.valid_till_date.trim()
          ? args.valid_till_date.trim()
          : item.templateVars.validTillDate,
    };

    const result = await updateReceiptTemplateVars(item.receiptId, vars);
    if (!result.success) return { error: result.error ?? "Could not update receipt message" };
    return { success: true, member: found.member.name, updatedTo: vars };
  },
};

export const AUTOMATION_TOOLS: PypusTool[] = [
  updateFeeReminderSettings,
  sendFeeReminder,
  receiptQueue,
  updateReceiptAgentSettings,
  sendReceipt,
  dismissReceipt,
  updateReceiptMessage,
];
