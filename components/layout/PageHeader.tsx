"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Controlled search value. Omit `search` entirely if this module has no search. */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  /** Right-aligned action, e.g. an "Add Member" button. */
  actions?: ReactNode;
}

/**
 * Shared header block for every module page in the app ([app] dashboard).
 * Keeps title/subtitle/search/actions visually consistent instead of each
 * page re-implementing its own "flex items-start justify-between" block.
 */
export function PageHeader({ title, subtitle, search, actions }: PageHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {search && (
        <div className="relative max-w-md">
          <Search
            aria-hidden="true"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          />
          <input
            type="search"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            placeholder={search.placeholder ?? "Search..."}
            aria-label={search.placeholder ?? "Search"}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
      )}
    </div>
  );
}
