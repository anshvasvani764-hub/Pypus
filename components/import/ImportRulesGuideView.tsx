"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ImportUploadModal } from "@/components/import/ImportUploadModal";
import { generateImportTemplate } from "@/lib/import/template";

interface ImportRulesGuideViewProps {
  workspaceSlug: string;
  workspaceId: string;
}

const RULES: string[] = [
  "Use only the template you download below — don't rename any column headers. You can reorder the columns freely; we match each one by its header name, not its position.",
  "Name and Phone are required for every row.",
  "If a member has a plan, fill in both Duration (months) and Plan Amount together. Leave both blank if the member has no plan — don't fill in just one.",
  "Duration must be a whole number from 1 to 12.",
  "Enter amounts as plain numbers only — no ₹ symbol and no commas (e.g. 1500, not ₹1,500).",
  "Phone must be a 10-digit number, with no +91 prefix and no spaces.",
  "Dates must be written in DD-MM-YYYY format.",
  "If a member has fully paid, Paid Date is required. If any amount is still pending, Due Date is required instead.",
  "If the same phone number appears more than once in your file, every matching row will be flagged so you can choose which one to keep.",
  "If a phone number already exists in your Pypus account, that row will be skipped automatically — the existing member won't be touched.",
  "Rows with missing or invalid data won't be imported. You'll see exactly which row and field caused the problem, and can fix it directly in the preview before importing.",
  "You must review the preview screen before the Import button becomes active.",
  "Maximum 500 rows per file — split larger member lists into multiple uploads.",
  "Accepted file types: .csv, .xls, and .xlsx.",
];

function downloadTemplate() {
  const blob = generateImportTemplate();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "member-import-template.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportRulesGuideView({ workspaceSlug, workspaceId }: ImportRulesGuideViewProps) {
  const router = useRouter();
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setHasReachedEnd(true);
        }
      },
      { threshold: 0.01 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full max-w-3xl px-6 sm:px-8 py-6 pb-28">
      <PageHeader
        title="Import Members from Excel"
        subtitle="Bring your existing member list into Pypus in one go"
        backHref={`/${workspaceSlug}/members`}
      />

      <button
        onClick={downloadTemplate}
        className="mt-6 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
      >
        <Download className="h-4 w-4" />
        Download Template
      </button>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 sm:p-7">
        <div className="flex items-center gap-2 mb-5">
          <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-900">Before you upload, please read</h2>
        </div>

        <ol className="space-y-4">
          {RULES.map((rule, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-700 leading-relaxed">
              <span className="shrink-0 h-6 w-6 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span>{rule}</span>
            </li>
          ))}
        </ol>

        {/* Sentinel — IntersectionObserver flips hasReachedEnd once this scrolls into view */}
        <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />
      </div>

      {/* Fixed continue bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between gap-4">
          <p className="text-xs text-gray-500 hidden sm:block">
            {hasReachedEnd
              ? "You're all set — you've reviewed every rule."
              : "Scroll down to read all the rules before continuing."}
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            disabled={!hasReachedEnd}
            className="ml-auto flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
          >
            <CheckCircle2 className="h-4 w-4" />
            Understood, Continue
          </button>
        </div>
      </div>

      <ImportUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        workspaceId={workspaceId}
        onImportComplete={() => router.refresh()}
      />
    </div>
  );
}
