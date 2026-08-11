"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useParams } from "next/navigation";
import { useSearch } from "@/context/SearchContext";
import { MODULE_REGISTRY } from "@/lib/modules/module-registry";
import {
  ChevronRight,
  ChevronsUpDown,
  Search,
  Bell,
  HelpCircle,
  Home,
  LayoutGrid,
  Bot,
  Settings,
  UsersRound,
  Check,
} from "lucide-react";

interface GlobalHeaderProps {
  /** e.g. "Ansh's Gym" or "Managment App" — the active workspace name */
  workspaceName: string;
  /** e.g. "Members", "Attendance" — current module, shown as last breadcrumb crumb.
   *  Optional override — if omitted, it's derived from the current route. */
  currentPage?: string;
  /** Global search (⌘K) — separate from per-module PageHeader search */
  onSearchClick?: () => void;
  notificationCount?: number;
  avatarUrl?: string;
  userName?: string;
}

/** Static top entries shown above the module list in the switcher, in order. */
const TOP_NAV_ITEMS = [
  { slug: "", label: "Home", icon: Home },
  { slug: "workspace", label: "Workspace", icon: LayoutGrid },
  { slug: "assistant", label: "AI Assistant", icon: Bot },
];

/** Entries shown below the module list. */
const BOTTOM_NAV_ITEMS = [
  { slug: "team", label: "Team", icon: UsersRound },
  { slug: "settings", label: "Settings", icon: Settings },
];

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
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);
  const { searchQuery, setSearchQuery } = useSearch();
  const pathname = usePathname();
  const { app } = useParams<{ app: string }>();
  const base = `/${app}`;

  // All switcher entries in display order, used for both the dropdown list
  // and for deriving the active route's label.
  const switcherItems = [
    ...TOP_NAV_ITEMS,
    ...MODULE_REGISTRY.map((m) => ({ slug: m.slug, label: m.title, icon: m.icon })),
    ...BOTTOM_NAV_ITEMS,
  ];

  const activeItem = switcherItems.find((item) =>
    item.slug ? pathname.endsWith(`${base}/${item.slug}`) : pathname === base
  );
  const resolvedCurrentPage = currentPage ?? activeItem?.label;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setSwitcherOpen(false);
  }, [pathname]);

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
      {/* Left: brand + breadcrumb + switcher */}
      <div className="relative flex min-w-0 items-center gap-2" ref={switcherRef}>
        <button
          type="button"
          onClick={() => setSwitcherOpen((prev) => !prev)}
          aria-label="Switch page"
          aria-expanded={switcherOpen}
          className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 -ml-1.5 text-gray-900 hover:bg-gray-100 transition-colors"
        >
          <span className="text-base font-bold tracking-tight font-sans">
            {workspaceName}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        </button>

        {resolvedCurrentPage && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
            <span className="truncate text-sm font-medium text-gray-500">
              {resolvedCurrentPage}
            </span>
          </>
        )}

        <AnimatePresence>
          {switcherOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg py-1.5 z-50"
            >
              <p className="px-3 pt-1.5 pb-2 text-[11px] font-bold tracking-wide text-gray-400 uppercase">
                Go to
              </p>
              {switcherItems.map((item) => {
                const href = item.slug ? `${base}/${item.slug}` : base;
                const isActive = item === activeItem;
                const Icon = item.icon;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setSwitcherOpen(false)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700 font-semibold"
                        : "text-gray-700 font-medium hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </Link>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
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