import Link from "next/link";
import {
  Users,
  CreditCard,
  Clock,
  AlertTriangle,
  CalendarClock,
  UserX,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import type { HomeOverview, AttentionItem } from "@/lib/dashboard/get-home-overview";
import { formatISTDateTime } from "@/lib/utils/date";

function rupees(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatISTDateTime(iso);
}

const ATTENTION_STYLES: Record<
  AttentionItem["kind"],
  { label: string; icon: typeof AlertTriangle; classes: string; action: string }
> = {
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    classes: "bg-red-50 text-red-600",
    action: "Collect",
  },
  due_soon: {
    label: "Due soon",
    icon: CalendarClock,
    classes: "bg-amber-50 text-amber-600",
    action: "Remind",
  },
  no_plan: {
    label: "No plan",
    icon: UserX,
    classes: "bg-gray-100 text-gray-500",
    action: "Assign plan",
  },
  attendance_drop: {
    label: "Not showing up",
    icon: TrendingDown,
    classes: "bg-orange-50 text-orange-600",
    action: "View",
  },
};

export function HomeOverviewView({
  overview,
  workspaceSlug,
  workspaceName,
}: {
  overview: HomeOverview;
  workspaceSlug: string;
  workspaceName: string;
}) {
  const heroStats = [
    { label: "Active members", value: String(overview.activeMembers) },
    {
      label: "Present today",
      value: String(overview.presentToday),
      context: `${overview.presentTodayPct}%`,
    },
    { label: "Collected this month", value: rupees(overview.collectedThisMonth) },
    { label: "Pending dues", value: rupees(overview.pendingDues) },
  ];

  return (
    <div className="w-full max-w-6xl px-8 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{workspaceName}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Everything that needs your attention today, in one place.
        </p>
      </div>

      {/* 1 — Top snapshot strip */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {heroStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-200 bg-white px-5 py-4"
          >
            <p className="text-xs font-medium text-gray-500">{stat.label}</p>
            <p className="mt-1.5 text-2xl font-semibold text-gray-900">
              {stat.value}
              {stat.context && (
                <span className="ml-2 text-sm font-normal text-emerald-600">
                  {stat.context}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* 2 — Needs attention */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
          <h2 className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Needs attention
          </h2>
          <span className="text-xs text-gray-400">{overview.attention.length} items</span>
        </div>

        {overview.attention.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500">
            Nothing needs attention right now.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {overview.attention.slice(0, 8).map((item) => {
              const style = ATTENTION_STYLES[item.kind];
              const Icon = style.icon;
              const href =
                item.kind === "attendance_drop"
                  ? `/${workspaceSlug}/members/${item.memberId}/attendance`
                  : `/${workspaceSlug}/members/${item.memberId}/fees`;

              return (
                <li
                  key={`${item.kind}-${item.memberId}`}
                  className="flex items-center justify-between gap-4 px-6 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${style.classes}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.memberName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{item.detail}</p>
                    </div>
                  </div>
                  <Link
                    href={href}
                    className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {style.action}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 3 — Module-wise mini snapshots */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ModuleSnapshot
          title="Members"
          icon={Users}
          href={`/${workspaceSlug}/members`}
          linkLabel="View all members"
          rows={[
            { label: "Total active", value: String(overview.members.totalActive) },
            { label: "New this month", value: String(overview.members.newThisMonth) },
            ...overview.members.planBreakdown.slice(0, 3).map((p) => ({
              label: p.name,
              value: String(p.count),
              muted: true,
            })),
          ]}
        />

        <ModuleSnapshot
          title="Fees"
          icon={CreditCard}
          href={`/${workspaceSlug}/fees`}
          linkLabel="View fees"
          rows={[
            { label: "Collected this month", value: rupees(overview.fees.collectedThisMonth) },
            {
              label: `Pending (${overview.fees.pendingMembers} members)`,
              value: rupees(overview.fees.pendingAmount),
            },
            {
              label: `Overdue (${overview.fees.overdueMembers} members)`,
              value: rupees(overview.fees.overdueAmount),
            },
          ]}
        />

        <ModuleSnapshot
          title="Attendance"
          icon={Clock}
          href={`/${workspaceSlug}/attendance`}
          linkLabel="View attendance"
          rows={[
            {
              label: "Present today",
              value: `${overview.attendance.presentToday} (${overview.attendance.presentTodayPct}%)`,
            },
            { label: "This week average", value: `${overview.attendance.weekAvgPct}%` },
            {
              label: "Most consistent",
              value: overview.attendance.mostConsistent
                ? `${overview.attendance.mostConsistent.name} · ${overview.attendance.mostConsistent.days}d`
                : "—",
            },
          ]}
        />
      </div>

      {/* 4 — Recent activity */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Recent activity</h2>
          <span className="text-xs text-gray-400">{overview.activity.length} events</span>
        </div>
        {overview.activity.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {overview.activity.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 px-6 py-3 hover:bg-gray-50/50 transition-colors"
              >
                <span className="flex items-center gap-3 text-sm text-gray-700 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">{item.text}</span>
                </span>
                <span className="shrink-0 text-xs text-gray-400 font-medium">
                  {formatRelativeTime(item.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ModuleSnapshot({
  title,
  icon: Icon,
  href,
  linkLabel,
  rows,
}: {
  title: string;
  icon: typeof Users;
  href: string;
  linkLabel: string;
  rows: { label: string; value: string; muted?: boolean }[];
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <span className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>

      <dl className="mt-4 space-y-2 flex-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <dt className={`text-xs ${row.muted ? "text-gray-400" : "text-gray-500"}`}>
              {row.label}
            </dt>
            <dd
              className={`text-sm font-medium ${
                row.muted ? "text-gray-500" : "text-gray-900"
              }`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
      >
        {linkLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
