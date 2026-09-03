"use client";

import { Calendar } from "lucide-react";
import type { RevenuePeriod } from "@/lib/fees/revenue-filter";

interface RevenueFilterBarProps {
  period: RevenuePeriod;
  customStart: string;
  customEnd: string;
  onPeriodChange: (period: RevenuePeriod) => void;
  onCustomStartChange: (date: string) => void;
  onCustomEndChange: (date: string) => void;
}

const OPTIONS: { value: RevenuePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

export function RevenueFilterBar({
  period,
  customStart,
  customEnd,
  onPeriodChange,
  onCustomStartChange,
  onCustomEndChange,
}: RevenueFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onPeriodChange(opt.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              period === opt.value
                ? "bg-emerald-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={customStart}
            max={customEnd || undefined}
            onChange={(e) => onCustomStartChange(e.target.value)}
            className="text-sm text-gray-700 outline-none"
          />
          <span className="text-gray-400">–</span>
          <input
            type="date"
            value={customEnd}
            min={customStart || undefined}
            onChange={(e) => onCustomEndChange(e.target.value)}
            className="text-sm text-gray-700 outline-none"
          />
        </div>
      )}
    </div>
  );
}
