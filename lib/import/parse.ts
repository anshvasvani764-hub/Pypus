// ──────────────────────────────────────────────
// Member bulk-import — file parser
//
// Reads a user-uploaded .csv/.xls/.xlsx file into raw, untyped rows. All
// type coercion and business-rule validation happens later in validate.ts —
// this file's only job is: get the right cell into the right field, by
// header name, regardless of column order or file format.
// ──────────────────────────────────────────────

import * as XLSX from "xlsx";
import type { RawImportRow } from "./types";

/** Hard cap on data rows per import — larger files should be split. */
const MAX_DATA_ROWS = 500;

/** Maps a lowercased, trimmed header to the RawImportRow field it fills. */
const HEADER_MAP: Record<string, keyof Omit<RawImportRow, "rowNumber">> = {
  name: "name",
  phone: "phone",
  email: "email",
  "duration (months)": "duration",
  duration: "duration",
  "plan amount": "planAmount",
  "paid amount": "paidAmount",
  "payment method": "paymentMethod",
  "paid date": "paidDate",
  "due date": "dueDate",
};

function normalizeHeader(header: unknown): string {
  return String(header ?? "").trim().toLowerCase();
}

/**
 * Converts a cell value to a plain string for RawImportRow. Handles Excel's
 * serial-date-number quirk: date cells can come through as numbers (e.g.
 * 45930) instead of text, so those are converted to "DD-MM-YYYY" using
 * SheetJS's date parsing rather than being stringified as a raw number.
 */
function cellToString(value: unknown, isDateColumn: boolean): string {
  if (value === null || value === undefined) return "";

  if (isDateColumn && typeof value === "number") {
    const parsedDate = XLSX.SSF.parse_date_code(value);
    if (parsedDate) {
      const dd = String(parsedDate.d).padStart(2, "0");
      const mm = String(parsedDate.m).padStart(2, "0");
      const yyyy = String(parsedDate.y);
      return `${dd}-${mm}-${yyyy}`;
    }
  }

  return String(value).trim();
}

const DATE_FIELDS = new Set(["paidDate", "dueDate"]);

/**
 * Parses an uploaded member-import spreadsheet (.csv, .xls, or .xlsx) into
 * raw rows, matching columns by header name (case-insensitive, order
 * doesn't matter). Throws if the file has more than 500 data rows.
 */
export async function parseImportFile(file: File): Promise<RawImportRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: false });

  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  // header: 1 => array-of-arrays so we control header matching ourselves
  // instead of trusting SheetJS's auto object-key generation.
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  if (rows.length === 0) {
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  const columnFieldByIndex: Array<keyof Omit<RawImportRow, "rowNumber"> | null> =
    headerRow.map((header) => HEADER_MAP[normalizeHeader(header)] ?? null);

  // Drop fully-blank trailing rows (common with copy-pasted ranges).
  const meaningfulDataRows = dataRows.filter((row) =>
    row.some((cell) => String(cell ?? "").trim() !== "")
  );

  if (meaningfulDataRows.length > MAX_DATA_ROWS) {
    throw new Error(
      `File has more than ${MAX_DATA_ROWS} rows, please split into multiple files`
    );
  }

  return meaningfulDataRows.map((row, dataRowIndex) => {
    const parsedRow: RawImportRow = {
      // +1 for 1-indexing, +1 for the header row itself.
      rowNumber: dataRowIndex + 2,
      name: "",
      phone: "",
      email: "",
      duration: "",
      planAmount: "",
      paidAmount: "",
      paymentMethod: "",
      paidDate: "",
      dueDate: "",
    };

    columnFieldByIndex.forEach((field, columnIndex) => {
      if (!field) return;
      const isDateColumn = DATE_FIELDS.has(field);
      parsedRow[field] = cellToString(row[columnIndex], isDateColumn);
    });

    return parsedRow;
  });
}
