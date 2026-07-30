"use client";

import { CreditCard, Clock, TrendingUp, Wallet } from "lucide-react";

interface FeesSnapshotCardsProps {
  activeSubscriptions: number;
  pendingCollection: number;
  upcomingRenewals: number;
  monthlyRevenue: number;
}

const CARDS = [
  {
    label: "Active Subscriptions",
    icon: CreditCard,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
  {
    label: "Pending Collection",
    icon: Wallet,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
  },
  {
    label: "Upcoming Renewals",
    icon: Clock,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
  {
    label: "Monthly Revenue",
    icon: TrendingUp,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function FeesSnapshotCards({
  activeSubscriptions,
  pendingCollection,
  upcomingRenewals,
  monthlyRevenue,
}: FeesSnapshotCardsProps) {
  const values = [
    { value: String(activeSubscriptions) },
    { value: formatCurrency(pendingCollection) },
    { value: String(upcomingRenewals) },
    { value: formatCurrency(monthlyRevenue), context: "this month" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card) => {
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
                  {values[CARDS.indexOf(card)].value}
                  {values[CARDS.indexOf(card)].context && (
                    <span className="ml-2 text-sm font-normal text-emerald-600">
                      {values[CARDS.indexOf(card)].context}
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