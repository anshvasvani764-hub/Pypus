"use server";

// Thin server-side wrapper around Agent 1's lib/import/parse.ts and
// lib/import/validate.ts.
//
// Why this file exists (see summary for full note): validate.ts calls
// createServiceClient(), which reads SUPABASE_SERVICE_ROLE_KEY — a secret
// that only exists in the server environment. ImportUploadModal and
// ImportPreviewTable are client components, so they can't import
// lib/import/validate.ts directly (it would either fail to bundle or run
// with an undefined service key at runtime). Routing both calls through
// this "use server" action keeps Agent 1's files completely untouched
// while giving Agent 2's UI a safe way to call them.

import { parseImportFile } from "@/lib/import/parse";
import { validateImportRows } from "@/lib/import/validate";
import type { RawImportRow, ValidatedImportRow } from "@/lib/import/types";

export type ParseAndValidateResult =
  | { ok: true; rows: ValidatedImportRow[] }
  | { ok: false; error: string };

/** Used by ImportUploadModal on initial file selection. */
export async function parseAndValidateImportFile(
  formData: FormData,
  workspaceId: string
): Promise<ParseAndValidateResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "No file was received. Please try again." };
  }

  try {
    const rawRows = await parseImportFile(file);
    if (rawRows.length === 0) {
      return { ok: false, error: "This file doesn't have any data rows." };
    }
    const validated = await validateImportRows(rawRows, workspaceId);
    return { ok: true, rows: validated };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not read this file.";
    return { ok: false, error: message };
  }
}

/** Used by ImportPreviewTable to re-validate a single row after an inline
 *  edit, without re-uploading the whole file. */
export async function revalidateImportRow(
  raw: RawImportRow,
  workspaceId: string
): Promise<ValidatedImportRow> {
  const [revalidated] = await validateImportRows([raw], workspaceId);
  return revalidated;
}
