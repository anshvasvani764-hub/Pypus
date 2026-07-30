"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarCheck, Wallet, Dumbbell } from "lucide-react";

interface Tab {
  label: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
}

interface MemberTabsProps {
  basePath: string; // e.g. "/slug/members/mem-001"
}

export function MemberTabs({ basePath }: MemberTabsProps) {
  const pathname = usePathname();

  const tabs: Tab[] = [
    { label: "Overview", href: basePath, icon: LayoutDashboard },
    { label: "Attendance", href: `${basePath}/attendance`, icon: CalendarCheck },
    { label: "Fees", href: `${basePath}/fees`, icon: Wallet },
    { label: "Progress", href: `${basePath}/progress`, icon: Dumbbell, disabled: true },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-gray-200">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;

        if (tab.disabled) {
          return (
            <span
              key={tab.label}
              className="relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-gray-300 cursor-not-allowed select-none"
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400">
                Soon
              </span>
            </span>
          );
        }

        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? "text-emerald-700"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
