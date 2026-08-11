"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useSearch } from "@/context/SearchContext";
import {
  ChevronRight,
  Search,
  Bell,
  HelpCircle,
} from "lucide-react";

interface GlobalHeaderProps {
  /** e.g. "Ansh's Gym" or "Managment App" — the active workspace name */
  workspaceName: string;
  /** e.g. "Members", "Attendance" — current module, shown as last breadcrumb crumb */
  currentPage?: string;
  /** Global search (⌘K) — separate from per-module PageHeader search */
  onSearchClick?: () => void;
  notificationCount?: number;
  avatarUrl?: string;
  userName?: string;
}

/**
 * App-wide top bar — sits above every page's PageHeader, sticky.
 * Brand mark -> workspace switcher -> current module crumb, with global
 * search + notifications + profile on the right. Mirrors the
 * logo/org/project breadcrumb pattern from tools like Vercel, but in
 * Pypus's light "Professional Business OS" theme.
 */
export function GlobalHeader({
  workspaceName,
  currentPage,
  notificationCount = 0,
  avatarUrl,
  userName,
}: GlobalHeaderProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { searchQuery, setSearchQuery } = useSearch();
  const pathname = usePathname();

  const showSearch =
    pathname.endsWith("/members") ||
    pathname.endsWith("/attendance") ||
    pathname.endsWith("/fees") ||
    pathname.endsWith("/team") ||
    pathname.endsWith("/expenses");

  let placeholder = "Search...";
  if (pathname.endsWith("/members")) {
    placeholder = "Search members...";
  } else if (pathname.endsWith("/attendance")) {
    placeholder = "Search members by name or ID...";
  } else if (pathname.endsWith("/fees")) {
    placeholder = "Search fees...";
  } else if (pathname.endsWith("/team")) {
    placeholder = "Search staff...";
  } else if (pathname.endsWith("/expenses")) {
    placeholder = "Search expenses...";
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    setSearchQuery("");
  }, [pathname, setSearchQuery]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-gray-200 bg-white/80 px-5 backdrop-blur-md"
    >
      {/* Left: brand + breadcrumb */}
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-base font-bold text-gray-900 tracking-tight font-sans">
          {workspaceName}
        </span>

        {currentPage && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
            <span className="truncate text-sm font-medium text-gray-500">
              {currentPage}
            </span>
          </>
        )}
      </div>

      {/* Right: icons + search */}
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Help"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-semibold text-white ring-2 ring-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>

        {/* Search */}
        {showSearch && (
          <div
            className={`hidden md:flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm text-gray-400 transition-all w-64 ${
              focused
                ? "border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Search className="h-4 w-4 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={placeholder}
              className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
            <kbd className="ml-auto flex shrink-0 items-center gap-0.5 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
              ⌘K
            </kbd>
          </div>
        )}
      </div>
    </motion.header>
  );
}