import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  href?: string;
  comingSoon?: boolean;
  badge?: string;
}

export function ModuleCard({
  title,
  description,
  icon: Icon,
  iconBg = "bg-emerald-50",
  iconColor = "text-emerald-600",
  href = "#",
  comingSoon = false,
  badge,
}: ModuleCardProps) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border border-gray-200 bg-white p-6 transition-all ${
        comingSoon
          ? "opacity-60 pointer-events-none"
          : "hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-50/50 active:scale-[0.98]"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBg} ${iconColor} transition-transform group-hover:scale-105`}>
          <Icon className="h-6 w-6" />
        </span>
        {badge && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 border border-gray-200 rounded-full px-2.5 py-1">
            {badge}
          </span>
        )}
      </div>

      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>

      {!comingSoon && (
        <div className="mt-4 flex items-center gap-1 text-sm font-medium text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Open</span>
          <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </Link>
  );
}
