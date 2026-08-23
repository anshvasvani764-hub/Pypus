"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { ImportProcessingResultProps } from "./import-processing-result.types";
import type { ImportRowError } from "@/lib/import/types";

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 min-w-[92px]">
      <span className="text-lg font-semibold text-gray-900">{value}</span>
      <span className="text-[11px] text-gray-500 mt-0.5">{label}</span>
    </div>
  );
}

function ErrorList({ title, errors }: { title: string; errors: ImportRowError[] }) {
  const [open, setOpen] = useState(false);
  if (errors.length === 0) return null;

  return (
    <div className="w-full border border-red-100 bg-red-50/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-red-700">
          {title} ({errors.length})
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-red-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-red-500" />
        )}
      </button>
      {open && (
        <div className="max-h-56 overflow-y-auto border-t border-red-100">
          {errors.map((err, idx) => (
            <div
              key={`${err.rowNumber}-${idx}`}
              className="px-4 py-2.5 text-xs border-b border-red-100 last:border-b-0"
            >
              <p className="font-medium text-gray-900">
                Row {err.rowNumber} · {err.name || "Unnamed"}{" "}
                {err.phone && <span className="text-gray-400">· {err.phone}</span>}
              </p>
              <p className="text-red-600 mt-0.5">{err.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ImportProcessingResult({ status, result }: ImportProcessingResultProps) {
  if (status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mb-4" />
        <p className="text-sm font-medium text-gray-900">Importing your members…</p>
        <p className="mt-1 text-xs text-gray-500">This won&apos;t take long.</p>
      </div>
    );
  }

  const success = result?.success ?? false;
  const hasErrors = (result?.memberErrors.length ?? 0) > 0 || (result?.feeErrors.length ?? 0) > 0;

  return (
    <div className="flex flex-col items-center py-10 px-4 gap-5">
      {success ? (
        <CheckCircle2 className="h-9 w-9 text-emerald-600" />
      ) : hasErrors && (result?.importedCount ?? 0) > 0 ? (
        <AlertTriangle className="h-9 w-9 text-amber-500" />
      ) : (
        <XCircle className="h-9 w-9 text-red-500" />
      )}

      <div className="text-center">
        <p className="text-sm font-semibold text-gray-900">
          {success
            ? "Import complete"
            : (result?.importedCount ?? 0) > 0
              ? "Import finished with some errors"
              : "Import failed"}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {success
            ? "All members were imported successfully."
            : "Some rows couldn't be imported — see details below."}
        </p>
      </div>

      {result && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <StatPill label="Imported" value={result.importedCount} />
          <StatPill label="Plans created" value={result.plansCreatedCount} />
          <StatPill label="Fees created" value={result.feesCreatedCount} />
          <StatPill label="Skipped" value={result.skippedCount} />
        </div>
      )}

      {result && (
        <div className="w-full flex flex-col gap-2">
          <ErrorList title="Members not imported" errors={result.memberErrors} />
          <ErrorList title="Fees not created" errors={result.feeErrors} />
        </div>
      )}
    </div>
  );
}
