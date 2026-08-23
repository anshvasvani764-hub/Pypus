// ──────────────────────────────────────────────
// Member bulk-import — template generator
//
// Agent 2's UI calls `generateImportTemplate()` directly from the
// "Download Template" button's click handler, e.g.:
//
//   const blob = generateImportTemplate();
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement("a");
//   a.href = url;
//   a.download = "member-import-template.xlsx";
//   a.click();
//   URL.revokeObjectURL(url);
//
// Signature: generateImportTemplate(): Blob
// ──────────────────────────────────────────────

import * as XLSX from "xlsx";

/** Column headers, in the exact order and exact text parse.ts matches
 *  against (case-insensitive, whitespace-trimmed). */
const TEMPLATE_HEADERS = [
  "Name",
  "Phone",
  "Email",
  "Duration (months)",
  "Plan Amount",
  "Paid Amount",
  "Payment Method",
  "Paid Date",
  "Due Date",
] as const;

/**
 * One illustrative sample row shown under the headers so the owner can see
 * the expected format at a glance. This is realistic sample data, not a
 * special sentinel row — if left in and re-uploaded, it will be validated
 * and imported like any other row (no skip logic is applied to it), so the
 * row is deliberately named obviously enough ("Ravi Kumar" / placeholder
 * phone) that an owner filling in real members will notice and delete it.
 */
// This sample row is fully paid (Paid Amount == Plan Amount), so per
// validate.ts rules it carries a Paid Date and leaves Due Date blank — a
// fully-paid member's next due date is computed later from the plan
// duration, not entered on import.
const SAMPLE_ROW = [
  "Ravi Kumar (example — delete this row)",
  "9876543210",
  "ravi.kumar@example.com",
  "3",
  "1500",
  "1500",
  "UPI",
  "01-04-2026",
  "",
];

/**
 * Builds the downloadable member-import template as an .xlsx workbook with
 * the header row plus one greyed-out example row.
 */
export function generateImportTemplate(): Blob {
  const worksheet = XLSX.utils.aoa_to_sheet([
    [...TEMPLATE_HEADERS],
    SAMPLE_ROW,
  ]);

  // Reasonable default column widths so headers/sample data aren't truncated.
  worksheet["!cols"] = TEMPLATE_HEADERS.map((header) => ({
    wch: Math.max(header.length + 2, 18),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Members");

  const arrayBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  return new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
