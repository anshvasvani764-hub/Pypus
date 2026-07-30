"use client";

import { Users, LogIn, UserMinus, Percent } from "lucide-react";

interface AttendanceSnapshotCardsProps {
  totalMembers: number;
  todayCheckIns: number;
  attendanceRatePercent: number;
  attendanceRateFraction: string;
  missingToday: number;
}

const CARDS = [
  {
    label: "Total Members",
    icon: Users,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
  {
    label: "Today's Check-ins",
    icon: LogIn,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
  {
    label: "Attendance Rate",
    icon: Percent,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
  {
    label: "Missing Today",
    icon: UserMinus,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
  },
];

export function AttendanceSnapshotCards({
  totalMembers,
  todayCheckIns,
  attendanceRatePercent,
  attendanceRateFraction,
  missingToday,
}: AttendanceSnapshotCardsProps) {
  const values = [
    { value: String(totalMembers) },
    { value: String(todayCheckIns) },
    {
      value: `${attendanceRatePercent}%`,
      context: attendanceRateFraction,
    },
    { value: String(missingToday) },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-5"
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${card.iconBg}`}
              >
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {values[i].value}
                  {values[i].context && (
                    <span className="ml-2 text-sm font-normal text-emerald-600">
                      {values[i].context}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}