import { TrendingUp } from "lucide-react";
import type { SnapshotStats } from "@/lib/dashboard/get-snapshot-stats";

export function SnapshotBar({ stats }: { stats: SnapshotStats }) {
  const items = [
    { label: "Check-ins", value: stats.checkIns.value },
    { label: "New members", value: stats.newMembers.value, context: stats.newMembers.context },
    { label: "Dues to collect", value: stats.duesToCollect.value, context: stats.duesToCollect.context },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          Today&apos;s snapshot
        </div>
        <span className="text-xs text-gray-400">Updated just now</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-gray-100">
        {items.map((item) => (
          <div key={item.label} className="px-6 py-5">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {item.value}
              {item.context && (
                <span className="ml-2 text-sm font-normal text-emerald-600">{item.context}</span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}