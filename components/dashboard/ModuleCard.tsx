import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  badge?: string;
  sideText?: string;
  href?: string;
  comingSoon?: boolean;
}

export function ModuleCard({
  title,
  description,
  icon: Icon,
  iconBg = "bg-gray-50",
  iconColor = "text-gray-400",
  badge,
  sideText,
  href,
  comingSoon,
}: ModuleCardProps) {
  const content = (
    <div
      className={`h-full rounded-2xl border bg-white p-6 transition-colors ${
        comingSoon
          ? "border-dashed border-gray-200"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        {!comingSoon && <ArrowUpRight className="h-4 w-4 text-gray-300" />}
      </div>

      <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>

      {(badge || sideText) && (
        <div className="mt-5 flex items-center justify-between">
          {badge && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              {badge}
            </span>
          )}
          {sideText && <span className="text-xs text-gray-400">{sideText}</span>}
        </div>
      )}
    </div>
  );

  if (comingSoon || !href) return content;
  return <Link href={href}>{content}</Link>;
}