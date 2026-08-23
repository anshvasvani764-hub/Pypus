"use client";

import { useRef, useState } from "react";
import { X, UploadCloud, FileSpreadsheet, AlertCircle } from "lucide-react";
import { ImportPreviewTable } from "./ImportPreviewTable";
import { ImportProcessingResult } from "./ImportProcessingResult";
import { parseAndValidateImportFile } from "@/app/actions/import-validate";
// STUB — Agent 3 replaces this with the real server action.
import { importMembersFromExcel } from "@/app/actions/import-members";
import type { ValidatedImportRow, ImportResult } from "@/lib/import/types";

type ImportStep = "upload" | "preview" | "processing" | "result";

const ACCEPTED_EXTENSIONS = [".csv", ".xls", ".xlsx"];

interface ImportUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  /** Called after a successful import so the parent page can refresh its
   *  member list. Not part of the original task spec's prop list, but
   *  needed to reflect newly-imported members without a manual reload. */
  onImportComplete?: () => void;
}

function hasAcceptedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function ImportUploadModal({ isOpen, onClose, workspaceId, onImportComplete }: ImportUploadModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [rows, setRows] = useState<ValidatedImportRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  function resetAndClose() {
    setStep("upload");
    setIsDragging(false);
    setIsLoading(false);
    setUploadError(null);
    setRows([]);
    setResult(null);
    onClose();
  }

  async function handleFile(file: File) {
    setUploadError(null);

    if (!hasAcceptedExtension(file.name)) {
      setUploadError("Please upload a .csv, .xls, or .xlsx file.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await parseAndValidateImportFile(formData, workspaceId);
      if (!response.ok) {
        setUploadError(response.error);
        return;
      }
      setRows(response.rows);
      setStep("preview");
    } catch {
      setUploadError("Something went wrong reading this file. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function handleConfirmImport() {
    setStep("processing");
    try {
      const importResult = await importMembersFromExcel(rows, workspaceId);
      setResult(importResult);
      setStep("result");
      if (importResult.success) {
        onImportComplete?.();
      }
    } catch {
      setResult({
        success: false,
        importedCount: 0,
        plansCreatedCount: 0,
        feesCreatedCount: 0,
        skippedCount: 0,
        memberErrors: [],
        feeErrors: [],
      });
      setStep("result");
    }
  }

  const title =
    step === "upload"
      ? "Upload Member File"
      : step === "preview"
      ? "Review Before Import"
      : step === "processing"
      ? "Importing…"
      : "Import Result";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            onClick={resetAndClose}
            disabled={step === "processing"}
            className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-30"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1">
          {step === "upload" && (
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                  isDragging ? "border-emerald-500 bg-emerald-50/60" : "border-gray-200 bg-gray-50/60"
                }`}
              >
                {isLoading ? (
                  <>
                    <FileSpreadsheet className="h-10 w-10 text-emerald-600 animate-pulse" />
                    <p className="text-sm font-medium text-gray-700">Reading your file…</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-10 w-10 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">
                      Drag and drop your file here
                    </p>
                    <p className="text-xs text-gray-400">.csv, .xls, or .xlsx — up to 500 rows</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 min-h-11 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                    >
                      Select from Device
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xls,.xlsx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </>
                )}
              </div>

              {uploadError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}

          {step === "preview" && (
            <ImportPreviewTable
              rows={rows}
              onRowsChange={setRows}
              onConfirm={handleConfirmImport}
              workspaceId={workspaceId}
            />
          )}

          {(step === "processing" || step === "result") && (
            <ImportProcessingResult status={step === "processing" ? "processing" : "done"} result={result} />
          )}
        </div>

        {step === "result" && (
          <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex justify-end">
            <button
              onClick={resetAndClose}
              className="min-h-11 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
