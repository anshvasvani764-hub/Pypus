// ──────────────────────────────────────────────
// Member bulk-import — row validator
//
// Applies every field-level and cross-field rule to the raw parsed rows,
// plus one batched DB lookup for phones that already exist in this
// workspace. Does NOT insert anything — that's Agent 3's job. This module
// only classifies rows as valid/warning/error and produces the cleaned
// `parsed` values Agent 3 will insert from.
// ──────────────────────────────────────────────

import { createServiceClient } from "@/lib/supabase/service";
import type { RawImportRow, ValidatedImportRow } from "./types";

const DATE_FORMAT = /^(\d{2})-(\d{2})-(\d{4})$/;

/** Strips spaces, dashes, and a leading +91/91 country-code prefix, then
 *  requires exactly 10 digits remain. Returns null if it doesn't reduce to
 *  a valid 10-digit Indian mobile number. */
function normalizePhone(rawPhone: string): string | null {
  let digits = rawPhone.replace(/[\s-]/g, "");
  digits = digits.replace(/^\+?91/, "");
  digits = digits.replace(/\D/g, "");
  return digits.length === 10 ? digits : null;
}

function isValidEmailFormat(email: string): boolean {
  return email.includes("@") && email.includes(".");
}

/** Parses "DD-MM-YYYY" into a normalized string, or null if malformed.
 *  parse.ts has already converted Excel serial dates to this format, so
 *  by the time a value reaches here it should always be plain text. */
function normalizeDate(rawDate: string): string | null {
  const match = DATE_FORMAT.exec(rawDate.trim());
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${dd}-${mm}-${yyyy}`;
}

/** Strips ₹ and thousands-separator commas before parsing a numeric
 *  field, since owners commonly paste amounts like "₹1,500". */
function parseLenientNumber(rawValue: string): number | null {
  const cleaned = rawValue.replace(/[₹,\s]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

interface RowValidation {
  errors: string[];
  warnings: string[];
  parsed: ValidatedImportRow["parsed"];
}

function validateSingleRow(raw: RawImportRow): RowValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const name = raw.name.trim();
  if (!name) errors.push("Name is required");

  let phone: string | null = null;
  const rawPhone = raw.phone.trim();
  if (!rawPhone) {
    errors.push("Phone is required");
  } else {
    phone = normalizePhone(rawPhone);
    if (!phone) errors.push("Invalid phone number");
  }

  const rawEmail = raw.email.trim();
  let email: string | null = null;
  if (rawEmail) {
    if (isValidEmailFormat(rawEmail)) {
      email = rawEmail;
    } else {
      warnings.push("Invalid email format");
      email = rawEmail; // kept for inline-edit, just flagged
    }
  }

  // Rule 4: duration + plan amount are all-or-nothing.
  const durationGiven = raw.duration.trim() !== "";
  const planAmountGiven = raw.planAmount.trim() !== "";
  if (durationGiven && !planAmountGiven) {
    errors.push("Duration given but Plan Amount is missing");
  } else if (!durationGiven && planAmountGiven) {
    errors.push("Plan Amount given but Duration is missing");
  }

  let durationMonths: number | null = null;
  if (durationGiven) {
    const parsedDuration = Number(raw.duration.trim());
    if (
      !Number.isInteger(parsedDuration) ||
      parsedDuration < 1 ||
      parsedDuration > 12
    ) {
      errors.push("Duration must be a number between 1 and 12");
    } else {
      durationMonths = parsedDuration;
    }
  }

  let planAmount: number | null = null;
  if (planAmountGiven) {
    const parsedAmount = parseLenientNumber(raw.planAmount);
    if (parsedAmount === null || parsedAmount <= 0) {
      errors.push("Plan Amount must be a valid number");
    } else {
      planAmount = parsedAmount;
    }
  }

  // Rule 7: paid amount, defaults to 0.
  let paidAmount = 0;
  const rawPaidAmount = raw.paidAmount.trim();
  if (rawPaidAmount !== "") {
    const parsedPaid = parseLenientNumber(rawPaidAmount);
    if (parsedPaid === null || parsedPaid < 0) {
      errors.push("Paid Amount must be a valid number");
    } else {
      paidAmount = parsedPaid;
      if (planAmount !== null && paidAmount > planAmount) {
        warnings.push("Paid amount exceeds plan amount — please double check");
      }
    }
  }

  // Rule 8: due date required if not fully paid; paid date required if
  // fully paid. Both only apply when the member actually has a plan.
  // Each field is single-purpose — dueDate only ever comes from the "Due
  // Date" column, paidDate only ever comes from the "Paid Date" column.
  let dueDate: string | null = null;
  let paidDate: string | null = null;
  const hasPlan = planAmount !== null;
  const isFullyPaid = hasPlan && paidAmount >= (planAmount as number);

  if (hasPlan && !isFullyPaid) {
    const rawDueDate = raw.dueDate.trim();
    if (!rawDueDate) {
      errors.push("Due date missing");
    } else {
      dueDate = normalizeDate(rawDueDate);
      if (!dueDate) errors.push("Invalid date format, use DD-MM-YYYY");
    }
  } else if (raw.dueDate.trim()) {
    // Optional due date supplied even though not strictly required —
    // still validate its format if present.
    dueDate = normalizeDate(raw.dueDate.trim());
    if (!dueDate) errors.push("Invalid date format, use DD-MM-YYYY");
  }

  if (isFullyPaid) {
    const rawPaidDate = raw.paidDate.trim();
    if (!rawPaidDate) {
      errors.push("Paid date missing");
    } else {
      paidDate = normalizeDate(rawPaidDate);
      if (!paidDate) errors.push("Invalid date format, use DD-MM-YYYY");
    }
  } else if (raw.paidDate.trim()) {
    // Optional paid date supplied even though not strictly required —
    // still validate its format if present.
    paidDate = normalizeDate(raw.paidDate.trim());
    if (!paidDate) errors.push("Invalid date format, use DD-MM-YYYY");
  }

  const paymentMethod = raw.paymentMethod.trim() || null;

  // Only null out `parsed` when the row is truly unusable — otherwise
  // Agent 2's UI needs the best-effort values for inline editing.
  const parsed = name
    ? {
        name,
        phone: phone ?? rawPhone,
        email,
        durationMonths,
        planAmount,
        paidAmount,
        paymentMethod,
        paidDate,
        dueDate,
      }
    : null;

  return { errors, warnings, parsed };
}

/**
 * Validates every parsed row: field rules, cross-field rules, in-file
 * duplicate phones, and a single batched query for phones that already
 * exist as members in this workspace.
 */
export async function validateImportRows(
  rows: RawImportRow[],
  workspaceId: string
): Promise<ValidatedImportRow[]> {
  const perRowValidation = rows.map(validateSingleRow);

  // Rule 10: duplicate phone within the file.
  const phoneCounts = new Map<string, number>();
  for (const { parsed } of perRowValidation) {
    if (parsed?.phone) {
      phoneCounts.set(parsed.phone, (phoneCounts.get(parsed.phone) ?? 0) + 1);
    }
  }

  // Rule 11: duplicate phone already in DB — one batched query, not N.
  const candidatePhones = Array.from(
    new Set(
      perRowValidation
        .map((v) => v.parsed?.phone)
        .filter((phone): phone is string => Boolean(phone))
    )
  );

  const existingPhones = new Set<string>();
  if (candidatePhones.length > 0) {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("members")
      .select("phone")
      .eq("workspace_id", workspaceId)
      .in("phone", candidatePhones);

    if (error) {
      console.error("validateImportRows duplicate-phone lookup error:", error);
    } else {
      for (const record of data ?? []) {
        if (record.phone) existingPhones.add(record.phone);
      }
    }
  }

  return rows.map((raw, index) => {
    const { errors, warnings, parsed } = perRowValidation[index];
    const rowWarnings = [...warnings];

    const isDuplicateInFile = Boolean(
      parsed?.phone && (phoneCounts.get(parsed.phone) ?? 0) > 1
    );
    if (isDuplicateInFile) {
      rowWarnings.push("Duplicate phone in file");
    }

    const existsInDb = Boolean(parsed?.phone && existingPhones.has(parsed.phone));
    if (existsInDb) {
      rowWarnings.push("Member with this phone already exists — will be skipped");
    }

    const status: ValidatedImportRow["status"] =
      errors.length > 0 ? "error" : rowWarnings.length > 0 ? "warning" : "valid";

    return {
      raw,
      status,
      errors,
      warnings: rowWarnings,
      parsed,
      isDuplicateInFile,
      existsInDb,
    };
  });
}
