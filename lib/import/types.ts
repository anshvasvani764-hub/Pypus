// ──────────────────────────────────────────────
// Member bulk-import — shared type contract
//
// This file is the interface boundary between the three parts of the
// import feature:
//   Agent 1 (this file + parse.ts, validate.ts, template.ts, DB migration)
//   Agent 2 (upload UI, preview/edit table, results screen)
//   Agent 3 (server action that turns ValidatedImportRow[] into member /
//            plan / fee inserts and writes the import_batches row)
//
// Keep these shapes stable — Agent 2 and 3 code directly against them
// without reading the rest of this module's source.
// ──────────────────────────────────────────────

/**
 * One row exactly as read from the uploaded spreadsheet, before any
 * validation or type coercion. Every field is a raw `string` (or empty
 * string) because that's what comes back from the cell regardless of the
 * column's intended type — numbers, dates, everything is stringified here.
 * `parse.ts` produces these; `validate.ts` consumes them.
 */
export interface RawImportRow {
  /** 1-indexed row number as it appears in the spreadsheet, accounting for
   *  the header row — used in error messages so the owner can find the row
   *  in Excel/Sheets (e.g. "Row 4: Phone is required"). */
  rowNumber: number;
  name: string;
  phone: string;
  email: string;
  /** Raw "Duration (months)" cell value, e.g. "3" — empty string if blank. */
  duration: string;
  /** Raw "Plan Amount" cell value, e.g. "1500" or "₹1,500". */
  planAmount: string;
  /** Raw "Paid Amount" cell value. */
  paidAmount: string;
  paymentMethod: string;
  /** Raw "Paid Date" cell value — either "DD-MM-YYYY" text or an Excel
   *  serial date number already normalized to that format by parse.ts.
   *  Maps to `fees.paid_date`. Note: `members.joined_at` is NOT collected
   *  from the sheet — it's set to `now()` by Agent 3 at insert time. */
  paidDate: string;
  /** Raw "Due Date" cell value, same format notes as paidDate. */
  dueDate: string;
}

/**
 * Human-readable reason a row failed or was flagged during validation, e.g.
 * "Name is required", "Phone already exists". Kept as a plain `string`
 * (not a union) so validate.ts can phrase new reasons without every
 * consumer needing a type update — Agent 2's UI just renders these as-is.
 */
export type FieldErrorReason = string;

/**
 * One row after validation: the raw input plus everything Agent 2's
 * preview table and Agent 3's insert logic need to act on it.
 */
export interface ValidatedImportRow {
  /** The original unvalidated row, kept so the UI can show/re-edit it. */
  raw: RawImportRow;
  /** 'error' rows block import until fixed (or are skipped); 'warning'
   *  rows are importable but worth a second look; 'valid' rows are clean. */
  status: "valid" | "warning" | "error";
  /** Blocking problems — row is not inserted while any of these remain. */
  errors: FieldErrorReason[];
  /** Non-blocking notes shown to the owner (e.g. duplicate phone, paid >
   *  plan amount). */
  warnings: FieldErrorReason[];
  /**
   * Cleaned, typed values ready for insert. Populated whenever the row has
   * enough information to attempt one — including most 'error' rows, since
   * Agent 2's UI lets the owner inline-edit and re-validate a row without
   * retyping fields that were already fine. Only `null` when the row is
   * truly unusable (e.g. name is completely empty).
   */
  parsed: {
    name: string;
    phone: string;
    email: string | null;
    /** Plan duration in whole months (1-12), or null if the member has no
     *  plan on import. Store as a plain digit string (e.g. "3") in
     *  `plans.duration` at insert time — see lib/members/plan-duration.ts,
     *  whose helpers accept plain digit strings as the primary format
     *  (with legacy "monthly"/"quarterly"/"yearly" and old "<n>_month"
     *  data still supported for reads, but new writes use the plain
     *  digit-string form). Don't write "<n>_month" for new rows. */
    durationMonths: number | null;
    planAmount: number | null;
    /** Defaults to 0 when the sheet left Paid Amount blank. */
    paidAmount: number;
    paymentMethod: string | null;
    /** Normalized "DD-MM-YYYY" string, required (and validated) only when
     *  the row is fully paid. Maps to `fees.paid_date`. Null otherwise. */
    paidDate: string | null;
    /** Normalized "DD-MM-YYYY" string, required (and validated) only when
     *  the row is not fully paid. Null otherwise. */
    dueDate: string | null;
  } | null;
  /** True on every row that shares its phone number with another row in
   *  this same file (all such rows get this flag, not just the later ones). */
  isDuplicateInFile: boolean;
  /** True if this phone number already belongs to a member in this
   *  workspace. Not blocking here — Agent 3 decides whether to skip it. */
  existsInDb: boolean;
}

/**
 * One entry in the final result screen's error list — a row that could not
 * be imported (or a fee that could not be created for an imported member).
 */
export interface ImportRowError {
  rowNumber: number;
  name: string;
  phone: string;
  reason: string;
}

/**
 * Summary returned by Agent 3's import server action once a batch finishes
 * processing, for the results screen and the `import_batches` audit row.
 */
export interface ImportResult {
  success: boolean;
  importedCount: number;
  plansCreatedCount: number;
  feesCreatedCount: number;
  skippedCount: number;
  /** Rows that failed to become a member record. */
  memberErrors: ImportRowError[];
  /** Rows that became a member but failed to get their fee record. */
  feeErrors: ImportRowError[];
}
