"use client";

import { useEffect, useRef, useState } from "react";
import { Filter, ChevronDown } from "lucide-react";
import { type RevenuePeriod, getPeriodRange, periodLabel } from "@/lib/fees/revenue-filter";

interface RevenueFilterBarProps {
  period: RevenuePeriod;
  customStart: string;
  customEnd: string;
  customDate: string;
  onPeriodChange: (period: RevenuePeriod) => void;
  onCustomStartChange: (date: string) => void;
  onCustomEndChange: (date: string) => void;
  onCustomDateChange: (date: string) => void;
}

const OPTIONS: { value: RevenuePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "day", label: "Specific Date" },
  { value: "custom", label: "Custom Range" },
];

export function RevenueFilterBar({
  period,
  customStart,
  customEnd,
  customDate,
  onPeriodChange,
  onCustomStartChange,
  onCustomEndChange,
  onCustomDateChange,
}: RevenueFilterBarProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const buttonLabel =
    OPTIONS.find((o) => o.value === period)?.label ?? "Filter";
  const rangeLabel = periodLabel(period, getPeriodRange(period, customStart, customEnd, customDate));

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Filter className="h-4 w-4 text-gray-400" />
        {buttonLabel}
        {(period === "custom" || period === "day") && (
          <span className="text-gray-400 font-normal">· {rangeLabel}</span>
        )}
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-2 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onPeriodChange(opt.value);
                if (opt.value !== "custom" && opt.value !== "day") setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                period === opt.value
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}

          {period === "day" && (
            <div className="mt-1 flex items-center gap-2 border-t border-gray-100 px-3 pt-3 pb-1">
              <input
                type="date"
                value={customDate}
                onChange={(e) => onCustomDateChange(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-700 outline-none"
              />
            </div>
          )}

          {period === "custom" && (
            <div className="mt-1 flex items-center gap-2 border-t border-gray-100 px-3 pt-3 pb-1">
              <input
                type="date"
                value={customStart}
                max={customEnd || undefined}
                onChange={(e) => onCustomStartChange(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-700 outline-none"
              />
              <span className="text-gray-400 shrink-0">–</span>
              <input
                type="date"
                value={customEnd}
                min={customStart || undefined}
                onChange={(e) => onCustomEndChange(e.target.value)}
                className="w-full min-w-0 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-700 outline-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
