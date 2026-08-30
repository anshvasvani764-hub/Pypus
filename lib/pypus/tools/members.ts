import { getISTDateString } from "@/lib/utils/date";
import {
  type PypusTool,
  outstandingOf,
  loadMembers,
  loadPlanNames,
  resolveMember,
  monthRange,
  needsConfirmation,
  type MemberRow,
} from "./shared";

const membersOverview: PypusTool = {
  name: "get_members_overview",
  riskLevel: "low",
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
  riskLevel: "low",
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

// ── WRITE ───────────────────────────────────────────────────────────

const addMember: PypusTool = {
  name: "add_member",
  riskLevel: "low",
  description:
    "Registers a brand-new member in this workspace (name + phone, email optional). Use when the owner asks to add/register a new member by name. Does not assign a plan — that's done separately in the Members tab.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Full name of the new member" },
      phone: { type: "string", description: "Phone number, at least 7 digits" },
      email: { type: "string", description: "Optional email address" },
    },
    required: ["name", "phone"],
  },
  async run(ctx, args) {
    const name = String(args.name ?? "").trim();
    const phone = String(args.phone ?? "").trim();
    const email = args.email ? String(args.email).trim() : null;

    if (name.length < 2) return { error: "A valid name is required" };
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) return { error: "A valid phone number (at least 7 digits) is required" };

    const members = await loadMembers(ctx);
    const duplicate = members.find((m) => m.phone && m.phone.replace(/\D/g, "") === digits);
    if (duplicate) {
      return { error: "duplicate_phone" as const, existingMember: duplicate.name };
    }

    const { data, error } = await ctx.supabase
      .from("members")
      .insert({
        workspace_id: ctx.workspaceId,
        name,
        phone,
        email,
        avatar_url: null,
        plan_id: null,
        trainer_id: null,
        auth_user_id: null,
      })
      .select("id, name, phone")
      .single();

    if (error) return { error: `Could not add member: ${error.message}` };
    return { success: true, member: data };
  },
};

const updateMember: PypusTool = {
  name: "update_member",
  riskLevel: "low",
  description:
    "Edits an existing member's basic details — name, phone and/or email. Pass only the fields that should change. Use for 'X ka number update karo' / 'X ka naam change karo' type requests. Does not touch plan, fees or attendance.",
  parameters: {
    type: "object",
    properties: {
      member_name: { type: "string", description: "The member's current name, to find them" },
      name: { type: "string", description: "New name, if changing" },
      phone: { type: "string", description: "New phone number, if changing" },
      email: { type: "string", description: "New email, if changing" },
    },
    required: ["member_name"],
  },
  async run(ctx, args) {
    const found = await resolveMember(ctx, args.member_name);
    if ("error" in found) return found;

    const updates: Record<string, string> = {};
    if (typeof args.name === "string" && args.name.trim()) {
      if (args.name.trim().length < 2) return { error: "A valid name is required" };
      updates.name = args.name.trim();
    }
    if (typeof args.phone === "string" && args.phone.trim()) {
      const digits = args.phone.replace(/\D/g, "");
      if (digits.length < 7) return { error: "A valid phone number (at least 7 digits) is required" };
      const members = await loadMembers(ctx);
      const duplicate = members.find(
        (m) => m.id !== found.member.id && m.phone && m.phone.replace(/\D/g, "") === digits
      );
      if (duplicate) return { error: "duplicate_phone" as const, existingMember: duplicate.name };
      updates.phone = args.phone.trim();
    }
    if (typeof args.email === "string" && args.email.trim()) {
      updates.email = args.email.trim();
    }

    if (Object.keys(updates).length === 0) {
      return { error: "Nothing to update — pass at least one of name, phone or email" };
    }

    const { data, error } = await ctx.supabase
      .from("members")
      .update(updates)
      .eq("id", found.member.id)
      .eq("workspace_id", ctx.workspaceId)
      .select("id, name, phone, email")
      .single();

    if (error) return { error: `Could not update member: ${error.message}` };
    return { success: true, updatedFields: updates, member: data };
  },
};

const deleteMember: PypusTool = {
  name: "delete_member",
  riskLevel: "high",
  description:
    "Permanently deletes a member from this workspace. This is destructive and cannot be undone, so ALWAYS preview first: call it without confirmed:true, show the owner the preview (including how many fee/attendance records will be affected), and only call it again with confirmed:true after they explicitly say yes/confirm/haan kar do in a following message.",
  parameters: {
    type: "object",
    properties: {
      member_name: { type: "string" },
      confirmed: {
        type: "boolean",
        description: "Set true only after the owner has explicitly confirmed deleting this exact member.",
      },
    },
    required: ["member_name"],
  },
  async run(ctx, args) {
    const found = await resolveMember(ctx, args.member_name);
    if ("error" in found) return found;

    const [feesCountRes, attCountRes] = await Promise.all([
      ctx.supabase
        .from("fees")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", ctx.workspaceId)
        .eq("member_id", found.member.id),
      ctx.supabase
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", ctx.workspaceId)
        .eq("member_id", found.member.id),
    ]);

    const preview = {
      member: found.member.name,
      phone: found.member.phone,
      relatedFeeRecords: feesCountRes.count ?? 0,
      relatedAttendanceRecords: attCountRes.count ?? 0,
      warning: "This permanently deletes the member and cannot be undone.",
    };

    const gate = needsConfirmation(args, preview);
    if (gate) return gate;

    const { error } = await ctx.supabase
      .from("members")
      .delete()
      .eq("id", found.member.id)
      .eq("workspace_id", ctx.workspaceId);

    if (error) {
      // Most likely a foreign-key restriction from fees/attendance rows still pointing at this member.
      return { error: `Could not delete member: ${error.message}` };
    }
    return { success: true, deleted: found.member.name };
  },
};

export const MEMBERS_TOOLS: PypusTool[] = [membersOverview, memberProfile, addMember, updateMember, deleteMember];
