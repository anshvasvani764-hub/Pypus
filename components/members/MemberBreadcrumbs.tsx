"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface MemberBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function MemberBreadcrumbs({ items }: MemberBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-gray-500">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-3 w-3 text-gray-300 shrink-0" />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-gray-900 transition-colors font-medium"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={isLast ? "text-gray-900 font-semibold" : "font-medium"}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
