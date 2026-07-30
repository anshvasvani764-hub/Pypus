"use client";

import { MEMBER_FILTERS } from "@/lib/members/mock-data";

interface MemberFiltersProps {
  activeFilter: string;
  onFilterChange: (value: string) => void;
}

export function MemberFilters({ activeFilter, onFilterChange }: MemberFiltersProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {MEMBER_FILTERS.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
            activeFilter === filter.value
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
