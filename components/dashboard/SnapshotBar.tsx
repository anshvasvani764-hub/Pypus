"use client";

import { useState, useEffect, useRef } from "react";
import { TrendingUp } from "lucide-react";
import type { SnapshotStats } from "@/lib/dashboard/get-snapshot-stats";
import { createClient } from "@/lib/supabase/client";

export function SnapshotBar({ stats, workspaceId }: { stats: SnapshotStats; workspaceId: string }) {
  const [liveStats, setLiveStats] = useState<SnapshotStats>(stats);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function getTodayIst(): string {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    return istNow.toISOString().slice(0, 10);
  }

  async function refetchCheckInsCount() {
    const supabase = createClient();
    const today = getTodayIst();
    const { count, error } = await supabase
      .from("attendance")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("date", today)
      .eq("status", "present");

    if (error) {
      console.error("SnapshotBar count error:", error);
      return;
    }

    setLiveStats((prev) => ({
      ...prev,
      checkIns: { value: String(count ?? 0) },
    }));
  }

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`attendance-workspace-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          console.log("SnapshotBar realtime payload:", payload);
          refetchCheckInsCount();
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error("SnapshotBar subscription error:", err);
        }
        console.log("SnapshotBar subscription status:", status);
      });

    channelRef.current = channel;

    refetchCheckInsCount();

    intervalRef.current = setInterval(() => {
      refetchCheckInsCount();
    }, 10000);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [workspaceId]);

  const items = [
    { label: "Check-ins", value: liveStats.checkIns.value },
    { label: "New members this month", value: liveStats.newMembers.value, context: liveStats.newMembers.context },
    { label: "Dues to collect", value: liveStats.duesToCollect.value, context: liveStats.duesToCollect.context },
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
