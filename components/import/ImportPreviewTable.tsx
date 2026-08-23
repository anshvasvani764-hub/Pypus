"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { revalidateImportRow } from "@/app/actions/import-validate";
import type { RawImportRow, ValidatedImportRow } from "@/lib/import/types";

interface ImportPreviewTableProps {
  rows: ValidatedImportRow[];
  onRowsChange: (rows: ValidatedImportRow[]) => void;
  onConfirm: () => void;
  /** Needed to re-run the DB duplicate-phone lookup when a row is
   *  inline-edited and re-validated. Not part of Agent 1's contract, but
   *  required for the live re-validation this table implements. */
  workspaceId: string;
}

type EditableField =
  | "name"
  | "phone"
  | "duration"
  | "planAmount"
  | "paidAmount"
  | "paymentMethod"
  | "paidDate"
  | "dueDate";

const FIELD_LABEL: Record<EditableField, string> = {
  name: "Name",
  phone: "Phone",
  duration: "Duration (months)",
  planAmount: "Plan Amount",
  paidAmount: "Paid Amount",
  paymentMethod: "Payment Method",
  paidDate: "Paid Date",
  dueDate: "Due Date",
};

const DATE_FORMAT = /^(\d{2})-(\d{2})-(\d{4})$/;
const DUPLICATE_IN_FILE_MSG = "Duplicate phone in file";

/**
 * `revalidateImportRow` only re-validates the single edited row, so its
 * `isDuplicateInFile` reflects a batch-of-one and is always false — it
 * can't see the other rows still sitting in preview state. Recompute the
 * duplicate-phone flag (and matching warning text) across the *whole*
 * current row set after every edit, since changing one row's phone can
 * also flip the duplicate status of whichever other row it used to (or
 * now does) collide with.
 */
function recomputeDuplicateFlags(rows: ValidatedImportRow[]): ValidatedImportRow[] {
  const phoneCounts = new Map<string, number>();
  for (const r of rows) {
    if (r.parsed?.phone) {
      phoneCounts.set(r.parsed.phone, (phoneCounts.get(r.parsed.phone) ?? 0) + 1);
    }
  }

  return rows.map((r) => {
    const isDuplicateInFile = Boolean(
      r.parsed?.phone && (phoneCounts.get(r.parsed.phone) ?? 0) > 1
    );
    if (isDuplicateInFile === r.isDuplicateInFile) return r;

    const warnings = r.warnings.filter((w) => w !== DUPLICATE_IN_FILE_MSG);
    if (isDuplicateInFile) warnings.push(DUPLICATE_IN_FILE_MSG);

    const status: ValidatedImportRow["status"] =
      r.errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid";

    return { ...r, isDuplicateInFile, warnings, status };
  });
}

/** Best-effort mapping from a row's error strings back to the raw field(s)
 *  that need editing. Agent 1's `FieldErrorReason` is a plain string (by
 *  design, so validate.ts can add new reasons freely), so this is
 *  substring matching rather than a typed lookup. */
function getErrorFields(row: ValidatedImportRow): Set<EditableField> {
  const fields = new Set<EditableField>();

  for (const err of row.errors) {
    if (err.includes("Name")) fields.add("name");
    if (err.includes("Phone") || err.includes("phone")) fields.add("phone");
    if (err.includes("Duration given but Plan Amount")) fields.add("planAmount");
    else if (err.includes("Plan Amount given but Duration")) fields.add("duration");
    else if (err.includes("Duration must be")) fields.add("duration");
    if (err.includes("Plan Amount must be")) fields.add("planAmount");
    if (err.includes("Paid Amount must be")) fields.add("paidAmount");
    if (err.includes("Due date missing")) fields.add("dueDate");
    if (err.includes("Paid date missing")) fields.add("paidDate");
    if (err.includes("Invalid date format")) {
      // Ambiguous by message alone — figure out which raw date field is
      // actually malformed and only flag that one (flag both if both are).
      const dueBad = row.raw.dueDate.trim() !== "" && !DATE_FORMAT.test(row.raw.dueDate.trim());
      const paidBad = row.raw.paidDate.trim() !== "" && !DATE_FORMAT.test(row.raw.paidDate.trim());
      if (dueBad) fields.add("dueDate");
      if (paidBad) fields.add("paidDate");
      if (!dueBad && !paidBad) {
        fields.add("dueDate");
        fields.add("paidDate");
      }
    }
  }

  return fields;
}

function StatusIcon({ status }: { status: ValidatedImportRow["status"] }) {
  if (status === "valid") return <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Valid" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500" aria-label="Warning" />;
  return <XCircle className="h-4 w-4 text-red-500" aria-label="Error" />;
}

export function ImportPreviewTable({ rows, onRowsChange, onConfirm, workspaceId }: ImportPreviewTableProps) {
  const [reviewed, setReviewed] = useState(false);
  const [revalidatingRow, setRevalidatingRow] = useState<number | null>(null);

  const counts = useMemo(() => {
    let valid = 0, warning = 0, error = 0;
    for (const r of rows) {
      if (r.status === "valid") valid++;
      else if (r.status === "warning") warning++;
      else error++;
    }
    return { valid, warning, error };
  }, [rows]);

  // Errors/warnings need eyes-on review, so they're always shown in full.
  // Clean rows don't — once there are more than a handful, listing every one
  // just adds scroll without adding anything to check, so they collapse
  // behind a single summary row by default (still expandable on demand).
  const attentionRows = useMemo(() => rows.filter((r) => r.status !== "valid"), [rows]);
  const validRows = useMemo(() => rows.filter((r) => r.status === "valid"), [rows]);
  const VALID_COLLAPSE_THRESHOLD = 8;
  const [showValidRows, setShowValidRows] = useState(validRows.length <= VALID_COLLAPSE_THRESHOLD);

  const canConfirm = counts.error === 0 && reviewed;

  async function handleFieldEdit(rowNumber: number, field: EditableField, newValue: string) {
    const rowIndex = rows.findIndex((r) => r.raw.rowNumber === rowNumber);
    if (rowIndex === -1) return;

    const updatedRaw: RawImportRow = { ...rows[rowIndex].raw, [field]: newValue };

    setRevalidatingRow(rowNumber);
    try {
      const revalidated = await revalidateImportRow(updatedRaw, workspaceId);
      const nextRows = [...rows];
      nextRows[rowIndex] = revalidated;
      onRowsChange(recomputeDuplicateFlags(nextRows));
    } finally {
      setRevalidatingRow(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary strip */}
      <div className="flex items-center gap-4 px-1 pb-4 text-sm font-medium">
        <span className="flex items-center gap-1.5 text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> {counts.valid} valid
        </span>
        <span className="flex items-center gap-1.5 text-amber-600">
          <AlertTriangle className="h-4 w-4" /> {counts.warning} warning{counts.warning !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5 text-red-600">
          <XCircle className="h-4 w-4" /> {counts.error} error{counts.error !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2">
        {attentionRows.map((row) => {
          const editableFields = row.status === "error" ? getErrorFields(row) : new Set<EditableField>();
          const isRevalidating = revalidatingRow === row.raw.rowNumber;

          return (
            <div
              key={row.raw.rowNumber}
              className={`rounded-xl border p-3 sm:p-4 ${
                row.status === "error" ? "border-red-200 bg-red-50/40" : "border-amber-200 bg-amber-50/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {isRevalidating ? (
                    <Loader2 className="h-4 w-4 text-gray-400 animate-spin shrink-0" />
                  ) : (
                    <StatusIcon status={row.status} />
                  )}
                  <span className="text-xs font-medium text-gray-400 shrink-0">
                    Row {row.raw.rowNumber}
                  </span>
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {row.parsed?.name || row.raw.name || "—"}
                  </span>
                </div>
                <span className="text-xs text-gray-500 shrink-0">
                  {row.parsed?.phone || row.raw.phone || "—"}
                </span>
              </div>

              {/* Inline-editable fields for error rows */}
              {row.status === "error" && editableFields.size > 0 && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from(editableFields).map((field) => (
                    <div key={field}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {FIELD_LABEL[field]}
                      </label>
                      <input
                        type="text"
                        defaultValue={row.raw[field]}
                        onBlur={(e) => {
                          if (e.target.value !== row.raw[field]) {
                            handleFieldEdit(row.raw.rowNumber, field, e.target.value);
                          }
                        }}
                        className="w-full min-h-11 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        placeholder={field === "duration" ? "e.g. 3" : field.includes("Date") ? "DD-MM-YYYY" : ""}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Errors / warnings text — always visible, not hover-only */}
              {row.errors.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {row.errors.map((err, i) => (
                    <li key={i} className="text-xs text-red-600">
                      {err}
                    </li>
                  ))}
                </ul>
              )}
              {row.warnings.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {row.warnings.map((warn, i) => (
                    <li key={i} className="text-xs text-amber-600">
                      {warn}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {/* Clean rows: collapsed behind a summary once there are more than a
            handful, so a 50+ member file doesn't turn into pure scroll for
            rows that need no action. Always expandable on demand. */}
        {validRows.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setShowValidRows((v) => !v)}
              className="w-full flex items-center justify-between gap-3 px-3 sm:px-4 py-3 text-left"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {validRows.length} valid row{validRows.length !== 1 ? "s" : ""} — nothing to review
              </span>
              {showValidRows ? (
                <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
              )}
            </button>

            {showValidRows && (
              <div className="border-t border-gray-100 divide-y divide-gray-100">
                {validRows.map((row) => (
                  <div key={row.raw.rowNumber} className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-label="Valid" />
                      <span className="text-xs font-medium text-gray-400 shrink-0">
                        Row {row.raw.rowNumber}
                      </span>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {row.parsed?.name || row.raw.name || "—"}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">
                      {row.parsed?.phone || row.raw.phone || "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm footer */}
      <div className="pt-4 mt-4 border-t border-gray-100 space-y-3">
        <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30"
          />
          I&apos;ve reviewed the data above
        </label>

        <button
          onClick={onConfirm}
          disabled={!canConfirm}
          className="w-full min-h-11 flex items-center justify-center rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
        >
          Confirm Import
        </button>
      </div>
    </div>
  );
}
