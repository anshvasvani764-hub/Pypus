"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface RevenueExpensesCardProps {
  workspaceId: string;
  initialRevenue: number;
  initialExpenses: number;
  initialMonth: number;
  initialYear: number;
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function RevenueExpensesCard({
  workspaceId,
  initialRevenue,
  initialExpenses,
  initialMonth,
  initialYear,
}: RevenueExpensesCardProps) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [revenue, setRevenue] = useState(initialRevenue);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [loading, setLoading] = useState(false);

  const fetchMonth = useCallback(
    async (m: number, y: number) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/dashboard/revenue-expenses?workspaceId=${encodeURIComponent(workspaceId)}&month=${m}&year=${y}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data = await res.json();
          setRevenue(data.revenue);
          setExpenses(data.expenses);
          setMonth(data.month);
          setYear(data.year);
        }
      } catch (err) {
        console.error("Failed to fetch revenue/expenses:", err);
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  const shiftMonth = useCallback(
    (delta: number) => {
      let m = month + delta;
      let y = year;
      if (m < 1) {
        m = 12;
        y -= 1;
      } else if (m > 12) {
        m = 1;
        y += 1;
      }
      fetchMonth(m, y);
    },
    [month, year, fetchMonth]
  );

  const profit = revenue - expenses;
  const profitLabel = profit < 0 ? "Loss" : "Profit";

  return (
    <div className="col-span-2 rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Month nav */}
      <div className="flex items-center justify-between px-5 pt-4">
        <button
          onClick={() => shiftMonth(-1)}
          className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-gray-900">
          {MONTH_NAMES[month - 1]} {year}
        </p>
        <button
          onClick={() => shiftMonth(1)}
          className="h-8 w-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Revenue | Expenses split */}
      <div className="mt-3 grid grid-cols-2">
        <div className="px-6 py-4">
          <p className="text-xs font-medium text-gray-500">Revenue</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {loading ? "—" : formatCurrency(revenue)}
          </p>
        </div>
        <div className="px-6 py-4 border-l border-gray-100">
          <p className="text-xs font-medium text-gray-500">Expenses</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {loading ? "—" : formatCurrency(expenses)}
          </p>
        </div>
      </div>

      {/* Profit row (full width) */}
      <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50">
        <p className="text-sm font-bold text-gray-900">
          {profitLabel}:{" "}
          <span className={profit < 0 ? "text-red-600" : "text-emerald-600"}>
            {loading ? "—" : formatCurrency(Math.abs(profit))}
          </span>
        </p>
      </div>
    </div>
  );
}