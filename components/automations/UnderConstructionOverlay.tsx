"use client";

import { HardHat, Wrench } from "lucide-react";

interface UnderConstructionOverlayProps {
  title?: string;
  message?: string;
}

/** Full-bleed blur overlay for a page that's visually built but not ready
 * to use yet. Sits on top of the real page (which stays blurred and
 * unclickable underneath) so it's obvious something is there, just not
 * live — swap this out once the page is ready to ship. */
export function UnderConstructionOverlay({
  title = "Under construction",
  message = "Will be live soon.",
}: UnderConstructionOverlayProps) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/40 backdrop-blur-md">
      <div className="mx-4 flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white px-8 py-8 text-center shadow-xl">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <HardHat className="h-7 w-7 text-amber-600" />
          <Wrench className="absolute -bottom-1 -right-1 h-5 w-5 rotate-12 text-gray-400" />
        </div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs leading-relaxed text-gray-500">{message}</p>
      </div>
    </div>
  );
}
