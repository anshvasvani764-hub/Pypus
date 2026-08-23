"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { daysForDuration, monthsForDuration } from "@/lib/members/plan-duration";
import type { ImportResult, ImportRowError, ValidatedImportRow } from "@/lib/import/types";

const BATCH_SIZE = 20;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** "DD-MM-YYYY" -> "YYYY-MM-DD" for Postgres date columns. Import dates are
 *  already validated/normalized to this text format by validate.ts. */
function toISODate(ddmmyyyy: string): string {
  const [dd, mm, yyyy] = ddmmyyyy.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

/** Adds `days` to an ISO ("YYYY-MM-DD") date string, returning ISO. Used to
 *  seed a due_date for rows that arrived fully paid, matching how
 *  app/actions/member-plan.ts derives the next cycle's due_date for a
 *  renewal — a paid fee still needs a due_date marking when coverage ends. */
function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Turns a raw Postgres error into something readable in the result screen. */
function readableDbError(message: string | undefined): string {
  if (!message) return "Insert failed";
  if (message.includes("duplicate key") && message.toLowerCase().includes("phone")) {
    return "Phone number already exists";
  }
  return message;
}

function planLabel(durationMonths: number): string {
  return `${durationMonths} Month${durationMonths > 1 ? "s" : ""} Membership`;
}

interface PlanAssignment {
  planId: string | null;
  planName: string | null;
}

export async function importMembersFromExcel(
  rows: ValidatedImportRow[],
  workspaceId: string
): Promise<ImportResult> {
  const supabase = createServiceClient();

  // Best-effort — used only for import_batches.uploaded_by, never blocks the
  // import if the session lookup fails.
  let uploadedBy: string | null = null;
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    uploadedBy = user?.id ?? null;
  } catch {
    uploadedBy = null;
  }

  const memberErrors: ImportRowError[] = [];
  const feeErrors: ImportRowError[] = [];
  let skippedCount = 0;
  let plansCreatedCount = 0;

  // ── Step A — filter to importable rows, drop in-file duplicates (keep the
  // first occurrence) and rows that already exist in this workspace. Both
  // are expected/normal outcomes, not errors. ──────────────────────────────
  const seenPhones = new Set<string>();
  const candidates: ValidatedImportRow[] = [];

  for (const row of rows) {
    if (row.status === "error" || !row.parsed) continue;

    if (row.existsInDb) {
      skippedCount++;
      continue;
    }

    const phone = row.parsed.phone;
    if (row.isDuplicateInFile) {
      if (seenPhones.has(phone)) {
        skippedCount++;
        continue;
      }
    }
    seenPhones.add(phone);
    candidates.push(row);
  }

  // ── Step B — group rows that have a plan by duration+amount signature ──
  const groups = new Map<string, { durationMonths: number; planAmount: number; rows: ValidatedImportRow[] }>();

  for (const row of candidates) {
    const { durationMonths, planAmount } = row.parsed!;
    if (durationMonths == null || planAmount == null) continue; // no-plan rows: nothing to group
    const key = `${durationMonths}_${planAmount}`;
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      groups.set(key, { durationMonths, planAmount, rows: [row] });
    }
  }

  // ── Step C — resolve a plan per group: reuse a matching active plan,
  // create one shared plan for groups of 3+, otherwise each member gets a
  // plan-less "custom" fee (matching PlanSelectorModal's custom-plan flow). ──
  const { data: existingPlans } = await supabase
    .from("plans")
    .select("id, name, duration, price")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");

  const assignments = new Map<ValidatedImportRow, PlanAssignment>();

  for (const group of groups.values()) {
    const match = (existingPlans ?? []).find(
      (p) => monthsForDuration(p.duration) === group.durationMonths && Number(p.price) === group.planAmount
    );

    if (match) {
      for (const row of group.rows) assignments.set(row, { planId: match.id, planName: match.name });
      continue;
    }

    const autoName = planLabel(group.durationMonths);

    if (group.rows.length >= 3) {
      const { data: newPlan, error: planError } = await supabase
        .from("plans")
        .insert({
          workspace_id: workspaceId,
          name: autoName,
          duration: String(group.durationMonths),
          price: group.planAmount,
          features: [],
          status: "active",
        })
        .select("id, name")
        .single();

      if (planError || !newPlan) {
        console.error("importMembersFromExcel plan create error:", planError);
        // Don't fail the whole group over one plan-creation error — fall
        // back to a plan-less custom fee for every member in it instead.
        for (const row of group.rows) assignments.set(row, { planId: null, planName: autoName });
        continue;
      }

      plansCreatedCount++;
      for (const row of group.rows) assignments.set(row, { planId: newPlan.id, planName: newPlan.name });
    } else {
      for (const row of group.rows) assignments.set(row, { planId: null, planName: autoName });
    }
  }

  // ── Step D — insert members in batches of 20, isolating per-row failures ──
  interface Prepared {
    row: ValidatedImportRow;
    planId: string | null;
    planName: string | null;
  }

  const prepared: Prepared[] = candidates.map((row) => {
    const assignment = assignments.get(row) ?? { planId: null, planName: null };
    return { row, planId: assignment.planId, planName: assignment.planName };
  });

  function memberPayload(p: Prepared) {
    return {
      workspace_id: workspaceId,
      name: p.row.parsed!.name,
      phone: p.row.parsed!.phone,
      email: p.row.parsed!.email,
      avatar_url: null,
      plan_id: p.planId,
      trainer_id: null,
      auth_user_id: null,
      // joined_at intentionally omitted — not collected from the sheet
      // (see RawImportRow doc comment); the members table default (now())
      // applies, same as app/actions/member-admin.ts's createMember().
    };
  }

  interface InsertedMember {
    row: ValidatedImportRow;
    memberId: string;
    planId: string | null;
    planName: string | null;
  }

  const insertedMembers: InsertedMember[] = [];

  for (const batch of chunk(prepared, BATCH_SIZE)) {
    const { data, error } = await supabase
      .from("members")
      .insert(batch.map(memberPayload))
      .select("id");

    if (!error && data) {
      data.forEach((rec, idx) => {
        const p = batch[idx];
        insertedMembers.push({ row: p.row, memberId: rec.id, planId: p.planId, planName: p.planName });
      });
      continue;
    }

    // Batch insert failed (e.g. one row's constraint violation aborts the
    // whole statement) — retry one row at a time so a single bad row
    // doesn't take down the other 19.
    console.error("importMembersFromExcel batch member insert error, retrying individually:", error);
    for (const p of batch) {
      const { data: single, error: singleError } = await supabase
        .from("members")
        .insert(memberPayload(p))
        .select("id")
        .single();

      if (singleError || !single) {
        memberErrors.push({
          rowNumber: p.row.raw.rowNumber,
          name: p.row.parsed!.name,
          phone: p.row.parsed!.phone,
          reason: readableDbError(singleError?.message),
        });
        continue;
      }

      insertedMembers.push({ row: p.row, memberId: single.id, planId: p.planId, planName: p.planName });
    }
  }

  // ── Step E — insert fees for members who have a plan (real or custom) ──
  const feeCandidates = insertedMembers.filter(
    (m) => m.row.parsed!.durationMonths != null && m.row.parsed!.planAmount != null
  );

  function feePayload(m: InsertedMember) {
    const parsed = m.row.parsed!;
    const amountSnapshot = parsed.planAmount as number;
    const paidAmount = parsed.paidAmount;
    const isFullyPaid = paidAmount >= amountSnapshot;

    const paidDateISO = parsed.paidDate ? toISODate(parsed.paidDate) : null;
    // A fully-paid row from the sheet may not carry an explicit due date —
    // seed one the same way member-plan.ts's renewal flow does: paid date
    // (or today) plus the plan's cycle length.
    const dueDateISO = parsed.dueDate
      ? toISODate(parsed.dueDate)
      : addDaysISO(paidDateISO ?? todayISO(), daysForDuration(String(parsed.durationMonths)));

    const today = todayISO();
    const status: "paid" | "due" | "overdue" = isFullyPaid ? "paid" : dueDateISO <= today ? "overdue" : "due";

    return {
      workspace_id: workspaceId,
      member_id: m.memberId,
      plan_id: m.planId,
      plan_name_snapshot: m.planName ?? planLabel(parsed.durationMonths as number),
      amount_snapshot: amountSnapshot,
      paid_amount: paidAmount,
      due_date: dueDateISO,
      paid_date: paidDateISO,
      payment_method: parsed.paymentMethod,
      status,
    };
  }

  let feesCreatedCount = 0;

  for (const batch of chunk(feeCandidates, BATCH_SIZE)) {
    const { data, error } = await supabase.from("fees").insert(batch.map(feePayload)).select("id");

    if (!error && data) {
      feesCreatedCount += data.length;
      continue;
    }

    console.error("importMembersFromExcel batch fee insert error, retrying individually:", error);
    for (const m of batch) {
      const { error: singleError } = await supabase.from("fees").insert(feePayload(m));

      if (singleError) {
        feeErrors.push({
          rowNumber: m.row.raw.rowNumber,
          name: m.row.parsed!.name,
          phone: m.row.parsed!.phone,
          reason: readableDbError(singleError.message),
        });
        continue;
      }
      feesCreatedCount++;
    }
  }

  // ── Step F — log the batch ──
  const importedCount = insertedMembers.length;
  const batchStatus: "completed" | "partial" | "failed" =
    memberErrors.length === 0 && feeErrors.length === 0
      ? "completed"
      : importedCount > 0
        ? "partial"
        : "failed";

  const { error: batchError } = await supabase.from("import_batches").insert({
    workspace_id: workspaceId,
    uploaded_by: uploadedBy,
    file_name: null, // not threaded through by ImportUploadModal yet — see summary
    total_rows: rows.length,
    imported_count: importedCount,
    skipped_count: skippedCount,
    plans_created: plansCreatedCount,
    status: batchStatus,
    error_summary: { memberErrors, feeErrors },
  });

  if (batchError) {
    console.error("importMembersFromExcel import_batches insert error:", batchError);
  }

  // ── Step G — revalidate + return ──
  revalidatePath("/[app]/members", "page");
  revalidatePath("/[app]/fees", "page");

  return {
    success: memberErrors.length === 0 && feeErrors.length === 0,
    importedCount,
    plansCreatedCount,
    feesCreatedCount,
    skippedCount,
    memberErrors,
    feeErrors,
  };
}
